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
  'js/app',
  'util/dialog/bsdialog',
  'util/getFile'
],  function(app, BootstrapDialog, getFile) {
   /**
    * Constructor create ScreenCtrl Class
    * @method ScreenCtrl
    * @memberOf module.ScreenCtrl
    */

   var MyClass = function() {};

   MyClass.prototype.getSharableUsers = function () {
      var deferred = $.Deferred();
      var ajaxOptions = {
         url: '/api/auth/users',
         type: 'GET',
         dataType: "json",
         timeout: 10000, //ms
       };
       $.ajax(ajaxOptions)
       .done(function(data, textStatus, jqXHR) {
          var users = data.users.filter(function(user) {
            return user != app.session.user.get('id');
          });
          deferred.resolve(users);
         })
       .fail(function(jqXHR, textStatus, errorThrown) {
          deferred.reject(errorThrown);
       });
      return deferred.promise();
   };

   MyClass.prototype.getSharedUsers = function (screenid) {
      var deferred = $.Deferred();
      var ajaxOptions = {
         url: '/api/scrauth/users',
         type: 'GET',
         dataType: "json",
         timeout: 10000, //ms
         data: {user: app.session.user.get('id') },
       };
       $.ajax(ajaxOptions)
       .done(function(data, textStatus, jqXHR) {
           deferred.resolve(data);
         })
       .fail(function(jqXHR, textStatus, errorThrown) {
          deferred.reject(errorThrown);
       });
      return deferred.promise();
   };

   MyClass.prototype.getLastestScreenOrDefaultScreen = function () {
      var deferred = $.Deferred();
      var ajaxOptions = {
         url: '/api/screen/ctrl/lastest',
         type: 'GET',
         dataType: "json",
         timeout: 10000, //ms
         data: {user: app.session.user.get('id') },
       };
       
       $.ajax(ajaxOptions)
       .done(function(data, textStatus, jqXHR) {
           deferred.resolve(data);
         })
       .fail(function(jqXHR, textStatus, errorThrown) {
          deferred.reject(errorThrown);
       });
      return deferred.promise();
   };
  
  MyClass.prototype.captureSimple = function($svg, $canvas)
   {
     var deferred = $.Deferred();
     var svg = $svg.get(0);
     var canvas = $canvas.get(0);
     
     if( $svg.find("style").length <= 0 ) {
       $("<style type='text/css'></style>")
        .prependTo($svg)
        .html(getFile.styles(svg));
     }
     canvg(canvas, svg.outerHTML, {
       renderCallback : function(){
          var data = canvas.toDataURL('image/jpeg');
          deferred.resolve(data);
       }
     });
     return deferred.promise();
   };
  
   MyClass.prototype.saveImg2LocalStorage = function (elem, name) {
      getFile.convertSVGToCanvas(elem);

      html2canvas(elem, {
            onrendered  : function (canvas) {
              var img = canvas.toDataURL("image/jpeg");
              getFile.download(img, name + ".jpg", "image/jpeg");
              // Remove canvas and display SVG chart after capture current chart
              getFile.revertSVGFromCanvas(elem);
            } //onrendered end
          });
   };
  
   MyClass.prototype.saveImg2Server = function(elem, imagename, width, height)
   {
      var self = this;
      return this.captureImg(elem, width,height).done(function (img){
         return self.saveImg(img, imagename);
      });
   };

   MyClass.prototype.captureImg = function(elem, width, height)
   {
     var deferred = $.Deferred();   
     getFile.convertSVGToCanvas(elem);
     html2canvas(elem, {
       onrendered: function(canvas) {

         var img = new Image();
         img.onload = function() {
           canvas.width = width;
           canvas.height = height;
           var ctx = canvas.getContext('2d');
           ctx.drawImage(img, 0, 0, width, height);
           getFile.revertSVGFromCanvas(elem);
           var newimg = canvas.toDataURL('image/jpeg');
           deferred.resolve(newimg);      
         };
         img.src = canvas.toDataURL();
       } //onrendered end
     });//html2canvas end
     return deferred.promise();
   };
  
   //ToDo: a client should get model to check if it have existed before writing a new model
   MyClass.prototype.saveImg = function(data, imageurl) {
       var ajaxOptions = {
         url: imageurl,
         type: 'POST',
         //dataType: 'jsonP', //for cross domain POST to work
         data: { image: data, ext: '.jpg' }
       };
       var deferred = $.Deferred();
       $.ajax(ajaxOptions)
       .done(function(data, textStatus, jqXHR) {
         deferred.resolve(data);
         //update imgurl in screen
       }).fail(function(jqXHR, textStatus, errorThrown) {
         deferred.reject(jqXHR.responseText);
       });
       return deferred.promise();
   };

   return MyClass;
});
