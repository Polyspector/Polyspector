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
 * Create SidebarView main function
 * @class SidebarView
 * @param {type} sidebarTpl - sidebar.html template
 * @param {type} SidebarModel SidebarModel class (SidebarModel.js)
 * @returns {SidebarView}
 */
define(["js/app",
        "text!templates/sidebar.html",
        'model/SidebarModel'
       ], function (app, sidebarTpl, SidebarModel) {
  /**
   * Constructor create SidebarView
   * @method SidebarView
   * @memberOf SidebarView
  */
    var SidebarView = Backbone.View.extend({
      template: _.template(sidebarTpl),
      initialize: function (options) {
        _.extend(this, _.pick(options, "parent"));//input params if existed
      },

      events: {
        //"click i.fa-undo"   : 'onUndoBtnClicked',
        //"click i.fa-repeat" : 'onRedoBtnClicked',
        "click button.event-capture-image" : 'onSnapshot', //trigger screen snapshot
        "click button.event-new-screen" : 'OnCreateScreen', //trigger screen snapshot
        "click button.event-pre-screen" : 'onPreScreen' ,
        "click button.event-first-screen" : 'onFirstScreen',
        "click button.event-next-screen" : 'onNextScreen',
        "click button.event-custom-screen" : 'OnCustomScreen',
        "click button.event-caption" : 'onToggleCaption',
        "click button.event-fit2window" : 'onFitToWindow',
        "click button.event-clear-filter" : 'onClearFilter',
        "click input[name='responsive']": 'onResponsive',
        "click button.event-share": 'onShareScreen', //
        "click button.event-clip" : 'onCloneScreen',//
        "click button.event-bookmark": 'onTagScreen',
        "click button.event-undo" : 'onUndoBtnClicked',
        "click button.event-redo" : 'onRedoBtnClicked',

      },
      
      // Render SideBarView
      render: function () {
        this.$el.html(this.template());
        return this;
      }, //render end
      
      // Trigger event when user click undo button
      onUndoBtnClicked : function () {
        framework.mediator.trigger('boardmanager:undo');
      },
      onRedoBtnClicked : function () {
        framework.mediator.trigger('boardmanager:redo');
      },
      onSnapshot: function () {
        if(this.parent) { //parent is screenview
          this.parent.captureImage();
        }
      },
     
      OnCreateScreen: function() {
        if(this.parent) {
          this.parent.newScreen();
        }
      },
      OnCustomScreen: function(){
        if(this.parent) {
          this.parent.setupScreen();
        }
      },
      onPreScreen: function(){
        if(this.parent) {
          this.parent.shiftToPreScreen();
        }
      },
      onFirstScreen: function(){
        if(this.parent) {
          this.parent.shiftToFirstScreen();
        }
      },
      onNextScreen: function(evt) {
        if(this.parent) {
          this.parent.shiftToNextScreen(evt);
        }
      },
      onToggleCaption: function(evt){
        framework.mediator.trigger('board:toggle-caption');
      },
      
      onFitToWindow: function(){
        framework.mediator.trigger('boardmanager:fit2window', index=0);
      },

      onClearFilter: function(){
        framework.mediator.trigger('board:clear-filter');
      },

      onShareScreen: function() {
        framework.mediator.trigger('boardmanager:sharescreen');
      },

      onCloneScreen: function() {
       if(this.parent) {
          this.parent.cloneScreen();
        }
      },

      onTagScreen: function() {
        framework.mediator.trigger('boardmanager:tagscreen');
      },

      onResponsive: function(evt) {
        var responsive = $(evt.target).prop("checked")? 1:0;
        this.parent.responsiveDesign(responsive);
      },
      
      update: function () {
          var $preButton = this.$el.find('button.event-pre-screen');
          if(this.parent.findPreScreen()) {
            $preButton.show();
          } else {
            $preButton.hide();
          }
          var $firstButton = this.$el.find('button.event-first-screen');
          var firstScreen = this.parent.findFirstScreen();
          if(firstScreen && this.parent.screenid && firstScreen != this.parent.screenid){
            $firstButton.show();
          } else {
            $firstButton.hide();
          }
          
          var $nextButton = this.$el.find('button.event-next-screen');
          var nextScreens = this.parent.findNextScreen();
          if(nextScreens.length>0 ){
            $nextButton.show();
          } else {
            $nextButton.hide();
          }
          var responsive = + this.parent.mainView.model.get('responsive');
          this.$el.find("input[name='responsive']").prop("checked", !!(responsive));
        },

        activeUndo: function(flag) {
          var $undoButton = this.$el.find('button.event-undo');
          if(flag) {
            $undoButton.prop("disabled", false);
          } else {
            $undoButton.prop("disabled", true);
          }
        },

        activeRedo: function(flag) {
          var $redoButton = this.$el.find('button.event-redo');
          if(flag) {
            $redoButton.prop("disabled", false);
          } else {
            $redoButton.prop("disabled", true);
          }
        }
    });
    return SidebarView;
  });
