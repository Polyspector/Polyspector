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
define(['js/app'], function(app){
    var self = this;
    var value;
    var MyClass = Backbone.Model.extend({
        urlRoot: '/api/datalistGroup',
        defaults: {
          data: {},
        },
        url: function(){
            return app.API + '/datalistGroup';
        },      
        parse: function(response) {   
          if(response.data && typeof response.data !=='object'){
            response.data = JSON.parse(response.data);
          }
          if(response.trash && typeof response.trash !=='object'){
            response.trash = JSON.parse(response.trash);
          }
          value = response;
          return response;
        },
      
        initialize: function(){
          this.bind('change', function(){
            this.save(this.attributes, {silent: true});
          });

        },
        setValue: function(key, val) {
          this.save(key, val);
          if (this.attributes.deleteData != undefined) {
            delete this.attributes.deleteData;
          }
        },
        getValue: function() {
          return value;
        }
    });
   
    return MyClass;
});
