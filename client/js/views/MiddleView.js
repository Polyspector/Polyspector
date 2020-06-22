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
 * Create MiddleView main function
 * @class MiddleView
 * @param {type} app
 * @param {type} middleTpl
 * @param {type} SidebarView
 * @param {type} BoardManagerView
 * @param {type} DataMapingPanel
 * @param {type} ControlPanel
 * @param {type} ManagementPageView
 * @param {type} DataSynthesizerView
 * @returns {MiddleView}
 */

define([
  'js/app',
  'view/ScreenView',
  'view/LoginView',
  'view/ManagementPageView',
  'view/DataSynthesizerView',
  'view/ScreenListView',
  'view/DataListView',
  'view/ToolListView',
  'view/DataListGroupView',
  'model/StatusModel',
  
], function (
  app,
  ScreenView,
  LoginView,
  ManagementPageView,
  DataSynthesizerView,
  ScreenListView,
  DataListView,
  ToolListView,
  DataListGroupView,
  StatusModel
) {
  /**
   * Constructor create MiddleView
   * @method MiddleView
   * @memberOf MiddleView
  */
  var MiddleView = Backbone.View.extend({
    initialize: function (/*screenid*/) {
      _.bindAll(this, 'render', 'lateRender');
      
      app.session.on("change:logged_in", this.render);
    
      //get predefined screenid and userid (coming from from URL parameters)
      this.predef_dataid = this.$el.data('dataid');
      this.predef_screenid = this.$el.data('screenid');
      this.haslogout = false; //remember the logout status
      this.listenTo(framework.mediator, 'middleview:accessManagement',this.setAccessManagement);
      this.listenTo(framework.mediator, 'middleview:home', this.setHomePage);
      this.listenTo(framework.mediator, 'middleview:logout', this.logout);
      this.listenTo(framework.mediator, 'middleview:vtmanager', this.setVTEditor);
      this.listenTo(framework.mediator, 'middleview:selectedScreen', this.setHomePage);
      this.listenTo(framework.mediator, 'middleview:showBookmarks', this.setBookmarksPage);//not implemented
      this.listenTo(framework.mediator, 'middleview:selectedTool', this.selectedTool);
      this.listenTo(framework.mediator, 'middleview:selectedData', this.selectedData);
      this.listenTo(framework.mediator, 'middleview:showDataList', this.showDataList);
      this.listenTo(framework.mediator, 'middleview:showToolList', this.showToolList);
      this.listenTo(framework.mediator, 'middleview:showScreenList',this.showToolEditor);
      this.listenTo(framework.mediator, 'middleview:showDataListGroup', this.showDataListGroup);
      //create model
      this.model = new StatusModel({user: app.session.user.get('id')}); //get user status model
    },
    
    //the function is called 
    render: function() {    
       var self = this,
          user = app.session.user.get('id'),
          logged_in =app.session.get("logged_in") ;

       if(this.currentView) {
         //save predef screen id here!!  
         this.currentView.remove(); 
       }

       if(this.haslogout) {
         //clear sid and data
        this.predef_dataid = null; //OK
        this.predef_screenid = null; //
        this.haslogout = false;
       }
       
       if(logged_in) { //successful logged in, please create this.model here
          this.model.set({user:  user }, {silent: true});// do'not save in this time
          this.model.fetch({
            silent: true,
            data: { user: user },
            success: function(model, response, options) {
              self.lateRender(true);
            },
            error: function(model, xhr, options) {
              self.lateRender(false);
            }
          });         
        } else { //to login
          this.currentView = new LoginView({
            el: $('<div>',{id: 'middle'}).appendTo(this.$el),
            screenid: self.predef_screenid,
            dataid: self.predef_dataid //only used to be show 
          }).render();
        }
    },
    
    logout: function() { //the MiddleView instanace is still existed!!
      this.haslogout = true;
      // return to root URL and  clear logged flag 
      app.session.logout({}); // No callbacks needed b/c of session event listening
    },

    //not used : to analysis the URL parameters
    getURLParams: function()
    {
        var params = {}, hash;
        var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
        for(var i = 0; i < hashes.length; i++)
        {
            hash = hashes[i].split('=');
            params[hash[0]] = encodeURIComponent(hash[1]);
        }
        return params;
    },

    lateRender: function(hasStatus4CurrentUser) {
      var predef_dataid =  this.predef_dataid,
          predef_screenid = this.predef_screenid;

      if( !hasStatus4CurrentUser  || (predef_dataid && this.model.get('data').id  !== predef_dataid) ) {
          //need to select and set new data from data list
          this.currentView = new DataListView({
              el: $('<div>',{id: 'middle'}).appendTo(this.$el),
              model: this.model,
              dataid: predef_dataid //set dataid and skip view if dataid existed 
          });
          return;
      } //assure the dataid will be got from status DB table.

      
      //in the following process, status has been set, but will be update if has_predef_dataid
      var has_predef_dataid = predef_dataid && predef_dataid.length >0 ;
      if(has_predef_dataid) {
        var data = this.model.get('data');
        this.model.set('data', {id: predef_dataid, format: data.format} ); //set dataid
      }

      //in the following process, status has been correctly setup
      if(has_predef_dataid || !_.isEmpty(this.model.get('tool'))  ) {
        this.currentView = new ScreenView({
              el: $('<div>',{id: 'middle'}).appendTo(this.$el),
              parent: this,
              status: this.model,
              screenid: predef_screenid //if screenid existed, then it will be used
        }).render();
        return;
      }
      
      this.currentView = new ToolListView({
          el: $('<div>',{id: 'middle'}).appendTo(this.$el), 
          model: this.model
      });
    
      return;
    },

    /**
    * Set middle area is homepage where charts are contained
    */
    setHomePage: function (screenid) {
          if(screenid) { //come from selecting item of in screen list
            this.currentView.remove();
            this.currentView = new ScreenView({
              el: $('<div>',{id: 'middle'}).appendTo(this.$el),
              parent: this,
              screenid: screenid,
              status: this.model
            }).render();
          } else { //come from Home Button
            //is it necessary to clear predefined screen and data id?
            this.render();
          }
    },
    
    showToolEditor: function (toolid) {
        if (!(this.currentView instanceof ScreenListView)) {
          this.currentView.remove();
          var options = {
            el: $('<div>',{id: 'middle'}).appendTo(this.el),
            format: this.model.get('data').format
          };
          if(toolid) {  options.toolid = toolid; }
          this.currentView = new ScreenListView(options).render();
        }
    },
      
      /**
       * Set middle area is vitual table management view
       */
    setVTEditor: function () {
        if (!(this.currentView instanceof DataSynthesizerView)) {
          this.currentView.remove();
          this.currentView = new DataSynthesizerView({
            el: $('<div>',{id: 'middle'}).appendTo(this.el)
          });
        }
    },
      /**
       * Set management page to middle
       */
    setAccessManagement: function () {
        if (!(this.currentView instanceof ManagementPageView)) {
          this.currentView.remove();
          this.currentView = new ManagementPageView({
            el: $('<div>',{id: 'middle'}).appendTo(this.el)
          });
        }
    },
    
    //the function is also called with null parameters when showing DataListView
    selectedTool: function(selectedTool) { //
        
        if(selectedTool) {
          this.model.set('tool', selectedTool);
        }

        //next view
        this.currentView.remove();
        if ( _.isEmpty(this.model.get('data'))) {
          this.currentView = new DataListView({
            el: $('<div>',{id: 'middle'}).appendTo(this.el), 
            model: this.model,         
          });
        } else { //show screenView
          　this.currentView = new ScreenView({
            　el: $('<div>',{id: 'middle'}).appendTo(this.$el),
              parent: this,
              status: this.model,
              screenid: this.predef_screenid
          }).render();
        }
    },
    
    selectedData: function(selectedData) {

        if(selectedData) {
          //this.model.save($.extend(true, {}, this.model.attributes, {data:selectedData}));??? why use this line?
          this.model.set('data', selectedData);

          //next view
          this.currentView.remove();
          if ( _.isEmpty(this.model.get('tool')) || 
            this.model.get('tool').format !== this.model.get('data').format ) {
            this.currentView = new ToolListView({
              el: $('<div>',{id: 'middle'}).appendTo(this.el), 
              model: this.model
            });
          } else { //show screenView
            this.currentView = new ScreenView({
              el: $('<div>',{id: 'middle'}).appendTo(this.$el),
              parent: this,
              status: this.model,
              screenid: this.predef_screenid
            }).render();
            //send clear Filters event
          }
        } else {
          console.log('should not arrive here!');//should
        }
    },
    
    showDataList: function() {
        if(!(this.currentView instanceof DataListView)){
          this.currentView.remove();
          this.currentView = new DataListView({
              el: $('<div>',{id: 'middle'}).appendTo(this.el), 
              model: this.model,
            });
        }
    },
    
    showDataListGroup: function() {
        if(!(this.currentView instanceof DataListGroupView)){
          this.currentView.remove();
          this.currentView = new DataListGroupView({
              el: $('<div>',{id: 'middle'}).appendTo(this.el), 
              model: this.model
            });
        }
    },
    
    showToolList: function() { 
        if(!(this.currentView instanceof ToolListView)){
          this.currentView.remove();
          this.currentView = new ToolListView({
              el: $('<div>',{id: 'middle'}).appendTo(this.el), 
              model: this.model
            });
        }
    } //function end 
  });
  return MiddleView;
});
