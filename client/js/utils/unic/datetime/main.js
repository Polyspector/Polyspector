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
  'util/bootstrap-datetimepicker/build/js/bootstrap-datetimepicker.min',
  'css!util/bootstrap-datetimepicker/build/css/bootstrap-datetimepicker.min'
], function() {
   var MyClass = function(){};
   MyClass.prototype.render =  function($ctrl, manager, parent) {
      var self = this,
          key = $ctrl.attr('id'),
          $dtcontainer = $('<div/>',{style: 'position:relative'}),
          $dtpicker = $('<input/>', {type: 'text', value: $ctrl.data('value')});

      // create dateTimePicker component
      $dtpicker.datetimepicker({ format: '' });
      $dtpicker.on("blur", function (ev) {
        var dtvalue= $(this).val();
        manager.setValue(key, dtvalue);
      });
      $dtcontainer.append($dtpicker);
      return $dtcontainer;
   };
   
   return MyClass;
});
