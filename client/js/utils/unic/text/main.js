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
      var self = this,
          key = $ctrl.attr('id'),
          value = $ctrl.data('value');
      
      var $text = $('<input>',{'class': 'form-control input-sm',type: 'text', value: value });
      
      if(parent) { //unit control
        $text.keypress(function(e) {
          if(e.keyCode == 13) { // enter key
            parent.close();
          }
        });
      }
      
      $text.change(function(){ //フォーカス外れたときに発火　--英数＋enter+全角＋delete+backspace
        manager.setValue($ctrl.attr('id'), $(this).val());
      });
      
      return $text;
  };
  
  MyClass.prototype.remove = function(){
    if(this.$text) {
      this.$text.remove();
    }
  };
  
  return MyClass;
});
