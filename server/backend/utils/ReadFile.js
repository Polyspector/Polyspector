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
function ReadFile () {

  var BIG = {
        NONE: 0,
        ROW: 1,
        COLUMN: 2,
        BOTH: 3 
    };

  //private members ( static variables)
  var fs = require('fs');
  var $  = require('jquery-deferred');
  
  //public member for asyn call
  this.vts = function(wk_name) {
      return ['Original'];
  };

  this.asyn = function(options, entrance, filename) { 
    this.name = filename;
    var deferred = $.Deferred();
    var response = {};
    console.log('request options:  ' + JSON.stringify(options)  );
    fs.readFile(entrance + filename, 'utf8', function(err, text){
      if(err){
        response._error_= {};
        response._error_.format = 'json';
        response._error_.filled = err;
        deferred.reject(response);
      } else {
        response._table_ = {};
        response._table_.big = BIG.NONE;
        response._table_.format = filename.split('.').pop().toLowerCase();
        response._table_.filled = text;
        deferred.resolve(response);
      }
    });
    
    return deferred.promise();
  };
}

module.exports = ReadFile;
