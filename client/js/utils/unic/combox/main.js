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
      var self = this;
      var $combox = $('<select/>',{class: 'form-control'});
      var range = $ctrl.data('range'),
          key = $ctrl.attr('id'),
          value = $ctrl.data('value');
      range.forEach(function (item, i) {
        var $option = $("<option/>", {text: item });
        if (value == item) {
          $option.prop('selected', true);
        }
        $combox.append($option);
      });
      $combox.on("change", function (ev) {
        var $select = $(this).find("option:selected");
        manager.setValue(key, $select.val());
      });
      return $combox;
   };

   return MyClass;
});
