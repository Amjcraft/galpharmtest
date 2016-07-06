
define('modules/models-cart',['underscore', 'modules/backbone-mozu', 'hyprlive', "modules/api"], function (_, Backbone, Hypr, api) {

    var CartItemProduct = Backbone.MozuModel.extend({
        helpers: ['mainImage'],
        mainImage: function() {
            var imgs = this.get("productImages"),
                img = imgs && imgs[0],
                imgurl = 'http://placehold.it/160&text=' + Hypr.getLabel('noImages');
            return img || { ImageUrl: imgurl, imageUrl: imgurl }; // to support case insensitivity
        },
        initialize: function() {
            var url = "/product/" + this.get("productCode");
            this.set({ Url: url, url: url });
        }
    }),

    CartItem = Backbone.MozuModel.extend({
        relations: {
            product: CartItemProduct
        },
        validation: {
            quantity: {
                min: 1
            }
        },
        dataTypes: {
            quantity: Backbone.MozuModel.DataTypes.Int
        },
        mozuType: 'cartitem',
        handlesMessages: true,
        helpers: ['priceIsModified'],
        priceIsModified: function() {
            var price = this.get('unitPrice');
            return price.baseAmount != price.discountedAmount;
        },
        saveQuantity: function() {
            if (this.hasChanged("quantity")) this.apiUpdateQuantity(this.get("quantity"));
        }
    }),

    Cart = Backbone.MozuModel.extend({
        mozuType: 'cart',
        handlesMessages: true,
        helpers: ['isEmpty','count'],
        relations: {
            items: Backbone.Collection.extend({
                model: CartItem
            })
        },
        
        initialize: function() {
            this.get("items").on('sync remove', this.fetch, this)
                             .on('loadingchange', this.isLoading, this);
        },
        isEmpty: function() {
            return this.get("items").length < 1;
        },
        count: function() {
            return this.apiModel.count();
            //return this.get("Items").reduce(function(total, item) { return item.get('Quantity') + total; },0);
        },
        toOrder: function() {
            var me = this;
            me.apiCheckout().then(function(order) {
                me.trigger('ordercreated', order);
            });
        },
        removeItem: function (id) {
            return this.get('items').get(id).apiModel.del();
        },
        addCoupon: function () {
            var me = this;
            var code = this.get('couponCode');
            var orderDiscounts = me.get('orderDiscounts');
            if (orderDiscounts && _.findWhere(orderDiscounts, { couponCode: code })) {
                // to maintain promise api
                var deferred = api.defer();
                deferred.reject();
                deferred.promise.otherwise(function () {
                    me.trigger('error', {
                        message: Hypr.getLabel('promoCodeAlreadyUsed', code)
                    });
                });
                return deferred.promise;
            }
            this.isLoading(true);
            return this.apiAddCoupon(this.get('couponCode')).then(function () {
                me.set('couponCode', '');
                var productDiscounts = _.flatten(_.pluck(_.pluck(me.get('items').models, 'attributes'), 'productDiscounts'));
                var shippingDiscounts = _.flatten(_.pluck(_.pluck(me.get('items').models, 'attributes'), 'shippingDiscounts'));

                var allDiscounts = me.get('orderDiscounts').concat(productDiscounts).concat(shippingDiscounts);
                var allCodes = me.get('couponCodes') || [];
                var lowerCode = code.toLowerCase();

                var couponExists = _.find(allCodes, function(couponCode) {
                    return couponCode.toLowerCase() === lowerCode;
                });
                if (!couponExists) {
                    me.trigger('error', {
                        message: Hypr.getLabel('promoCodeError', code)
                    });
                }

                var couponIsNotApplied = (!allDiscounts || !_.find(allDiscounts, function(d) {
                    return d.couponCode.toLowerCase() === lowerCode;
                }));
                me.set('tentativeCoupon', couponExists && couponIsNotApplied ? code : undefined);

                me.isLoading(false);
            });
        }
    });

    return {
        CartItem: CartItem,
        Cart: Cart
    };
});
define('modules/soft-cart',[
    'modules/jquery-mozu',
    "underscore",
    "hyprlive",
    'modules/backbone-mozu',
    'modules/models-cart',
    'modules/cart-monitor',
    "modules/models-product"
],
    function($, _, Hypr, Backbone, CartModels, CartMonitor, ProductModels) {

    // declare a MozuView that can rewrite its contents with a Hypr template
    var SoftCartView = Backbone.MozuView.extend({
        templateName: "modules/soft-cart",
        goToCart: function() {
            window.location = "/cart";
            return false;
        },
        changeQuantity: function(e, amt) {
            var $qField = $(e.currentTarget),
                id = $qField.data('mz-cart-item'),
                item = this.model.get("items").get(id);
            item.set('quantity', item.get('quantity') + amt);
            return item.saveQuantity();
        },
        increaseQuantity: function(e) {
            return this.changeQuantity(e, 1);
        },
        decreaseQuantity: function(e) {
            return this.changeQuantity(e, -1);
        },
        removeItem: function(e) {
            var $removeButton = $(e.currentTarget),
                id = $removeButton.data('mz-cart-item');
            this.model.removeItem(id);
            return false;
        }
    });

    // accessors for other modules
    var SoftCartInstance = {

        update: function() {
            // populate the cart model asynchronously from the api
            return this.model.apiGet();
        },

        show: function() {

            this.view.$el.find(".soft-cart-wrap").addClass('is-active');

            var self = this;
            // dismisser method so that a click away will hide the softcart
            /*var clickAway = function(e) {
                if (self.view.el !== e.target && !$.contains(self.view.el, e.target)) {
                    self.view.$el.find(".soft-cart-wrap").removeClass('is-active');
                    $(document.body).off('click', clickAway);
                }
            };

            $(document.body).on('click', clickAway);*/
        },

        highlightItem: function(itemid) {
            this.view.$('.soft-cart-item[data-mz-cart-item="' + itemid + '"]').removeClass('highlight').addClass('highlight');
        }
    };



    $(document).ready(function() {

        // create a blank cart model
        SoftCartInstance.model = new CartModels.Cart();
        // instantiate your view!
        SoftCartInstance.view = new SoftCartView({
            el: $('[data-mz-role="soft-cart"]'),
            model: SoftCartInstance.model
        });
        // bind a method we'll be using for the promise
        SoftCartInstance.show = $.proxy(SoftCartInstance.show, SoftCartInstance);

        var updatedOnce = false;

        // bind cart links to open the softcart instead
        $(".soft-cart-master-block").mouseenter(function(e) {
            e.preventDefault();
            if (!updatedOnce) {
                updatedOnce = true;
                SoftCartInstance.update().then(SoftCartInstance.show);
            }
        }).mouseleave(function() {
            $(".soft-cart-wrap").removeClass('is-active');
        });

        CartMonitor.$el = $('[data-mz-role="cartmonitor"]');
        SoftCartInstance.update();
        CartMonitor.update();

        var api   = require('modules/api');
        var user  = require.mozuData('user');

        api
        .get('customer', {
            id: user.accountId
        })
        .then(function(response) {
            $.each(response.data.attributes, function(key, val) {
                if (val.fullyQualifiedName === "tenant~segments" || val.fullyQualifiedName === "Tenant~segments"){
                    $(".mz-pricestack").each(function(){
                         var $stack = $(this),
                             $price = $stack.find(".mz-price:not(.is-saleprice)"),
                             $salePrice = $stack.find(".is-saleprice"),
                             $memberPrice = $stack.find("[data-member-price]"),
                             $memberSale = $stack.find("[data-member-sale-price]");


                        if ($memberPrice.length > 0) {

                            $price.text($memberPrice.data("member-price"));

                            if ($salePrice.length > 0){

                                if ($memberSale.length > 0) {
                                    $salePrice.text($memberSale.data("member-sale-price"));
                                } else {
                                    $salePrice.remove();
                                    $price.attr("itemprop", "price").removeClass("is-crossedout");
                                }

                            } else {
                                if ($memberSale.length > 0) {
                                    $price.addClass("is-crossedout").attr("itemprop", "");
                                    $stack.append('<span class="mz-price is-saleprice" itemprop="price">' + $memberSale.data("member-sale-price") + '</span>');
                                }
                            }
                        }
                    });
                }
            });
        });


    });
	window.SoftCartInstance = SoftCartInstance;
    // export the singleton
    return SoftCartInstance;

});
define('modules/views-productimages',['modules/jquery-mozu', 'underscore', "modules/backbone-mozu", 'hyprlive'], function ($, _, Backbone, Hypr) {

    var ProductPageImagesView = Backbone.MozuView.extend({
        templateName: 'modules/product/product-images',
        events: {
            'click [data-mz-productimage-thumb]': 'switchImage'
        },
        initialize: function () {
            // preload images
            var imageCache = this.imageCache = {},
                cacheKey = Hypr.engine.options.locals.siteContext.generalSettings.cdnCacheBustKey;
            _.each(this.model.get('content').get('productImages'), function (img) {
                var i = new Image();
                i.src = img.imageUrl + '?max=' + Hypr.getThemeSetting('productImagesContainerWidth') + '&_mzCb=' + cacheKey;
                if (img.altText) {
                    i.alt = img.altText;
                }
                imageCache[img.sequence.toString()] = i;
            });
        },
        switchImage: function (e) {
            var $thumb = $(e.currentTarget);
            this.selectedImageIx = $thumb.data('mz-productimage-thumb');
            this.updateMainImage();
            return false;
        },
        updateMainImage: function () {
            if (this.imageCache[this.selectedImageIx]) {
                this.$('[data-mz-productimage-main]')
                    .prop('src', this.imageCache[this.selectedImageIx].src)
                    .prop('alt', this.imageCache[this.selectedImageIx].alt);
            }
        },
        render: function () {
            Backbone.MozuView.prototype.render.apply(this, arguments);
            this.updateMainImage();
        }
    });


    return {
        ProductPageImagesView: ProductPageImagesView
    };

});
define('shim!vendor/jquery.tools.dateinput[jquery=jQuery]>jQuery',['jquery'], function(jQuery) { 

/**
 * @license                                     
 * jQuery Tools @VERSION Dateinput - <input type="date" /> for humans
 * 
 * NO COPYRIGHTS OR LICENSES. DO WHAT YOU LIKE.
 * 
 * http://flowplayer.org/tools/form/dateinput/
 *
 * Since: Mar 2010
 * Date: @DATE 
 */
(function ($, undefined) {

    /* TODO: 
		 preserve today highlighted
	*/

    $.tools = $.tools || { version: '@VERSION' };

    var instances = [],
		formatters = {},
		 tool,

		 // h=72, j=74, k=75, l=76, down=40, left=37, up=38, right=39
		 KEYS = [75, 76, 38, 39, 74, 72, 40, 37],
		 LABELS = {};

    tool = $.tools.dateinput = {

        conf: {
            format: 'mm/dd/yy',
            formatter: 'default',
            selectors: false,
            yearRange: [-5, 5],
            lang: 'en',
            offset: [0, 0],
            speed: 0,
            firstDay: 0, // The first day of the week, Sun = 0, Mon = 1, ...
            min: undefined,
            max: undefined,
            trigger: 0,
            toggle: 0,
            editable: 0,

            css: {

                prefix: 'cal',
                input: 'date',

                // ids
                root: 0,
                head: 0,
                title: 0,
                prev: 0,
                next: 0,
                month: 0,
                year: 0,
                days: 0,

                body: 0,
                weeks: 0,
                today: 0,
                current: 0,

                // classnames
                week: 0,
                off: 0,
                sunday: 0,
                focus: 0,
                disabled: 0,
                trigger: 0
            }
        },

        addFormatter: function (name, fn) {
            formatters[name] = fn;
        },

        localize: function (language, labels) {
            $.each(labels, function (key, val) {
                labels[key] = val.split(",");
            });
            LABELS[language] = labels;
        }

    };

    tool.localize("en", {
        months: 'January,February,March,April,May,June,July,August,September,October,November,December',
        shortMonths: 'Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec',
        days: 'Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday',
        shortDays: 'Sun,Mon,Tue,Wed,Thu,Fri,Sat'
    });


    //{{{ private functions


    // @return amount of days in certain month
    function dayAm(year, month) {
        return new Date(year, month + 1, 0).getDate();
    }

    function zeropad(val, len) {
        val = '' + val;
        len = len || 2;
        while (val.length < len) { val = "0" + val; }
        return val;
    }

    // thanks: http://stevenlevithan.com/assets/misc/date.format.js 
    var tmpTag = $("<a/>");

    function format(formatter, date, text, lang) {
        var d = date.getDate(),
              D = date.getDay(),
              m = date.getMonth(),
              y = date.getFullYear(),

              flags = {
                  d: d,
                  dd: zeropad(d),
                  ddd: LABELS[lang].shortDays[D],
                  dddd: LABELS[lang].days[D],
                  m: m + 1,
                  mm: zeropad(m + 1),
                  mmm: LABELS[lang].shortMonths[m],
                  mmmm: LABELS[lang].months[m],
                  yy: String(y).slice(2),
                  yyyy: y
              };

        var ret = formatters[formatter](text, date, flags, lang);

        // a small trick to handle special characters
        return tmpTag.html(ret).html();

    }

    tool.addFormatter('default', function (text, date, flags, lang) {
        return text.replace(/d{1,4}|m{1,4}|yy(?:yy)?|"[^"]*"|'[^']*'/g, function ($0) {
            return $0 in flags ? flags[$0] : $0;
        });
    });

    tool.addFormatter('prefixed', function (text, date, flags, lang) {
        return text.replace(/%(d{1,4}|m{1,4}|yy(?:yy)?|"[^"]*"|'[^']*')/g, function ($0, $1) {
            return $1 in flags ? flags[$1] : $0;
        });
    });

    function integer(val) {
        return parseInt(val, 10);
    }

    function isSameDay(d1, d2) {
        return d1.getFullYear() === d2.getFullYear() &&
			d1.getMonth() == d2.getMonth() &&
			d1.getDate() == d2.getDate();
    }

    function parseDate(val) {

        if (val === undefined) { return; }
        if (val.constructor == Date) { return val; }

        if (typeof val == 'string') {

            // rfc3339?
            var els = val.split("-");
            if (els.length == 3) {
                return new Date(integer(els[0]), integer(els[1]) - 1, integer(els[2]));
            }

            // invalid offset
            if (!(/^-?\d+$/).test(val)) { return; }

            // convert to integer
            val = integer(val);
        }

        var date = new Date;
        date.setDate(date.getDate() + val);
        return date;
    }

    //}}}


    function Dateinput(input, conf) {

        // variables
        var self = this,
			 now = new Date,
			 yearNow = now.getFullYear(),
			 css = conf.css,
			 labels = LABELS[conf.lang],
			 root = $("#" + css.root),
			 title = root.find("#" + css.title),
			 trigger,
			 pm, nm,
			 currYear, currMonth, currDay,
			 value = input.attr("data-value") || conf.value || input.val(),
			 min = input.attr("min") || conf.min,
			 max = input.attr("max") || conf.max,
			 opened,
			 original;

        // zero min is not undefined 	 
        if (min === 0) { min = "0"; }

        // use sane values for value, min & max		
        value = parseDate(value) || now;

        min = parseDate(min || new Date(yearNow + conf.yearRange[0], 1, 1));
        max = parseDate(max || new Date(yearNow + conf.yearRange[1] + 1, 1, -1));


        // check that language exists
        if (!labels) { throw "Dateinput: invalid language: " + conf.lang; }

        // Replace built-in date input: NOTE: input.attr("type", "text") throws exception by the browser
        if (input.attr("type") == 'date') {
            var original = input.clone(),
          def = original.wrap("<div/>").parent().html(),
          clone = $(def.replace(/type/i, "type=text data-orig-type"));

            if (conf.value) clone.val(conf.value);   // jquery 1.6.2 val(undefined) will clear val()

            input.replaceWith(clone);
            input = clone;
        }

        input.addClass(css.input);

        var fire = input.add(self);

        // construct layout
        if (!root.length) {

            // root
            root = $('<div><div><a/><div/><a/></div><div><div/><div/></div></div>')
				.hide().css({ position: 'absolute' }).attr("id", css.root);

            // elements
            root.children()
				.eq(0).attr("id", css.head).end()
				.eq(1).attr("id", css.body).children()
					.eq(0).attr("id", css.days).end()
					.eq(1).attr("id", css.weeks).end().end().end()
				.find("a").eq(0).attr("id", css.prev).end().eq(1).attr("id", css.next);

            // title
            title = root.find("#" + css.head).find("div").attr("id", css.title);

            // year & month selectors
            if (conf.selectors) {
                var monthSelector = $("<select/>").attr("id", css.month),
					 yearSelector = $("<select/>").attr("id", css.year);
                title.html(monthSelector.add(yearSelector));
            }

            // day titles
            var days = root.find("#" + css.days);

            // days of the week
            for (var d = 0; d < 7; d++) {
                days.append($("<span/>").text(labels.shortDays[(d + conf.firstDay) % 7]));
            }

            $("body").append(root);
        }


        // trigger icon
        if (conf.trigger) {
            trigger = $("<a/>").attr("href", "#").addClass(css.trigger).click(function (e) {
                conf.toggle ? self.toggle() : self.show();
                return e.preventDefault();
            }).insertAfter(input);
        }


        // layout elements
        var weeks = root.find("#" + css.weeks);
        yearSelector = root.find("#" + css.year);
        monthSelector = root.find("#" + css.month);


        //{{{ pick

        function select(date, conf, e) {

            // current value
            value = date;
            currYear = date.getFullYear();
            currMonth = date.getMonth();
            currDay = date.getDate();

            e || (e = $.Event("api"));

            // focus the input after selection (doesn't work in IE)
            if (e.type == "click" && $.support.changeBubbles) {
                input.focus();
            }

            // beforeChange
            e.type = "beforeChange";

            fire.trigger(e, [date]);
            if (e.isDefaultPrevented()) { return; }

            // formatting			
            input.val(format(conf.formatter, date, conf.format, conf.lang));

            // change
            e.type = "change";
            fire.trigger(e);

            // store value into input
            input.data("date", date);

            self.hide(e);
        }
        //}}}


        //{{{ onShow

        function onShow(ev) {

            ev.type = "onShow";
            fire.trigger(ev);

            $(document).on("keydown.d", function (e) {

                if (e.ctrlKey) { return true; }
                var key = e.keyCode;

                // backspace or delete clears the value
                if (key == 8 || key == 46) {
                    input.val("");
                    return self.hide(e);
                }

                // esc or tab key exits
                if (key == 27 || key == 9) { return self.hide(e); }

                if ($(KEYS).index(key) >= 0) {

                    if (!opened) {
                        self.show(e);
                        return e.preventDefault();
                    }

                    var days = $("#" + css.weeks + " a"),
						 el = $("." + css.focus),
						 index = days.index(el);

                    el.removeClass(css.focus);

                    if (key == 74 || key == 40) { index += 7; }
                    else if (key == 75 || key == 38) { index -= 7; }
                    else if (key == 76 || key == 39) { index += 1; }
                    else if (key == 72 || key == 37) { index -= 1; }


                    if (index > 41) {
                        self.addMonth();
                        el = $("#" + css.weeks + " a:eq(" + (index - 42) + ")");
                    } else if (index < 0) {
                        self.addMonth(-1);
                        el = $("#" + css.weeks + " a:eq(" + (index + 42) + ")");
                    } else {
                        el = days.eq(index);
                    }

                    el.addClass(css.focus);
                    return e.preventDefault();

                }

                // pageUp / pageDown
                if (key == 34) { return self.addMonth(); }
                if (key == 33) { return self.addMonth(-1); }

                // home
                if (key == 36) { return self.today(); }

                // enter
                if (key == 13) {
                    if (!$(e.target).is("select")) {
                        $("." + css.focus).click();
                    }
                }

                return $([16, 17, 18, 9]).index(key) >= 0;
            });


            // click outside dateinput
            $(document).on("click.d", function (e) {
                var el = e.target;

                if (!$(el).parents("#" + css.root).length && el != input[0] && (!trigger || el != trigger[0])) {
                    self.hide(e);
                }

            });
        }
        //}}}


        $.extend(self, {


            /**
			*   @public
			*   Show the calendar
			*/
            show: function (e) {

                if (input.attr("readonly") || input.attr("disabled") || opened) { return; }

                // onBeforeShow
                e = e || $.Event();
                e.type = "onBeforeShow";
                fire.trigger(e);
                if (e.isDefaultPrevented()) { return; }

                $.each(instances, function () {
                    this.hide();
                });

                opened = true;

                // month selector
                monthSelector.off("change").change(function () {
                    self.setValue(integer(yearSelector.val()), integer($(this).val()));
                });

                // year selector
                yearSelector.off("change").change(function () {
                    self.setValue(integer($(this).val()), integer(monthSelector.val()));
                });

                // prev / next month
                pm = root.find("#" + css.prev).off("click").click(function (e) {
                    if (!pm.hasClass(css.disabled)) {
                        self.addMonth(-1);
                    }
                    return false;
                });

                nm = root.find("#" + css.next).off("click").click(function (e) {
                    if (!nm.hasClass(css.disabled)) {
                        self.addMonth();
                    }
                    return false;
                });

                // set date
                self.setValue(value);

                // show calendar
                var pos = input.offset();

                // iPad position fix
                if (/iPad/i.test(navigator.userAgent)) {
                    pos.top -= $(window).scrollTop();
                }

                root.css({
                    top: pos.top + input.outerHeight(true) + conf.offset[0],
                    left: pos.left + conf.offset[1]
                });

                if (conf.speed) {
                    root.show(conf.speed, function () {
                        onShow(e);
                    });
                } else {
                    root.show();
                    onShow(e);
                }

                return self;
            },

            /**
            *   @public
            *
            *   Set the value of the dateinput
            */
            setValue: function (year, month, day) {

                var date = integer(month) >= -1 ? new Date(integer(year), integer(month), integer(day == undefined || isNaN(day) ? 1 : day)) :
					year || value;

                if (date < min) { date = min; }
                else if (date > max) { date = max; }

                // date given as ISO string
                if (typeof year == 'string') { date = parseDate(year); }

                year = date.getFullYear();
                month = date.getMonth();
                day = date.getDate();


                // roll year & month
                if (month == -1) {
                    month = 11;
                    year--;
                } else if (month == 12) {
                    month = 0;
                    year++;
                }

                if (!opened) {
                    select(date, conf);
                    return self;
                }

                currMonth = month;
                currYear = year;
                currDay = day;

                // variables
                var tmp = new Date(year, month, 1 - conf.firstDay), begin = tmp.getDay(),
					 days = dayAm(year, month),
					 prevDays = dayAm(year, month - 1),
					 week;

                // selectors
                if (conf.selectors) {

                    // month selector
                    monthSelector.empty();
                    $.each(labels.months, function (i, m) {
                        if (min < new Date(year, i + 1, 1) && max > new Date(year, i, 0)) {
                            monthSelector.append($("<option/>").html(m).attr("value", i));
                        }
                    });

                    // year selector
                    yearSelector.empty();
                    var yearNow = now.getFullYear();

                    for (var i = yearNow + conf.yearRange[0]; i < yearNow + conf.yearRange[1]; i++) {
                        if (min < new Date(i + 1, 0, 1) && max > new Date(i, 0, 0)) {
                            yearSelector.append($("<option/>").text(i));
                        }
                    }

                    monthSelector.val(month);
                    yearSelector.val(year);

                    // title
                } else {
                    title.html(labels.months[month] + " " + year);
                }

                // populate weeks
                weeks.empty();
                pm.add(nm).removeClass(css.disabled);

                // !begin === "sunday"
                for (var j = !begin ? -7 : 0, a, num; j < (!begin ? 35 : 42) ; j++) {

                    a = $("<a/>");

                    if (j % 7 === 0) {
                        week = $("<div/>").addClass(css.week);
                        weeks.append(week);
                    }

                    if (j < begin) {
                        a.addClass(css.off);
                        num = prevDays - begin + j + 1;
                        date = new Date(year, month - 1, num);

                    } else if (j >= begin + days) {
                        a.addClass(css.off);
                        num = j - days - begin + 1;
                        date = new Date(year, month + 1, num);

                    } else {
                        num = j - begin + 1;
                        date = new Date(year, month, num);

                        // current date
                        if (isSameDay(value, date)) {
                            a.attr("id", css.current).addClass(css.focus);

                            // today
                        } else if (isSameDay(now, date)) {
                            a.attr("id", css.today);
                        }
                    }

                    // disabled
                    if (min && date < min) {
                        a.add(pm).addClass(css.disabled);
                    }

                    if (max && date > max) {
                        a.add(nm).addClass(css.disabled);
                    }

                    a.attr("href", "#" + num).text(num).data("date", date);

                    week.append(a);
                }

                // date picking					
                weeks.find("a").click(function (e) {
                    var el = $(this);
                    if (!el.hasClass(css.disabled)) {
                        $("#" + css.current).removeAttr("id");
                        el.attr("id", css.current);
                        select(el.data("date"), conf, e);
                    }
                    return false;
                });

                // sunday
                if (css.sunday) {
                    weeks.find("." + css.week).each(function () {
                        var beg = conf.firstDay ? 7 - conf.firstDay : 0;
                        $(this).children().slice(beg, beg + 1).addClass(css.sunday);
                    });
                }

                return self;
            },
            //}}}

            setMin: function (val, fit) {
                min = parseDate(val);
                if (fit && value < min) { self.setValue(min); }
                return self;
            },

            setMax: function (val, fit) {
                max = parseDate(val);
                if (fit && value > max) { self.setValue(max); }
                return self;
            },

            today: function () {
                return self.setValue(now);
            },

            addDay: function (amount) {
                return this.setValue(currYear, currMonth, currDay + (amount || 1));
            },

            addMonth: function (amount) {
                var targetMonth = currMonth + (amount || 1),
              daysInTargetMonth = dayAm(currYear, targetMonth),
              targetDay = currDay <= daysInTargetMonth ? currDay : daysInTargetMonth;

                return this.setValue(currYear, targetMonth, targetDay);
            },

            addYear: function (amount) {
                return this.setValue(currYear + (amount || 1), currMonth, currDay);
            },

            destroy: function () {
                input.add(document).off("click.d keydown.d");
                root.add(trigger).remove();
                input.removeData("dateinput").removeClass(css.input);
                if (original) { input.replaceWith(original); }
            },

            hide: function (e) {

                if (opened) {

                    // onHide 
                    e = $.Event();
                    e.type = "onHide";
                    fire.trigger(e);

                    // cancelled ?
                    if (e.isDefaultPrevented()) { return; }

                    $(document).off("click.d keydown.d");

                    // do the hide
                    root.hide();
                    opened = false;
                }

                return self;
            },

            toggle: function () {
                return self.isOpen() ? self.hide() : self.show();
            },

            getConf: function () {
                return conf;
            },

            getInput: function () {
                return input;
            },

            getCalendar: function () {
                return root;
            },

            getValue: function (dateFormat) {
                return dateFormat ? format(conf.formatter, value, dateFormat, conf.lang) : value;
            },

            isOpen: function () {
                return opened;
            }

        });

        // callbacks	
        $.each(['onBeforeShow', 'onShow', 'change', 'onHide'], function (i, name) {

            // configuration
            if ($.isFunction(conf[name])) {
                $(self).on(name, conf[name]);
            }

            // API methods				
            self[name] = function (fn) {
                if (fn) { $(self).on(name, fn); }
                return self;
            };
        });

        if (!conf.editable) {

            // show dateinput & assign keyboard shortcuts
            input.on("focus.d click.d", self.show).keydown(function (e) {

                var key = e.keyCode;

                // open dateinput with navigation keyw
                if (!opened && $(KEYS).index(key) >= 0) {
                    self.show(e);
                    return e.preventDefault();

                    // clear value on backspace or delete
                } else if (key == 8 || key == 46) {
                    input.val("");
                }

                // allow tab
                return e.shiftKey || e.ctrlKey || e.altKey || key == 9 ? true : e.preventDefault();

            });
        }

        // initial value 		
        if (parseDate(input.val())) {
            select(value, conf);
        }

    }

    $.expr[':'].date = function (el) {
        var type = el.getAttribute("type");
        return type && type == 'date' || !!$(el).data("dateinput");
    };


    $.fn.dateinput = function (conf) {

        // already instantiated
        if (this.data("dateinput")) { return this; }

        // configuration
        conf = $.extend(true, {}, tool.conf, conf);

        // CSS prefix
        $.each(conf.css, function (key, val) {
            if (!val && key != 'prefix') {
                conf.css[key] = (conf.css.prefix || '') + (val || key);
            }
        });

        var els;

        this.each(function () {
            var el = new Dateinput($(this), conf);
            instances.push(el);
            var input = el.getInput().data("dateinput", el);
            els = els ? els.add(input) : input;
        });

        return els ? els : this;
    };


})(jQuery);

 ; 

return jQuery; 

});


//@ sourceURL=/vendor/jquery.tools.dateinput.js

;
/**
 * Extends the third-party jQuery Tools DatePicker widget to be internationalized
 * with Mozu text labels.
 */

define('modules/jquery-dateinput-localized',['shim!vendor/jquery.tools.dateinput[jquery=jQuery]>jQuery', 'underscore', 'hyprlive'], function ($, _, Hypr) {
    var months = 'January,February,March,April,May,June,July,August,September,October,November,December'.split(','),
        days = 'Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday'.split(',');

    var locale = (navigator.language || "en-US").split('-').shift();
    $.tools.dateinput.conf.locale = locale;
    $.tools.dateinput.localize(locale, {
        months: _.map(months, function (month) {
            return Hypr.getLabel(month.toLowerCase());
        }).join(','),
        shortMonths: _.map(months, function (month) {
            return Hypr.getLabel('short' + month);
        }).join(','),
        days: _.map(days, function (day) {
            return Hypr.getLabel(day.toLowerCase());
        }).join(','),
        shortDays: _.map(days, function (day) {
            return Hypr.getLabel('short' + day);
        }).join(',')
    });
});

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




define("pages/product", function(){});
