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
 * Create ManagementPageView main function
 * @param {type} ManagementPageTpl - ManagementPage html template
 * @param {type} ManagementPageUserTpl - ManagementPageUser html template
 * @param {type} ManagementPageUserAddTpl - ManagementPageUserAdd html template
 * @returns {ManagementPageView}
 */
define([
  'util/dialog/bsdialog',
  'text!templates/managementPage.html',
  'text!templates/managementPageUser.html',
  'text!templates/managementPageUserAdd.html'
], function (
  BootstrapDialog,
  ManagementPageTpl,
  ManagementPageUserTpl,
  ManagementPageUserAddTpl) {

  var activeClassName = 'management-table-active';
  /**
   * @class ManagementView
   */
  var ManagementView = Backbone.View.extend(/** @lends ManagementView.prototype */{
    /**
     * Init function
     * @param {type} iOptions - options data
     * @returns {undefined}
     */
    initialize: function (iOptions) {
      this.options = iOptions;
      this.render();
    }
  });
  
  /**
   * Add User View (Bootstrap Dialog)
   * @class UserManagementAddUser
   */
  var UserManagementAddUser = ManagementView.extend(/** @lends UserManagementAddUser.prototype */{
    template: _.template(ManagementPageUserAddTpl),
    /**
     * Render function - render html document (managementPageUserAdd.html)
     * @returns this - UserManagementAddUser
     */
    render: function () {
      this.$el.html(this.template());
      this.dialog = BootstrapDialog.show({
        title: 'Add new user',
        message: this.$el,
        draggable: true
      });
      
      return this;
    },
    /**
     * Setting event for html elements
     */
    events: {
      'click #button-ok': 'onOkButtonClicked',
      'click #button-cancel': 'onCancelButtonClicked'
    },
    /**
     * Implementing for event onOkButtonClicked when user click "OK" button
     * @returns {undefined}
     */
    onOkButtonClicked: function () {
      var self = this;
      var userid = this.$('#input-id').val(),
        password = this.$('#input-password').val(),
        description = this.$('#input-description').val();
      var user = {
        id: userid,
        password: password,
        description: description
      };
      $.when(self.addUser(user))
        .then(
          function (success) {
            // Add new user to users table in access management view
            var permissions = self.options.permissions;
            var optionValues = [
              {value: 'default', text: ''},
              {value: 'manager', text: 'Manager'},
              {value: 'operator', text: 'Operator'}
            ];
            var bodyEl = d3.select('.data-users-table>tbody');
            var trEl = bodyEl.append('tr');
            trEl.append('td')
              .attr('style', 'width: 150px')
              .attr('class', 'user-name')
              .attr('align', 'center')
              .text(user.id);
            var select = trEl.append('td').attr('align', 'center')
              .append('select').attr('class', 'combobox').attr('id', user.id);
            select.selectAll('option')
              .data(optionValues)
              .enter()
              .append('option')
              .attr('value', function (d) {
                return d.value;
              })
              .text(function (d) {
                return d.text;
              });
            $.each(permissions, function (index, value) {
              trEl.append('td')
                .attr('align', 'center')
                .append('input')
                .attr('class', 'checkbox')
                .attr('type', 'checkbox')
                .attr('id', user.id + '-' + value);
            });
            // Close add new user dialog and show access management with new data
            if (self.dialog) {
              console.log("Add succesful with user: " + user.toString());
              self.dialog.close();
              framework.mediator.trigger('middleview:accessManagement');
            }
          },
          function (error) {
            // Show error dialog when add new user error
            showMessageDialog("Error Message",
              "Add user failed, try again !", BootstrapDialog.SIZE_SMALL);
            // Log when client connect to server occur error (400, 404, 408,...)
            if (error.type && error.type === "error") {
              console.log("Can not send request to server");
              console.log("Status code: " + error.statusCode + " (" + error.statusText + ")");
            }
          }
        )
        .always(function () {
          console.log("Finished handling add new user request!");
        });
    },
    /**
     * Handling event click "Cancel" button in Add User View
     * @returns {undefined}
     */
    onCancelButtonClicked: function () {
      this.dialog.close();
    },
    /**
     * Add new user function: Send ajax request with user data and receive response from server
     * @param {type} user - user who want add to database
     * @returns {unresolved}
     */
    addUser: function (user) {
      console.log("Add User: " + user.id + "," + user.password + "," + user.description);
      var ajaxOptions = {
        url: 'api/user/',
        type: 'POST',
        data: user,
        error: function (xhr, errorType) {
          return deferred.reject({type: errorType, statusCode: xhr.status, statusText: xhr.statusText});
        }
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
    }
  });
  /**
   * Which contain UserManagermentView
   * @class UserManagermentView
   */
  var UserManagermentView = ManagementView.extend(/** @lends UserManagermentView.prototype */{
    /**
     * Init function
     * @returns {undefined}
     */
    initialize: function () {
      var self = this;
      $.when(self.getUsers())
        .then(
          function (data) {
            self.users = data.users;
            self.actors = data.actors;
            self.permissions = Object.keys(data.actors[Object.keys(data.actors)[0]]);
            self.render();
          },
          function (error) {
            // Show error dialog if failed to get data
            self.showMessageDialog("Error Message",
              "Failed to get data from server", BootstrapDialog.SIZE_SMALL);
          }
        );
    },
    /**
     * Setting event for html elements
     */
    events: {
      'click .button-add-user': 'onClickAddUserButton',
      'contextmenu .user-name': 'onContextMenu',
      'change .combobox': 'onChangeActorCombobox',
      'change .checkbox': 'onChangeAccessCheckbox'
    },
    template: _.template(ManagementPageUserTpl),
    /**
     * Render function - render html document (managementPageUser.html)
     * @returns this - UserManagermentView
     */
    render: function () {
      this.$el.html(this.template({
        users: this.users,
        permissions: this.permissions,
        actors: this.actors
      }));
      return this;
    },
    /**
     * Implementing onClickAddUserButton function for event click add new user button
     * @returns {undefined}
     */
    onClickAddUserButton: function () {
      // Show UserManagementAddUser View
      this.addUserDialog = new UserManagementAddUser({
        users: this.users,
        permissions: this.permissions
      });
    },
    /**
     * onContextMenu function
     * @param {type} evt - event
     * @returns {undefined}
     */
    onContextMenu: function (evt) {
      evt.originalEvent.preventDefault();
      evt.originalEvent.stopPropagation();
    },
    /**
     * Implementing onChangeActorCombobox function for event click change value of combox actors in users table
     * @param {type} evt - event
     * @returns {undefined}
     */
    onChangeActorCombobox: function (evt) {
      var actorChange = $(evt.target).val(),
        userChange = $(evt.target).attr("id");
      var dataChange = {
        actor: actorChange,
        user: userChange
      };
      console.log(dataChange);
    },
    /**
     * Implementing onChangeAccessCheckbox function for event click change value of checkbox in users table
     * @param {type} evt
     * @returns {undefined}
     */
    onChangeAccessCheckbox: function (evt) {
      var elId = $(evt.target).attr("id"),
        user = elId.split("-")[0],
        permissionChange = elId.split("-")[1];
      window.alert(user + "," + permissionChange + ":" + $(evt.target).is(":checked"));
    },
    /**
     * Get users and actors data from server
     *    1. Send ajax request to server
     *    2. Get response data incoming from server
     * @returns {unresolved}
     */
    getUsers: function () {
      var ajaxOptions = {
        url: 'api/users/',
        type: 'GET',
        data: {}
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
    }
  });
  /**
   * @class Management Page View
   */
  var ManagementPageView = Backbone.View.extend(/** @lends ManagementPageView.prototype */{
    /**
     * Init function
     * @returns {undefined}
     */
    initialize: function () {
      this.userManagement = new UserManagermentView();
      this.render();
      this.container.html(this.userManagement.$el);
      $('.button-user-manage').addClass(activeClassName);
    },
    /**
     * Render function - render html document (managementPage.html)
     * @returns this - ManagementPageView
     */
    render: function () {
      this.template = _.template(ManagementPageTpl);
      this.$el.html(this.template());
      this.container = this.$('.management-view');
      return this;
    }
  });
  /**
   * Show bootstrap dialog with options
   * @param {String} messTitle - message title
   * @param {String} mess - message content
   * @param {Object} dialogSize - dialog size
   * @returns {undefined}
   */
  var showMessageDialog = function (messTitle, mess, dialogSize) {
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
  };
  return ManagementPageView;
});
