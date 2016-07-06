define([
    'modules/jquery-mozu', 'modules/api', 'hyprlive', 'shim!vendor/underscore>_'
], function($, api, Hypr, _) {

    var ForgotpassForm = function($el) {
        var self = this;
        this.$el = $el;
        this.$messageBar = this.$el.find('[data-mz-messagebar-container]');
        this.$el.on('submit', function(e) {
            e.preventDefault();
            self.forgotpassword();
        });

        $.each(this.boundMethods, function(ix, method) {
            self[method] = $.proxy(self[method], self);
        });

    };

    $.extend(ForgotpassForm.prototype, {
        boundMethods: ['displayMessage', 'displayApiMessage', 'forgotpassword','displayResetPasswordMessage'],
        bindListeners: function(on) {
            var onOrOff = on ? "on" : "off";
            this.$parent[onOrOff]('click', '[data-mz-action="submitforgotpassword"]', this.forgotpassword);
        },
        forgotpassword: function() {
            //alert(6);
            api.action('customer', 'resetPasswordStorefront', {
                EmailAddress: this.$el.find('[data-mz-forgotpassword-email]').val()
            }).then(this.displayResetPasswordMessage, this.displayApiMessage);

        },
        displayResetPasswordMessage: function () {
            $('[data-mz-messagebar-container]').addClass('mz-success');
            this.displayMessage(Hypr.getLabel('resetEmailSent'));
        },
        displayMessage: function(msg) {
            this.$messageBar.html(this.messageTemplate.render({
                model: [
                    {
                        message: msg
                    }
                ]
            }));
        },
        displayApiMessage: function (xhr) {
            this.$el.find('[data-mz-messagebar-container]').html(xhr.message);
            this.displayMessage(xhr.message);
        },
        hideMessage: function() {
            this.$messageBar.html('');
        },
        messageTemplate: Hypr.getTemplate('modules/common/message-bar')
    });



    $(document).ready(function() {
        // alert("first");
        var $theForm = $('[data-mz-forgotpassword-form]');
        window.forgotpassForm = new ForgotpassForm($theForm);
        $theForm.noFlickerFadeIn();
    });


});