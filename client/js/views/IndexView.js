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
define(['js/app',
        'view/HeaderView',
        'view/MiddleView',
        'view/FooterView'
 ],    function(app, HeaderView, MiddleView, FooterView){
  var MyClass = function(){
  };
  
  MyClass.prototype.close = function(){
     if(this.headerView) {
       this.headerView.remove();
       this.headerView=null;
     }
    
    if(this.footerView){
       this.footerView.remove();
       this.footerView=null;
     }
     
    if(this.middleView) {
       this.middleView.remove();
       this.middleView=null;
     }
  };
  
  MyClass.prototype.render = function(){
      var self = this;
    
      if(!this.headerView) {
        this.headerView = new HeaderView(
          {el: $('<div>',{id: 'header'}).appendTo(this.$el)});
        this.headerView.setElement("header").render();
      }
      if(!this.footerView){
          this.footerView = new FooterView(
            {el: $('<div>',{id: 'footer'}).appendTo(this.$el)});
          this.footerView.setElement("footer").render();
      }  
      if(!this.middleView) {
          this.middleView = new MiddleView({el: 'section'});
          this.middleView.render();
      }  
  };
  
  return MyClass;
});
