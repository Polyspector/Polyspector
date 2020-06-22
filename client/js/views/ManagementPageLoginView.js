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
/**
 * Create LoginView main function
 * @class LoginView
 * @param {type} LoginPageTpl - ManagementPageLogin html template
 * @param {type} BootstrapDialog
 * @returns {LoginView}
 */
define([
  'text!templates/managementPageLogin.html',
  'util/dialog/bsdialog'
], function (LoginPageTpl, BootstrapDialog) {
  /**
   * @class ManagementPageLoginView
   */
  var LoginView = Backbone.View.extend(/** @lends ManagementPageLoginView.prototype */{
    /**
     * Init function
     */
    initialize: function () {
      this.render();
    },
    /**
     * Set event name for html element
     */
    events: {
      'click #login-btn': 'onLoginAttempt'
    },
    /**
     * Render LoginView
     */
    render: function () {
      this.template = _.template(LoginPageTpl);
      this.$el.html(this.template());
      return this;
    },
    /**
     * Show LoginView
     */
    show: function () {
      if (BootstrapDialog) {
        this.dialog = BootstrapDialog.show({
          title: 'Management Page Login',
          message: this.$el,
          draggable: true
        });
      }
    },
    /**
     * Implemtenting onLoginAttempt for event click login button
     * @returns {undefined}
     */
    onLoginAttempt: function () {
      var self = this;
      var username = $("#login-username-input").val();
      var password = $("#login-username-input").val();
      // Set data that send to server
      var sendData = {
        userid: username,
        password: password
      };
      $.when(self.checkLogin(sendData))
        .then(
          function (success) {
            // Close login dialog and show Access Management View if login successful
            if (self.dialog) {
              self.dialog.close();
              framework.mediator.trigger('middleview:accessManagement');
              console.log("Login status: Success " + success);
            }
          },
          function (error) {
            // Show error dialog if login fail
            console.log("Login failed with userid: " + error);
            self.showMessageDialog("Error Message",
              "Login failed, try again !", BootstrapDialog.SIZE_SMALL);
          }
        );
    },
    /**
     * Check login function
     * @param {Object} sendData - login data that send to server
     * @returns {undefined}
     */
    checkLogin: function (sendData) {
      var ajaxOptions = {
        url: 'api/auth/',
        type: 'POST',
        data: sendData
      };
      var deferred = $.Deferred();
      $.ajax(ajaxOptions).then(function (data) {
        if (data.error) {
          return deferred.reject(data.error);
        } else {
          return deferred.resolve(data);
        }
      });
      return deferred.promise();
    },
    /**
     * Show bootstrap dialog with options
     * @param {String} messTitle - message title
     * @param {String} mess - message content
     * @param {Object} dialogSize - dialog size
     * @returns {undefined}
     */
    showMessageDialog: function (messTitle, mess, dialogSize) {
      BootstrapDialog.show({
        size: dialogSize,
        title: messTitle,
        message: mess,
        buttons: [{
            label: 'OK',
            cssClass: 'btn-primary',
            action: function (dialog) {
              dialog.close();
            }
          }]
      });
    }
  });
  return LoginView;
});

