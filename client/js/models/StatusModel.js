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
  
    var MyClass = Backbone.Model.extend({
        urlRoot: '/api/status',
        defaults: {
          tool: {},
          data: {},
          //screenid: to keep and restore the current screen
        },
      
        parse: function(response) {
          if(response.tool && typeof response.tool !=='object'){
            response.tool = JSON.parse(response.tool);
          }
          if(response.data && typeof response.data !=='object'){
            response.data = JSON.parse(response.data);
          }
          return response;
        },
      
        initialize: function() { 
          this.bind('change', function(){
            if(this.hasChanged('data')) {
              var data = this.get('data');
              //window.framework.context = {_format_: data.format, _database_: {name: data.id} };
            }
            this.save(this.attributes, {silent: true});
          });
        },
    });
   
    return MyClass;
});

