define([
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