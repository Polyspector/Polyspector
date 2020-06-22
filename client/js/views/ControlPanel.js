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
 * Create ControlPanel main function
 * @param {type} NonModalDialog NonModalDialog class
 * @param {type} noUiSlider noUISlier js library for slider timeRange
 * @returns {ControlPanel}
 */
define([
  'util/nonmodal/NonModalDialog'
], function ( NonModalDialog) {
  /**
   * Constructor create ControlPanel
   * @class ControlPanel
   * @extend NonModalDialog
   */
  var ControlPanel = NonModalDialog.extend({
    className: 'control-panel',
    width: 500,
    /**
     * Constructor
     * @param {object} options - input options
     */
    initialize: function (options) {

      //super class initialize
      NonModalDialog.prototype.initialize.apply(this);

      //the docker to put my DOM
      this.$docker = $(document.body);

      //get the reference to container element
      this.$contents = this.$el.find('.dialog-contents');

      // when user active one chart
      this.listenTo(framework.mediator, 'board:active', this.activeFromChart);

      // listen add to control panel
      this.listenTo(framework.mediator, 'board:toggle_operation_panel', this.toggleFromChart);

      // when user delete one chart
      this.listenTo(framework.mediator, 'board:delete', this.deleteChart);
    },
    positionMe: function() {
      var $loc_point = this.$docker.find('contents');
      this.$el.css('top', $loc_point.offset().top);
      this.$el.css('left',$loc_point.offset().left);

      if(this.width){
        this.$el.width(this.width);
      }
      this.$el.height($loc_point.innerHeight());
    },

    onSwitchAnchorCliked: function(evt) {
      evt.stopPropagation();
      if(this.$docker.has("#middle").length >0){ //to be anchored
        this.$el.css({'position': '',
                      flex:'0 1 auto',
                      order: 2});
        this.$docker = $(document.body).find('#middle');
        this.$el.detach().appendTo(this.$docker);
      }else {
        this.$el.css({'position': 'absolute',
                      flex:'',
                      order: ''});
        this.$docker = $(document.body);
        this.$el.detach().appendTo(this.$docker);
        this.positionMe();
      }
    },

    /**
     * Open or close this panel
     * @params {BoardView} view - view which request to toogle this control panel
     */
    toggleFromChart: function (view, mode) {
      this.mode = mode;
      if (!this.isOpened()) {
        this.show(view);
        this.curView = view;
      } else {
        if (this.curView === view) {
          this.curView = null;
          this.close(view);
        } else {
          this.curView = view;
          this.show(view);
        }
      }
    },

    activeFromChart: function(view) {
      if (this.isOpened() && this.curView !==null  && this.curView !== view) {
          this.show(view);
          this.curView = view;
      }
    },

    onOpen: function(view) {
      var manager = null;
      if(this.mode ==='control')
      {
        this.$el.find('.dialog-title').text('絞込み操作パネル');
        manager = view.chartctrl.dataManager();
      } else
      if(this.mode ==='design')
      {
        this.$el.find('.dialog-title').text('デザイン操作パネル');
        manager = view.chartctrl.designManager();
      } else
      if(this.mode ==='analysis')
      {
        this.$el.find('.dialog-title').text('分析操作パネル');
        manager = view.chartctrl.analysisManager();
      } else { //default is design panel?
        //this.$el.find('.dialog-title').text('デザイン操作パネル');
        //manager = view.chartctrl.designManager();
      }
      this.$el.detach().appendTo(this.$docker);

      // create new content
      var $newcontent = this.createContent(manager);

      this.$contents.empty().append($newcontent).show();
    },

    /**
     * Create html document function
     * @param {object} view
     */
    createContent: function (manager) {
      var self = this,
          $ctrl_list = manager.getControl();

      var $container = $("<div class='container-fluid'>");

      // create Control Panel's component with each key in attrs
      $.each($ctrl_list, function(index, ctrl) {

        var $cloned_ctrl = $(ctrl).clone(true), //copy data
            label = $cloned_ctrl.data('label');

        if(!label) {
          label = $cloned_ctrl.data('name');
        }
        if(!label) {
          label = $cloned_ctrl.attr('id');
        }

        var $header = $("<div class='header'>").append(
            '<h4><span class="label label-primary">' + ( (label)? label : 'Column Selector') + '</span></h4>'
          );
          // add header
          $cloned_ctrl.append($header);

          // add control content
          self.createCtrlElement($cloned_ctrl, manager);

          //add Control Panel's component to container
          $container.append($cloned_ctrl);
      });

      // get content of container
      return $container;
    },

    createCtrlElement: function ($ctrl, manager) {
      var unic=null, $container = $('<div class="content">');
      switch($ctrl.data('type')) {
        case 'selection':
            unic = 'util/unic/selection/main';
            break;
        case 'slider':
            unic = 'util/unic/slider/main';
            break;
        case 'dateslider':
            unic = 'util/unic/dateslider/main';
            break;
        case 'regx':
        case 'text':
            unic = 'util/unic/text/main';
            break;
        case 'combox':
            unic = 'util/unic/combox/main';
            break;
        case 'check':
            unic = 'util/unic/check/main';
            break;
        case 'checks':
           unic = 'util/unic/checks/main';
            break;
        case 'radio':
           unic = 'util/unic/radio/main';
            break;
        case 'color':
            unic = 'util/unic/color/main';
            break;
        case 'datetime':
            unic = 'util/unic/datetime/main';
            break;
        case 'date':
            unic = 'util/unic/date/main';
            break;
        case 'time':
            unic = 'util/unic/time/main';
            break;
        default:
            break;
      }
      if(unic) {
        require([unic], function(CtrlLib){
          var $ctrl_content= (new CtrlLib()).render($ctrl, manager);
          $container.append($ctrl_content).appendTo($ctrl);
        });
      }
    },
    /**
     * @param {string} id - id of chart
     */
    deleteChart: function (view) {
      if(this.curView == view ) {
        //clear the contents
        this.$contents.empty();
        //hide me
        this.close(view);
        //initial value
        this.curView = null;
      }
    },
    /**
     * On close dialog
     */
    onClose: function (view) {
      this.$contents.hide();
    }
  });

  return ControlPanel;
});
