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
  'util/nonmodal/NonModalDialog',
  'util/multiselect/jqmultiselect'
], function (ColorManagerView, NonModalDialog) {
  /**
   * Mapping from chart to data of chart
   * @typedef DataMappingPanel
   * @type {DataMappingPanel}
   * @constructor
   */

  var DataMappingPanel = NonModalDialog.extend({
    title: 'Data Mapping Panel',
    className: 'data-mapping-panel', //the class for new create $el
    width: 400,

    /**
     * Constructor function of DataMappingPanel class
     * @param {type} options - Input data of constructor function
     */
    initialize: function (options) {
      NonModalDialog.prototype.initialize.apply(this);
      this.$docker = $(document.body);
      this.listenTo(framework.mediator, 'board:datamapping',  this.toogle);
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
        this.close();
        this.show();
      }
    },
    
    onOpen: function() {
      var self = this;
    
      if(this.curView) {
          this.receiver =  this.curView.chartctrl; //target to receive event
          this.$el.detach().appendTo(this.$docker);

          let $contents= this.$el.find('.dialog-contents').empty();
          let dataManager = this.curView.chartctrl.dataManager(),
              types = dataManager.getDataType(),
              all_columns = Object.keys(types),
              mapped= dataManager.getMapperProps();
          
          //add mapper (title and multiselect)
          Object.keys(mapped).forEach( function(mapper) {
            let isarray_mapping = $.isArray(mapped[mapper].map2);
            let $mapper = $('<div>').addClass('mapper');//create $mapper jquery component

            //show title
            let $title = $('<div>').addClass('mapper-title')
                .append($("<a>").text(mapped[mapper].label))
                  .attr('title', 'click to Show/Hide content')
                  .click(function() {
                     $(this).siblings('div.ui-multiselect').toggle();
                   });
            $title.appendTo($mapper);

            //define multiple selection component
            let $select = $("<select>")
                .attr({class:'jqmultiselect', multiple:'multiple', isarray: isarray_mapping})
                .on('multiselect:list', function(e, list) {
                   self.receiver && self.receiver.manualMapping({[mapper]: isarray_mapping? list: list[0]});//es6
                });

            //add multiple items to be selected
            let selected_columns = (mapped[mapper].map2.length > 0) ?  //have value
                                  ((isarray_mapping)? mapped[mapper].map2: [mapped[mapper].map2]): [];
            
            if(selected_columns.length) {
              _.difference(all_columns, selected_columns).forEach(function(column) {
                $("<option>").attr('value', column).text(column+ '('+ types[column]+ ')').appendTo($select);
              });
              selected_columns.forEach(function(column) {
                $("<option>").attr('value', column).text(column+ '('+ types[column]+ ')').attr('selected', 'selected').appendTo($select);
              });
            } else {
              all_columns.forEach(function(column) {
                $("<option>").attr('value', column).text(column+ '('+ types[column]+ ')').appendTo($select);
              });
            }
            
            $select.appendTo($mapper);
            $mapper.appendTo($contents);
          });
          $contents.find('.jqmultiselect').jqmultiselect();
      }
    } //onOpen end
    
  });

  return DataMappingPanel;

});

