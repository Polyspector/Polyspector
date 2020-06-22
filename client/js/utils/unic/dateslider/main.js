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
'util/nouislider/distribute/nouislider', 
'css!util/nouislider/distribute/nouislider'], function(COMMON, noUiSlider) {
  
  var SliderView = function(){
    this.slider_dom = null;
  };
  
  SliderView.prototype.render = function($ctrl, ioctrl) {
      var self = this,
          timeformat = d3.time.format("%m/%d-%H:%M");
          range   = $ctrl.data('range'),
          value = $ctrl.data('value');
      
      if(!range) return;
      
      var $container  = $("<div class='form-control input-sm' />"),
          $slider     = $('<div/>',{ type: 'selection' }).appendTo($container);
      
      var initval  = [range[0].getTime(), range[1].getTime()];//default value
      var savedval = [Date.parse(value[0]), Date.parse(value[1])];//default value 
      if(savedval) {
        if(savedval[0] && savedval[0] > initval[0] && savedval[0]<initval[1]) initval[0] = savedval[0];
        if(savedval[1] && savedval[1] < initval[1] && savedval[1]>initval[0]) initval[1] = savedval[1];
      }
      
      this.slider_dom  = $slider.get(0);
      
      noUiSlider.create(this.slider_dom, {
        connect: true,
        behaviour: 'drag-tap',
        range: {
          min: (initval[0]),
          max: (initval[1])
        },
        start: [range[0].getTime(), range[1].getTime()]
      });
     
      var $min = $slider.find('.noUi-handle:first').text(timeformat(range[0])),
          $max = $slider.find('.noUi-handle:last').text(timeformat(range[1]));
      
      this.slider_dom.noUiSlider
      .on('change', function (values, handle) {
        var newval = [values[0], values[1]];
        
        if(initval[0]!= newval[0] || initval[1]!= newval[1]){
           var vd1 = new Date(+newval[0]),
               vd2 = new Date(+newval[1]);
           $min.text(timeformat(vd1));
           $max.text(timeformat(vd2));
           ioctrl.setValue($ctrl.attr('id'), [vd1, vd2]);
        }
      });
      this.slider_dom.noUiSlider
      .on('update', function (values, handle) {
        var newval = [values[0], values[1]];
        if(initval[0]!= newval[0] || initval[1]!= newval[1]){
          $min.text(timeformat(new Date(+newval[0])));
          $max.text(timeformat(new Date(+newval[1])));
        }
      });
      
      return  $container;
  }; 
  
  SliderView.prototype.remove = function(){
    if(this.slider_dom) {
      this.slider_dom.noUiSlider.destroy();
    }
  };
  
  return SliderView;
});
