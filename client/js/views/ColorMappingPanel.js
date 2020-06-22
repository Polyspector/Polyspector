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
  'view/ColorManagerView',
  'util/nonmodal/NonModalDialog'
], function (ColorManagerView, NonModalDialog) {
  /**
   * Mapping from chart to data of chart
   * @typedef DataMappingPanel
   * @type {DataMappingPanel}
   * @constructor
   */

  var ColorMappingPanel = NonModalDialog.extend({
    title: 'Color Mapping Panel',
    className: 'color-mapping-panel', //the class for new create $el
    width: 400,
    
    /**
     * Constructor function of DataMappingPanel class
     * @param {type} options - Input data of constructor function
     */
    initialize: function (options) {
      NonModalDialog.prototype.initialize.apply(this);
      this.$docker = $(document.body);
      this.listenTo(framework.mediator, 'board:colormapping', this.toogle);
      this.listenTo(framework.mediator, 'board:active', this.activeChart);
      this.listenTo(framework.mediator, 'board:delete', this.deleteChart);
    },

    /**
     * Posite panel at start position
     */
     positionMe: function() {
      if(this.width){
        this.$el.width(this.width);
      }
      var $loc_point = this.$docker.find('contents');
      this.$el.css('top', $loc_point.offset().top);
      this.$el.css('left',$loc_point.offset().left + $loc_point.width() - this.$el.width());
      this.$el.height($loc_point.innerHeight());
    },
    
    activeChart: function(view) {
      if (this.isOpened()) {
        if(this.curView == view) {
          this.$el.parent().append(this.$el);
        } else {
          this.close();
          this.curView = null;
        }
      }
    },
    
     /**
     * @param {string} id - id of chart
     */
    deleteChart: function (view) {
      if(this.curView == view ) {
        this.close();
        //initial value
        this.curView = null;
      }
    },
    
    toogle: function (view) {
      if (!this.isOpened()) {
        this.curView = view;
        this.show();
      } else {
        if(this.curView !== view) {
          this.curView = view;
        } 
        //refresh
        this.close();
        this.show();
      }
    },
    
    onOpen: function() {
      var self = this;
      
      if(this.curView)
      {
      //clear all
      this.$el.detach().appendTo(this.$docker);
      var $contents= this.$el.find('.dialog-contents').empty();

        //add color title
      let $color = $('<div>').addClass('color');//
      
      //show color panel
      $('<div>').addClass('color-mapping container-fluid')
          .append(new ColorManagerView(null, {colorManager:  this.curView.chartctrl.colorManager()}).render())
          .appendTo($color);

        $color.appendTo($contents);
      }
    } //onOpen end
    
  });

  return ColorMappingPanel;

});

