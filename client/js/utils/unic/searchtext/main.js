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
      let self = this,
          id = $ctrl.attr('id'),
          value = $ctrl.attr('value');

    
      let $div  =  $('<div/>'),
          $text = $('<input>', { 'class': 'form-control input-sm', type: 'text', placeholder:'Search..' }).val(value).appendTo($div);

    
      let $selection = $('<select multiple size="auto">').css({width: '-webkit-fill-available', height:'auto'}).appendTo($div);
      let list = manager.valueList || $ctrl.data('range');
      _.each(list, function(d) {
        $('<option>')
        .text(d)
        .dblclick(function(){
          $(this).prop('selected', !$(this).prop('selected')).trigger('change');
        })
        .appendTo($selection);
      });

      var uppercaselist = list.map(function(val){return val.toUpperCase()});
      $text.keyup(function(e) {
        
        if(e.keyCode==13) {
          let input = $(this).val().toUpperCase();
          let vals = (input.length>0)? list.filter(function(item, index) {
            return uppercaselist[index].indexOf(input) >=0;
          }) : [];

          if(vals.length <=0) {
            $selection.find("option:selected").each(function(i, $item){
              vals.push ($item.text);
            });
          }

          if(id) {
            manager.setValue(id, vals); //use the original value
          } else {
            manager.setValue(vals);
          }

          if(parent)  parent.close();
        } else {
          let input = $(this).val().toUpperCase();
          list.forEach(function(item, index) {
            $selection.find('option:nth-child('+(index+1)+')').css("display", (uppercaselist[index].indexOf(input) >=0)? "block": "none");
          });
        }
      });

      return $div;
  };
  
  MyClass.prototype.remove = function(){
    if(this.$text) {
      this.$text.close();
    }
  };
  
  return MyClass;
});
