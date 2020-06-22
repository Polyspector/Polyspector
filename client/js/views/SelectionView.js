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
define(['lib/jquery-ui/jquery-ui',
        'css!lib/jquery-ui/jquery-ui.css'
       ], function() {
  
  var MyClass = function(){
  };
  
  MyClass.prototype.show = function(items, $location, title) {
  
    var deferred = $.Deferred();
  
    //create selections
    var $container =$('<div class="content">');
    var $selection = $('<select />',{  class:'form-control'})
              .attr('size', items.length)
              .appendTo($container);
    
    // add option to selection
    items.forEach(function (item, i) {
        var $option = $("<option/>", {text: item });
        $selection.append($option);
      });
    
    //create dislog
    $container.dialog({
      modal: true,
      draggable: false,
      resizable: false,
      autoOpen: false,
      title: title,
      closeOnEscape:	true,
      minHeight: 0,
      position: {
        of: $location
      },
      close: function() { //ESC
        $container.dialog('destroy');
        deferred.reject();
      }
    }).parent().draggable();
    $(".ui-dialog-titlebar").remove();
    
    //add selection event callback
    $selection.on('change', function(ev){
        var selected = $(this).find("option:selected").first().text();
        $container.dialog('destroy');
        deferred.resolve(selected);//close and return selected items 
      });
    
    //open dialog
    $container.dialog('open');
    
    return deferred.promise();
  };
  
  return MyClass;
  
});
