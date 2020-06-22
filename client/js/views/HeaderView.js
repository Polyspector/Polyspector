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
 * @class ManagementPageView
 * @param {type} app - app.js
 * @param {type} headerTpl - Header html template
 * @param {type} SignupView SignupView class
 * @param {type} ManagementPageLoginView ManagementPageLoginView class
 * @returns {ManagementPageView}
 */
define([
    "js/app",
    "text!templates/header.html",
    "view/SignupView",
    "view/ManagementPageLoginView"
], function(app, headerTpl, SignupView, ManagementPageLoginView){
    /**
     * Constructor create HeaderView
     * @method HeaderView
     * @memberOf HeaderView
    */
    var HeaderView = Backbone.View.extend({

        template: _.template(headerTpl),

        initialize: function () {
             _.bindAll(this, 'render');
            // Listen for session logged_in state changes and re-render
            app.session.on("change:logged_in", this.render);
            this.LIMIT_LENGTH = 10;
            this.listenTo(framework.mediator, 'headerview:toolid', this.updateToolid);
            this.listenTo(framework.mediator, 'headerview:screenid', this.updateScreenid);
            this.listenTo(framework.mediator, 'headerview:dataentrance', this.updateDataEntrance);
         },
        // Set event name for html elements
       events: {
            //"mouseover button.event-breadcrumb": 'onShowBreadcrumb',
            //"click button.event-breadcrumb": 'onShowBreadcrumb',
            "click button.event-home" : 'onHomeBtnClicked',
            'click button.event-database' : 'onVTManagement',//
            'click button.event-data-selection' : 'onShowDataList',//
            'click button.event-tool-selection' : 'onShowToolList',
            'click button.event-tool-editor' : 'onShowScreenList', //Screen List 
            'click button.event-signout' : 'onLogoutClick',
            'click button.event-help': 'onHelpClick',
            'click button.event-access' : 'onClickManagementLogin',
            'click button.event-data-selection-from-group' : 'onShowDataListGroupClicked',//
            "click input[name='remote-operation']": 'onRemoteOperation',
        },
        
        updateToolid: function(toolid) {
            this.$el.find('.event-breadcrumb>i').text("TOOL: "+toolid);
        },
        
        updateScreenid: function(screenid, link) {
          var $me = this.$el.find('.event-screen a');
          if(screenid.length> this.LIMIT_LENGTH) {
            $me.text("SCREEN: "+screenid.substr(0,this.LIMIT_LENGTH) + '...');
            $me.attr('title', screenid);
            
          } else {
            $me.text("SCREEN: "+screenid);
            $me.removeAttr('title');
          }

          $me.attr('href', link);
        },

        updateDataEntrance: function(dataEntrance) {
            var data_entrance = dataEntrance.toString(),
                $data_entrance_elm = this.$el.find('.event-datalist>i');

            if(data_entrance.length > this.LIMIT_LENGTH) {
              $data_entrance_elm.text('DATA: '+ data_entrance.substr(0, this.LIMIT_LENGTH) + '...');
              $data_entrance_elm.attr("title", data_entrance);
            } else {
              $data_entrance_elm.text('DATA: '+data_entrance);
              $data_entrance_elm.removeAttr("title");
            }
        },
        
        onShowBreadcrumb: function($target) {
           framework.mediator.trigger('screenview:breadcrumb', $target);
        },
              
        // Handle logout event when user click logout button
        onLogoutClick: function(evt) {
            evt.preventDefault();
            framework.mediator.trigger('middleview:logout');
        },
        
        // Handle logout event when user click logout button
        onHelpClick: function(evt) {
          let url = window.location.origin? window.location.origin +'/help' :
                 window.location.protocol+'/'+window.location.host
                 + (window.location.port)? ':'+window.location.port :''
                 + '/help';
          window.open(url, '_blank');
        },

        // Remove account event
        onRemoveAccountClick: function(evt){
            evt.preventDefault();
            app.session.removeAccount({});
        },
        
        // Handle add new user event when user click add user button
        onClickAddNewUser: function(){
          this.signupView = new SignupView();
          this.signupView.render();
        },
          // Render HeaderView
        render: function () {
            var self = this;
            if(DEBUG) console.log("header RENDER::", app.session.toJSON());
             console.log(app.session.count);
          this.$el.html(
              this.template({
                logged_in: app.session.get("logged_in"),
                user: app.session.user.toJSON(),
                count: app.session.count
              })
            );
            this.$el.find('button.event-breadcrumb')
                .click(function(){
                  self.onShowBreadcrumb($(this));
                });
            return this;
        },
      
        //Trigger back home event
        onHomeBtnClicked: function () {
          framework.mediator.trigger('middleview:home');
        },
        
        //Trigger event of showing snapshots
        onShowBookmarks: function(){ //not implenmented
          framework.mediator.trigger('middleview:showBookmarks');
        },
      
        //Trigger event of showing snapshots
        onShowScreenList: function(){
          framework.mediator.trigger('middleview:showScreenList');
        },
        // Trigger event when user click vtmanager button
        onVTManagement: function () {
          framework.mediator.trigger('middleview:vtmanager');
        },
		    /**
         * Open management login view
         */
        onClickManagementLogin: function () {
          framework.mediator.trigger('middleview:accessManagement');
        },
       
        onShowDataList: function() {
          framework.mediator.trigger('middleview:showDataList');
        },
        onShowToolList: function() {
          framework.mediator.trigger('middleview:showToolList');
        },
        onShowDataListGroupClicked: function() {
          framework.mediator.trigger('middleview:showDataListGroup');
        },
        onRemoteOperation: function(evt) {
          let $checkbox = $(evt.target),
              permitted = $checkbox.prop("checked");
          if(permitted) {
            $checkbox.parent().addClass('remotelink');
          } else {
            $checkbox.parent().removeClass('remotelink');
          }
          framework.mediator.trigger('screenview:remoteOperation', permitted);
        }
    });

    return HeaderView;
});
