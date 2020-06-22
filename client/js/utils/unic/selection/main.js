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
define( function() {
   var MyClass = function(){};
  
   MyClass.prototype.render =  function($ctrl, manager, parent) {
      var self = this, MAX_ITEMS = 1000, id=$ctrl.attr('id');
      
      var $selection = $('<select />',{  class:'form-control', multiple:'multiple' });
      var range = $ctrl.data('range'),
          values = $ctrl.data('value');
      if(!range) range = [];
      
      // add option to selection //set MAX_ITEMS=100 for performance
      range.slice(0,MAX_ITEMS).forEach(function (item, i) {
        var $option = $("<option/>", {text: item }).dblclick(function(){
          $(this).prop('selected', !$(this).prop('selected')).trigger('change');
        });

        if (values.includes(item)) {
          $option.prop('selected', true);
        }
        $selection.append($option);
      });
      
      $selection.on('change', function(ev){
        var selects = [];
        $(this).find("option:selected").each(function(i, $item){
          selects.push ($item.text);
        });
        if(id){
            manager.setValue(id, selects);
        } else {
            manager.setValue(selects); //columns selector
        }
      });
      
      return $selection;
  };
  
  MyClass.prototype.remove = function(){
    if(this.$text) {
      this.$text.remove();
    }
  };
  
  return MyClass;
});
