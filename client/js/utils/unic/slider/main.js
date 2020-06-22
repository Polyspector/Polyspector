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
define([ 'ctrl/COMMON',
          'util/nouislider/nouislider.min', 
          'css!util/nouislider/nouislider.min'], function(COMMON, noUiSlider) {
  
  var SliderView = function(){
    this.slider_dom = null;
  };
  
  SliderView.prototype.render = function($ctrl, ioctrl) {
      var self = this,
          range   = $ctrl.data('range'),
          savedval = $ctrl.data('value');
      
      if(!range) return;
      
      var $container  = $("<div class='form-control input-sm' />"),
          $slider     = $('<div/>',{ type: 'selection' }).appendTo($container);
      var  connect = [true, false], singleHandle = true;

      var limit = Math.max(COMMON.numberAfterDot(range[0]), COMMON.numberAfterDot(range[1])),
          initval = [ +(range[0]), +(range[1])];//default value
      
      if(savedval) {
        if(!Array.isArray(savedval)) savedval = JSON.parse(savedval);
        if(Array.isArray(savedval)) {
          if(savedval[0] && savedval[0] > initval[0] && savedval[0]<initval[1]) initval[0] = savedval[0];
          if(savedval[1] && savedval[1] < initval[1] && savedval[1]>initval[0]) initval[1] = savedval[1];
          connect = [false, true, false];
          singleHandle = false;
        } else {
          initval = +savedval;
          singleHandle = true;
          connect = [true, false];
        }
      }
      
      this.slider_dom  = $slider.get(0);
    
      var minv = +(range[0]), maxv = +(range[1]); 
      if(minv !== maxv) {
        noUiSlider.create(this.slider_dom, {
          connect: connect,
          behaviour: 'drag-tap',
          range: {
            min: minv,
            max: maxv
          },
          start: initval
        });
      
        //get tooltip string
        var $min = null, $max=null; 
        if(singleHandle) {
          $min = $slider.find('.noUi-handle:first').text(d3.format(".3s")(initval));
        } else {
          $min = $slider.find('.noUi-handle:first').text(d3.format(".3s")(initval[0]));
          $max = $slider.find('.noUi-handle:last').text(d3.format(".3s")(initval[1]));
        }
    
        this.slider_dom.noUiSlider
        .on('change', function (values, handle) {
          var newval = null; 
          if(singleHandle) {
            newval =(+values[0]).toFixed(limit);
            $min.text(d3.format(".3s")(newval));
          } else {
            newval = [(+values[0]).toFixed(limit), (+values[1]).toFixed(limit)];
            $min.text(d3.format(".3s")(newval[0]));
            $max.text(d3.format(".3s")(newval[1]));
          }
          ioctrl.setValue($ctrl.attr('id'), newval);
        });

        this.slider_dom.noUiSlider
        .on('update', function (values, handle) {
          var newval = null;
          if(singleHandle) {
            newval =(+values[0]).toFixed(limit);
            $min.text(d3.format(".3s")(newval));
          } else {
            newval =[(+values[0]).toFixed(limit), (+values[1]).toFixed(limit)];  
            if(initval[0]!= newval[0] || initval[1]!= newval[1]){
                $min.text(d3.format(".3s")(newval[0]));
                $max.text(d3.format(".3s")(newval[1]));
            }
          }
        });
      }
      return  $container;
  }; 
  
  SliderView.prototype.remove = function(){
    if(this.slider_dom) {
      this.slider_dom.noUiSlider.destroy();
    }
  };
  
  return SliderView;
});
