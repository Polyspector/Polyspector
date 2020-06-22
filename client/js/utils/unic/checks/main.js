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
      var range = $ctrl.data('range'),
          key = $ctrl.attr('id'),
          values = $ctrl.data('value');
      var $checks = $("<div/>");
      
      if(_.isEmpty(range)) return $checks;

      range.forEach(function (item, i) {
        var $checkbox = $("<input />", {type: 'checkbox', name: key, value: item }),
            $label = $("<label />");
        if (Object.prototype.toString.call(values) === '[object Array]' && values.includes(item)) {
          $checkbox.prop('checked', true);
        }
        $checkbox.on("click", function (ev) {
          var checks = [],  $checked = $checks.find("input:checked");
          $checked.each(function(){
            checks.push($(this).val());
          });
          manager.setValue(key, checks);
        });
        $checks.append($label.append($checkbox).append(item));
      });
      return $checks;
   };
   
   return MyClass;
});
