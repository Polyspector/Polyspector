/*
    Copyright (c) 2016 Toshiba
    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0


    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
define([
    "js/app",
    'util/dialog/bsdialog',
    "text!templates/signup.html",
], function(app, BootstrapDialog,signupTpl){
  /**
   * Constructor create SignupView
   * @method SignupView
   * @memberOf SignupView
  */
  var SignupView = Backbone.View.extend({
     template: _.template(signupTpl),
     initialize: function(){
     this.$el.html(this.template({
          logged_in: app.session.get("logged_in"),
          user: app.session.user.toJSON()
        })
     );
     this.$el.find('#signup-btn').click(this.onSignupAttempt.bind(this));
     this.$el.find('#signup-password-confirm-input').keyup(this.onConfirmPasswordKeyup.bind(this));
    },
    
    // Render SignupView
    render: function () {
      this.dialog = BootstrapDialog.show({
        title: 'Add new user',
        message: this.$el,
        draggable: true
      });
      return this;
    },
    
    // Allow enter press to trigger signup
    onConfirmPasswordKeyup: function (evt) {
      var k = evt.keyCode || evt.which;

      if (k === 13 && $('#confirm-password-input').val() === ''){
          evt.preventDefault();   // prevent enter-press submit when input is empty
      } else if(k === 13){
          evt.preventDefault();
          this.onSignupAttempt();
          return false;
      }
  },
  // Check login with username and password
  onSignupAttempt: function(){
    var self = this;
    if(this.$el.find("#signup-form").parsley('validate')){
        app.session.signup({
            userId: self.$el.find("#signup-username-input").val(),
            password: self.$el.find("#signup-password-input").val(),
            actor: self.$el.find("#signup-actor").val()
        }, {
            success: function(mod, res){
              if(DEBUG) console.log("SUCCESS", mod, res);
              self.remove();
              self.dialog.close();
              framework.mediator.trigger('managepageview:addeduser', res.user);
            },
            error: function(err){
              if(DEBUG) console.log("ERROR", err);
              self.showAlert('Uh oh! '+  err.error);
            }
        });
    } else {
        // Invalid clientside validations thru parsley
        if(DEBUG) console.log("Did not pass clientside validation");
    }
  },
  // Display alert to user
  showAlert: function(text) {
      var $alert = this.$el.find("#signup-alert");
      this.$el.find("#signup-username-input").val('');
      this.$el.find("#signup-password-input").val('');
      this.$el.find("#signup-password-confirm-input").val('');
      
      $alert.text(text);
      this.$el.find("#signup-alert").show('fast');
      setTimeout(function() {
        $alert.hide();
      }, 7000 );
  }
});
return SignupView;

});
