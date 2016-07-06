/*jshint scripturl:true*/
define(["modules/jquery-mozu", "shim!vendor/underscore>_", "modules/backbone-mozu", "hyprlive", "modules/models-product", "modules/views-productimages", "modules/jquery-dateinput-localized"], function ($, _, Backbone, Hypr, ProductModels, ProductImageViews) {
	var $container, $enabled, $btnWidth, $btnHeight, $btnBGColor, $btnFGColor, $btnText;
	var QuickViewWindowView = Backbone.MozuView.extend({
		templateName: 'modules/quick-view/quick-view-window',
		autoUpdate: ['quantity'],
        additionalEvents: {
            "change [data-mz-product-option]": "onOptionChange",
            "blur [data-mz-product-option]": "onOptionChange",
            'click [data-bl-action="addToCart"]': "addToCart",
            'click [data-bl-action="checkLocalStores"]': "checkLocalStores",
            'click [data-bl-action="addToWishlist"]': "addToWishlist"
        },
        render: function () {
            var me = this;
            Backbone.MozuView.prototype.render.apply(this);
            this.$('[data-mz-is-datepicker]').each(function (ix, dp) {
                $(dp).dateinput().css('color', Hypr.getThemeSetting('textColor')).on('change  blur', _.bind(me.onOptionChange, me));
            });

            this.model.on('addedtocart', function(){
        		closeRatcWindow();
        	});
        	 var productImagesView = new QuickViewWindowImagesView({
	            el: $('[data-bl-productimages]'),
	            model: this.model
	        });
        },
        onOptionChange: function (e) {
            return this.configure($(e.currentTarget));
        },
        configure: function ($optionEl) {
            var newValue = $optionEl.val(),
                oldValue,
                id = $optionEl.data('mz-product-option'),
                optionEl = $optionEl[0],
                isPicked = (optionEl.type !== "checkbox" && optionEl.type !== "radio") || optionEl.checked,
                option = this.model.get('options').get(id);
            if (option && isPicked) {
                oldValue = option.get('value');
                if (oldValue !== newValue && !(oldValue === undefined && newValue === '')) {
                    option.set('value', newValue);
                }
            }
        },
        addToCart: function () {
        	var me = this;
            me.model.addToCart();
        },
        addToWishlist: function () {
            var me = this;
            me.model.addToWishlist();
        },
        checkLocalStores: function (e) {
            var me = this;
            e.preventDefault();
            me.model.whenReady(function () {
                var $localStoresForm = $(e.currentTarget).parents('[data-mz-localstoresform]'),
                    $input = $localStoresForm.find('[data-mz-localstoresform-input]');
                if ($input.length > 0) {
                    $input.val(JSON.stringify(me.model.toJSON({helpers:true})));
                    $localStoresForm[0].submit();
                }
            });

        },
        initialize: function () {
            // handle preset selects, etc
            var me = this;
            this.$('[data-mz-product-option]').each(function () {
                var $this = $(this), isChecked, wasChecked;
                if ($this.val()) {
                    switch ($this.attr('type')) {
                        case "checkbox":
                        case "radio":
                            isChecked = $this.prop('checked');
                            wasChecked = !!$this.attr('checked');
                            if ((isChecked && !wasChecked) || (wasChecked && !isChecked)) {
                                me.configure($this);
                            }
                            break;
                        default:
                            me.configure($this);
                    }
                }
            });
        }
	});


	var QuickViewWindowImagesView = Backbone.MozuView.extend({
        templateName: 'modules/quick-view/quick-view-product-images',
        additionalEvents: {
            'click [data-bl-productimage-thumb]': 'switchImage'
        },
        initialize: function () {
            // preload images
            var imageCache = this.imageCache = {};
            _.each(this.model.get('content').get('productImages'), function (img) {
                var i = new Image();
                i.src = img.imageUrl + "?max=" + Hypr.getThemeSetting('productImagesContainerWidth');
                imageCache[img.sequence.toString()] = i;
            });
        },
        switchImage: function (e) {
            var $thumb = $(e.currentTarget);
            this.selectedImageIx = $thumb.data('bl-productimage-thumb');
            this.updateMainImage();
            return false;
        },
        updateMainImage: function () {
            if (this.imageCache[this.selectedImageIx]) {
                this.$('[data-bl-productimage-main]').prop('src', this.imageCache[this.selectedImageIx].src);
            }
        },
        render: function () {
            Backbone.MozuView.prototype.render.apply(this, arguments);
            this.updateMainImage();
        }
    });


	var ratcWindowView= null;
	function openRatcWindow(){
		var pCode = $(this).data('bl-product');


		if(ratcWindowView === null){
			var product = new ProductModels.Product({productCode: pCode});

			product.fetch().then(function(){
				ratcWindowView = new QuickViewWindowView({
		            el: $('.bl-quick-view-lightbox-content-inner'),
		            model: product
		        });
				ratcWindowView.render();
				$('.bl-quick-view-lightbox').addClass('bl-quick-view-lightbox-active');
			});

		}else{
			ratcWindowView.model.set('productCode',pCode );
			ratcWindowView.model.fetch().then(function(){
				//We have to manually overwrite the URL attribute as it's only set on initialization
				var slug = ratcWindowView.model.get('content').get('seoFriendlyUrl');
            	ratcWindowView.model.set({ url: slug ? "/"+ slug + "/p/"+ ratcWindowView.model.get("productCode") :  "/p/" + ratcWindowView.model.get("productCode") });

				ratcWindowView.render();
				$('.bl-quick-view-lightbox').addClass('bl-quick-view-lightbox-active');
			});
		}

		//Position the window
		var vp = $(window).height();
		var scroll = $(window).scrollTop();
		var topPos =  scroll + (vp*0.2);
		$('.bl-quick-view-lightbox-content').css('top', topPos + 'px');
	}

	function closeRatcWindow(){
		$('.bl-quick-view-lightbox').removeClass('bl-quick-view-lightbox-active');
	}

	function addQuickViewButtons(){
		$('div[data-mz-product]').each(function(){
			var $this = $(this);
			var pCode = $this.data('mz-product');
			var imgAnchor = $this.find('.mz-productlisting-image a');
			var imgDiv = $this.find('.mz-productlisting-image');
			var img = imgAnchor.find('img');

			imgDiv.css('position','relative');


			var imgPos = img.position();
			var imgW = img.width();
			var imgH = img.height();

			var btnW = 110;
			var btnH = 50;

			var topPos =  Math.floor(imgPos.top + imgH - 20 - $btnHeight);
			var leftPos = Math.floor((imgW-$btnWidth)/2 + imgPos.left);


			var ratcLink = $('<button/>').
				addClass('bl-quick-view-button').
				addClass('mz-btn').
				attr({
					href : 'javascript:void(0)',
					'data-bl-product' : pCode,
					'data-bl-action': 'open-quick-view'
				}).
				text($btnText).
				css({
			    	top : topPos + 'px',
			    	left : leftPos + 'px'

				});

			imgAnchor.after(ratcLink);

			imgDiv.on('mouseover', function(){
				$(this).addClass('bl-ratc-over');
			});
			imgDiv.on('mouseout', function(){
				$(this).removeClass('bl-ratc-over');
			});
		});



		$('[data-bl-action="open-quick-view"]').on('click', openRatcWindow);

	}
	function addStyles(){
		//Add a style tag to the head to override button styles with the values from the settings
		var styleText = "";
		styleText += "button.bl-quick-view-button{";

		if($btnBGColor !== undefined && $btnBGColor !== null && $btnBGColor !== ''){
			styleText += "	background-color: " + $btnBGColor + ";";
			var borderColor = shadeRGBColor($btnBGColor, - 0.25);//Darken background color by 25%
			styleText += "	border-color: " + borderColor + ";";
		}
		if($btnFGColor !== undefined && $btnFGColor !== null && $btnFGColor !== ''){
			styleText += "	color: " + $btnFGColor + ";";
		}
		if($btnWidth !== undefined && $btnWidth !== null && !isNaN($btnWidth)){
			styleText += "	width: " + $btnWidth + "px;";
		}
		if($btnHeight !== undefined && $btnHeight !== null && !isNaN($btnHeight)){
			styleText += "	height: " + $btnHeight + "px;";
		}

		styleText += "}";


		$('<style />').text(styleText).appendTo('head');
	}
	function init(){
		//We have to wait until the Mozu script finishes running and adds the facetingViews variable to the document
		if(typeof window.facetingViews == 'undefined'){
			setTimeout(init, 1000);
			return;
		}
		window.facetingViews.productList.model.on('change',function(){
			addQuickViewButtons();
		});
		addQuickViewButtons();
		$('[data-bl-action="iz-close-lb"]').on('click', function(){
			closeRatcWindow();
		});

		addStyles();

	}

	function shadeRGBColor(color, percent) {
		var count = color.indexOf('rgba') === 0 ? 5 : 4;
	    var f=color.split(","),t=percent<0?0:255,p=percent<0?percent*-1:percent,R=parseInt(f[0].slice(count),10),G=parseInt(f[1],10),B=parseInt(f[2],10);
	    return "rgb("+(Math.round((t-R)*p)+R)+","+(Math.round((t-G)*p)+G)+","+(Math.round((t-B)*p)+B)+")";
	}

	$(document).ready(function(){

		$enabled = Hypr.getThemeSetting('qvEnabled');
		$btnWidth = Hypr.getThemeSetting('qvButtonWidth');
		$btnHeight = Hypr.getThemeSetting('qvButtonHeight');
		$btnBGColor = Hypr.getThemeSetting('qvButtonBGColor');
		$btnFGColor = Hypr.getThemeSetting('qvButtonFGColor');
		$btnText = Hypr.getThemeSetting('qvButtonText');

		if($enabled === true){
			init();
		}
	});
});





