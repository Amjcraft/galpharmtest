define([
    'modules/jquery-mozu', 'modules/api', 'hyprlive', 'underscore', "modules/backbone-mozu", "modules/models-address", "modules/models-customer"
], function($, api, Hypr, _, Backbone, AddressModels, CustomerModels) {
  var console = window.console;
  var SignupForm = function($el) {
    var self = this;
    this.$el = $el;
    this.$messageBar = this.$el.find('[data-mz-messagebar-container]');
    this.$el.on('submit', function(e) {
      e.preventDefault();
      //new signup($el);
      self.signup();
    });
    
    
  };
  
  
   /*var signup =  function($el) {
      var self = this,
        data = (function(formdata) {
          return _.object(_.pluck(formdata, 'name'), _.pluck(formdata, 'value'));
        }($el.serializeArray())),
        payload = { 
          account: {
            emailAddress: data.emailaddress,
            userName: data.emailaddress,
            firstName: data.firstname,
            lastName: data.lastname,
            contacts: [{
              email: data.emailaddress,
              firstName: data.firstname,
              lastNameOrSurname: data.lastname
            }]
          },
          password: data.password
        };

      if (new validate(data)) {
        //var user = api.createSync('user', payload);
        return api
          .action('customer', 'createStorefront', payload)
          .then(function() {
            // window.location.reload();
            window.location = '/myaccount';
          }, self.displayMessage);
      }
    };
    
     var validate = function(data) {
      if (!data.emailaddress) return this.displayMessage(Hypr.getLabel('emailMissing')), false;
      if (!data.password) return this.displayMessage(Hypr.getLabel('passwordMissing')), false;
      if (data.password !== data.confirmpassword) return this.displayMessage(Hypr.getLabel('passwordsDoNotMatch')), false;
      return true;
    }*/

  $.extend(SignupForm.prototype, {

    signup: function() {
      var self = this,
        data = (function(formdata) {
          return _.object(_.pluck(formdata, 'name'), _.pluck(formdata, 'value'));
        }(this.$el.serializeArray())),
        payload = {
          account: {
            emailAddress: data.emailaddress,
            userName: data.emailaddress,
            firstName: data.firstname,
            lastName: data.lastname,
            contacts: [{
              email: data.emailaddress,
              firstName: data.firstname,
              lastNameOrSurname: data.lastname
            }]
          },          
          password: data.password,            
          agree: data.agree     
          //null: data.null,    
        };

        console.log(data);
        
      if (this.validate(data)) {
        //var user = api.createSync('user', payload);
        return api
          .action('customer', 'createStorefront', payload)
          .then(function() {
            // window.location.reload();
            window.location = '/myaccount';
        }, function(response) { 
            var finalMsg = response.message,
                message = finalMsg.split(": "),
                type = response.additionalErrorData[0];
            
            if (message.length > 1) {
                finalMsg = message[1];
            }
            if (type) {
                type = type.value;
                var splitMsg = finalMsg.split(type + " "),
                    tempMsg = "";
                
                var x = 0;
                for (x; x < splitMsg.length; x++){
                    if (x > 0) {
                        tempMsg += splitMsg[x];
                    }
                }
                finalMsg = tempMsg;
            }
            
            console.log(response); 
            self.displayMessage(finalMsg);
        });
      }
    },
    validate: function(data) {
      if (!data.firstname) return this.displayMessage(Hypr.getLabel('firstNameMissing')), false;
      if (!data.lastname) return this.displayMessage(Hypr.getLabel('lastNameMissing')), false;
      if (!data.emailaddress) return this.displayMessage(Hypr.getLabel('emailMissing')), false;
      if (!data.password) return this.displayMessage(Hypr.getLabel('passwordMissing')), false;
      if (!data.agree) return this.displayMessage(Hypr.getLabel('agreeMissing')), false;
      //;if (!data.null) return this.displayMessage(Hypr.getLabel('emailDuplicate')), false;
      if (data.password !== data.confirmpassword) return this.displayMessage(Hypr.getLabel('passwordsDoNotMatch')), false;
      return true;
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
    hideMessage: function() {
      this.$messageBar.html('');
    },
    messageTemplate: Hypr.getTemplate('modules/common/message-bar')
  });



  $(document).ready(function() {
    var $theForm = $('[data-mz-signup-form]');
    window.signupForm = new SignupForm($theForm);
    $theForm.noFlickerFadeIn();
  });


});

