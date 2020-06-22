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
	'lib/jquery-ui/jquery-ui',
	'css!lib/jquery-ui/jquery-ui.css'
 ], function(){
  
  var MyClass = function(){
    this.$el = $('<div class="content">').css('overflow','visible');
  };
  
  MyClass.prototype.dialog = function($ctrl_content, $location, manager) {
    var self = this;
    
    if(this.$el.children().length >0 ) {
      this.close();
    }
    
    this.$el.append($ctrl_content);
    
    var $current_dialog = this.$el.dialog({
      modal: false,
      draggable: false,
      resizable: true,
      closeOnEscape: true,
      minHeight: 0,
      position: {
        of: $location
      },
      close: function() { //ESC
        self.close();
      }
    }).parent().draggable();
    
    $current_dialog.parent().find('.ui-dialog-titlebar').remove();
    
    $(document).mouseup(function (e) {
      if ($current_dialog && $current_dialog.is(":visible") // if the target of the click isn't the container...
          && $current_dialog.has(e.target).length === 0) // ... nor a descendant of the container
      {
        self.close();
      }
    });

  };
  
  MyClass.prototype.show = function($tpl, $location, manager){
    var self = this, unic=null;
    switch($tpl.data('type')) {
      case 'slider':
        unic = 'util/unic/slider/main';
        break;
      case 'dateslider':
        unic = 'util/unic/dateslider/main';
        break;
      case 'regx':
      case 'text':
        unic = 'util/unic/text/main';
        break;
      case 'searchtext':
        unic = 'util/unic/searchtext/main';
        break;
      case 'multi-ranges-silder':
        unic = 'util/unic/multiRangesSlider/main';
        break;
      default:
        break;
      }
      if(unic) {
        require([unic], function(CtrlLib){
          $ctrl_content= (new CtrlLib()).render($tpl, manager, self);
          self.dialog($ctrl_content, $location);
        });
      }
  };
  
  MyClass.prototype.close = function() {
      this.$el.dialog('close');
      this.$el.empty();
  };
  
  return new MyClass();
  
});
