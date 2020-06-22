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
define(function(app) {

 var MyClass = function(){
   this._dataset_url_root = 'api/data/';//the root of virtual table
 };
 
 MyClass.prototype.getTableFromServer = function(wvtname, options) {
   var self = this;
   var deferred = $.Deferred();
   var context = $.extend(true, {}, window.framework.context, options),
       query_options = { type: 'POST', 
                         cache: false,
                         timeout: 2000, //2 seconds 
                         url: this._dataset_url_root + wvtname,
                         data: {_context_: context}
       };
   this.ajax = $.ajax(query_options)
     .done( function (body, textStatus, jqXHR) {
        self.parse_data(body, deferred);
      })
     .fail(function( jqXHR, textStatus, errorThrown) {
        deferred.reject(errorThrown);
      });
   
   return deferred.promise();
 };

  MyClass.prototype.parse_data = function(body, deferred) {
    
    try {
      var jsondata = JSON.parse(body), bSearch = true;
      Object.keys(jsondata).some(function(key) {
        var data = null, error=null;
        var value = jsondata[key];
        if(value.mappable || key==='_table_') {
          if(key =='_error_' || value.format=='_error_') {
             error = value.filled;
          } else if(value.format=='csv') {
              data = d3.csv.parse(value.filled);
          } else if(value.format=='tsv'){
              data = d3.tsv.parse(value.filled);
          } else if(value.format=='json') {
              if(typeof(value.filled) == "string"){
                  data = JSON.parse(value.filled);
              } else {
                  data = value.filled;
              }
          } else if(value.format=="text"){
              data = value.filled;
          } else {
              data =  value;
          }
        }
        if (error) { deferred.reject(error); return true;  }
        else if(data) { deferred.resolve(data); return true;  }
      });
    } catch(err) {
      deferred.reject(err);
    }
  };


 MyClass.prototype.get_old_table = function(table, options) {
    var self = this;
    var deferred = $.Deferred();
    global.mqFrontend.request(table, options).then(
         function (payload) {
            deferred.resolve({name: table, body: self.parse_data(payload)});
         },
         function (error) {
            deferred.reject({name:table, error:error});
         }
     );
     return deferred.promise();
  };

  MyClass.prototype.getTables = function (tables, options) {
    var deferred = $.Deferred();
    var self = this;
    var dfds = [];

    tables.forEach(function(table) {
        dfds.push(self.get_old_table(table, options));
    });

    $.when.apply($, dfds).done(function(){
      deferred.resolve(arguments);
    }).fail(function(err){
      deferred.reject(err);
    });
    
    return deferred.promise();
  };

  return new MyClass();
}); //end
