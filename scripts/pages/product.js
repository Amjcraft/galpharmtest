require(["modules/jquery-mozu", "underscore", "hyprlive", "modules/backbone-mozu", "modules/cart-monitor", "modules/soft-cart", "modules/models-product", "modules/views-productimages", "modules/jquery-dateinput-localized"], function ($, _, Hypr, Backbone, CartMonitor, SoftCart, ProductModels, ProductImageViews) {

    var ProductView = Backbone.MozuView.extend({
        templateName: 'modules/product/product-detail',
        autoUpdate: ['quantity'],
        additionalEvents: {
            "change [data-mz-product-option]": "onOptionChange",
            "blur [data-mz-product-option]": "onOptionChange"
        },
        render: function () {
            var me = this;
            Backbone.MozuView.prototype.render.apply(this);
            this.$('[data-mz-is-datepicker]').each(function (ix, dp) {
                $(dp).dateinput().css('color', Hypr.getThemeSetting('textColor')).on('change  blur', _.bind(me.onOptionChange, me));
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
            if (option) {
                if (option.get('attributeDetail').inputType === "YesNo") {
                    option.set("value", isPicked);
                } else if (isPicked) {
                    oldValue = option.get('value');
                    if (oldValue !== newValue && !(oldValue === undefined && newValue === '')) {
                        option.set('value', newValue);
                    }
                }
            }
        },
        addToCart: function () {            
            var iCanHaz = false,
                modelID = this.model.id,
                $controls = $(".mz-productdetail-conversion-controls"),
                $itemToAdd = $controls.find("." + modelID),
                maxQty =  parseInt($itemToAdd.attr("max"), 10),
                addedQty = parseInt($itemToAdd.val(), 10),
                totalQty = addedQty,
                err="<ul class='is-showing mz-errors'><li>Unfortunately you cannot add this item to your basket as some quantities and combinations of products are not available for purchase on this website in a single transaction and have been restricted. For further information please refer to the <a href='/regulatory-policy'>Regulatory Policy</a>.</li></ul>";
            
            var $relatedItems = $(".soft-cart-master-block .soft-cart-item ." + modelID);
            
            $relatedItems.each(function(){ 
                var $this = $(this);
                totalQty += parseInt($this.val(), 10);
            });

            // First check to make sure we don't go over the available quantity:
            iCanHaz = totalQty <= maxQty ? true : false;
            
            // If we didn't fail that let's check for conflicting active ingredients:
            if ( iCanHaz ){
                var $restrictedIngredient = $controls.find("[data-restricted-ingredient]"),
                    restrictedIngredient = "",
                    maxRestrictedItems = $restrictedIngredient.length;

                $restrictedIngredient.each(function(key, val){
                    restrictedIngredient += ".soft-cart-item [data-ingredient=" + $(this).data("restricted-ingredient") + "]";
                    if (key < maxRestrictedItems - 1) {
                        restrictedIngredient += ", ";
                    }
                });
                var $otherRestrictions = $(restrictedIngredient);
                
                if ( $otherRestrictions.length > 0 ) {
                    iCanHaz = false;
                    err="<ul class='is-showing mz-errors'><li>Unfortunately you cannot add this item to your basket as some quantities and combinations of products are not available for purchase on this website in a single transaction and have been restricted. For further information please refer to the <a href='/regulatory-policy'>Regulatory Policy</a>.</li></ul>";
                }
            }

            // If we didn't fail that... let's do the hard work
            if ( iCanHaz ) {
                var $unitQty = $controls.find("[data-unit-qty]"),
                    //$unitQty = $controls.find("[data-unit-qty]"),
                    $maxIngredient = $controls.find("[data-max-ingredient]"),
                    activeIngredient = "",
                    $activeIngredients = $controls.find("[data-ingredient]"),
                    maxActiveItems = $activeIngredients.length;

                //setup maxIngredients to not grab data initially but get the selector
                //Check the lenght of the selector and if it is greater than 1 do the bunch of crap below this
                if (maxActiveItems > 1) {
                    var maxIngredients = [],
                        unitQtys = [];
                    
                    $maxIngredient.each(function(){
                        maxIngredients.push($(this).data("max-ingredient")); 
                    });

                    // Overkill since there should only be one group qty for now but allows for more down the road
                    $unitQty.each(function(){
                        unitQtys.push(parseInt($(this).data("unit-qty"), 10));
                    });
                    
                    $activeIngredients.each(function(key, val){
                        var $items = $(".soft-cart-master-block .soft-cart-item [data-ingredient=" + $(this).data("ingredient") + "]"),
                            totalIngredient = unitQtys[0] ? addedQty * unitQtys[0] : addedQty;
                        
                        if (maxIngredients[0] === "No-Other-SKU") {

                            iCanHaz = $(".soft-cart-master-block .soft-cart-item:not(." + modelID + ")").length > 0 ? false : true;

                            //err="<ul class='is-showing mz-errors'><li>This product can't be purchased with any other products.</li></ul>";

                        } else if (maxIngredients[0] === "Not-Applicable") {
                            //This is unneccessary to a degree but we want to make sure there is a catch for not applicable
                            iCanHaz = true;

                        } else {
                            // REDUNDANT WITH ELSE BELOW FOR SINGLE ACTIVE INGREDIENTS... Will want to combine and reorganize down the road
                            $items.each(function(){
                                var $this = $(this),
                                    $qty = $this.siblings("[data-unit-qty]"),
                                    value = parseInt($this.siblings("[value]").val(), 10);

                                if ($qty.length > 0){
                                    value *= parseInt($qty.data("unit-qty"), 10);
                                }

                                totalIngredient += value;
                            });

                            iCanHaz = totalIngredient <= parseInt(maxIngredients[0],10) ? true : false;
                            
                            //err="<ul class='is-showing mz-errors'><li>You have exceeded the maximum quantity of active ingredients in your shopping cart.</li></ul>";
                        } 
                        if (!iCanHaz) { return false; }
                        //if maxIngredient[key] unitQtys[key] might be needed down the road but using [0] for now since there is only one instance of each
                    });
                } else {
                    var maxIngredient = $maxIngredient.data("max-ingredient");
                    var unitQty = parseInt($unitQty.data("unit-qty"), 10);
                    var totalIngredient = unitQty ? addedQty * parseInt(unitQty, 10) : addedQty;
                    
                    if (maxIngredient === "No-Other-SKU") {
                        
                        iCanHaz = $(".soft-cart-master-block .soft-cart-item:not(." + modelID + ")").length > 0 ? false : true;

                        //err="<ul class='is-showing mz-errors'><li>This product can't be purchased with any other products.</li></ul>";

                    } else if (maxIngredient === "Not-Applicable") {
                        //This is unneccessary to a degree but we want to make sure there is a catch for not applicable
                        iCanHaz = true;
                    } else {
                        $(".soft-cart-master-block .soft-cart-item [data-ingredient=" + $activeIngredients.data("ingredient") + "]").each(function(){
                            var $this = $(this),
                                $qty = $this.siblings("[data-unit-qty]"),
                                value = parseInt($this.siblings("[value]").val(), 10);
                            
                            if ($qty.length > 0){
                                value *= $qty.data("unit-qty");
                            }
                            totalIngredient += value;
                        });

                        iCanHaz = totalIngredient <= parseInt(maxIngredient, 10) ? true : false;

                        //err="<ul class='is-showing mz-errors'><li>You have exceeded the maximum quantity of active ingredients in your shopping cart.</li></ul>";
                                                                     
                    }
                }
            }

            // Let's either add this or say too bad with an error
            if (iCanHaz) {
                this.model.addToCart();
            } else {
                $('.mz-productdetail-wrap').find('[data-mz-message-bar]').html(err);
            }

        },
        addToWishlist: function () {
            this.model.addToWishlist();
        },
        checkLocalStores: function (e) {
            var me = this;
            e.preventDefault();
            this.model.whenReady(function () {
                var $localStoresForm = $(e.currentTarget).parents('[data-mz-localstoresform]'),
                    $input = $localStoresForm.find('[data-mz-localstoresform-input]');
                if ($input.length > 0) {
                    $input.val(JSON.stringify(me.model.toJSON()));
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

    $(document).ready(function () {
        var product = ProductModels.Product.fromCurrent();
        product.on('addedtocart', function (cartitem) {
            if (cartitem && cartitem.prop('id')) {
                //product.isLoading(true); Removed since no longer redirecting
                CartMonitor.addToCount(product.get('quantity'));
                SoftCart.update().then(SoftCart.show).then(function() {
                    SoftCart.highlightItem(cartitem.prop('id'));
                });
            } else {
                product.trigger("error", { message: Hypr.getLabel('unexpectedError') });
            }
        });

        product.on('addedtowishlist', function (cartitem) {
            $('#add-to-wishlist').prop('disabled', 'disabled').text(Hypr.getLabel('addedToWishlist'));
        });

        var productView = new ProductView({
            el: $('#product-detail'),
            model: product,
            messagesEl: $('[data-mz-message-bar]')
        });

        var productImagesView = new ProductImageViews.ProductPageImagesView({
            el: $('[data-mz-productimages]'),
            model: product
        });

        window.productView = productView;

        productView.render();

        $("dl.tabs dt:first").addClass("selected");          
        $("dl.tabs dd:first").addClass("selected");       
        $("dl.tabs dt").click(function(){
            $(this)
            .siblings().removeClass("selected").end()
            .next("dd").andSelf().addClass("selected");
        });         


    });

});



