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
define(['./jquery.limitslider','css!./ranges.css'], function() {
   var RangesView = function(){
       
   };
  
   RangesView.prototype.drawSlider = function(ioctrl) {
     var self = this,
          colorManager = ioctrl.colorManager(),
          separator = colorManager.getSeparator(),
          colormap = colorManager.getColormap(),
          domain = colorManager.getDomain();
 
      var values = [], colors=[],
          $slider = $('<div>',{id: 'slider', class: 'color-ranges'});
          
      separator.forEach(function(currSepValue){
        values.push( Math.floor(currSepValue*100) );
      });
      
      for(var i=1; i<domain.length; i++) {
        colors.push({'background': [colormap[domain[i-1]], colormap[domain[i]]]});
      }
      
      this.slider= $slider.limitslider({
          values: values,
          gap: 0,
          step : 2,
          label: function(value, index){
              if(value) {
                 return value+'%';
              } 
              return '';
          },
          stop: function(event, ui){
            if(ui.values) {
                var separator = [];
                ui.values.forEach(function(value){
                    separator.push(value/100); 
                });
                framework.mediator.trigger('color_mapping:update_separator', separator);
            }
          },
          ranges: colors
      });
      
      if(values.length <= 0) {
        this.slider.find('.ui-slider-handle').remove();
      }
      
      return $slider;
   };
  
   RangesView.prototype.render =  function($ctrl, ioctrl, parent) {
      
      var $plus = $("<div class='color-plus'> + </div>"),
          $minus = $("<div class='color-minus'> - </div>");
      
      this.$container = $('<div/>');
      
      this.drawSlider(ioctrl).appendTo(this.$container);
          $plus.appendTo(this.$container);     
          $minus.appendTo(this.$container);
      return this.$container;
  };
 
  RangesView.prototype.remove = function(){
    
    if(this.$container) {
      this.$container.remove();
    }
  };
  
  return RangesView;
});
