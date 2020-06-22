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
var sqlite_tool = new (require('./sqlite_tool.js'))();
var fs = require('fs');
function ReadSQLite () {
  var table;
  var $  = require('jquery-deferred');
  var BIG = {
  NONE: 0,
  ROW: 1,
  COLUMN: 2,
  BOTH: 3 
  };

  this.vts = function(wk_name) {
    var ret = [];
    if(wk_name) {
	ret = [wk_name];
    } else 
      if(this.name){
        ret = [this.name];
      }
    return ret;
  };
  this.asyn = function(options, entrance, filename) {
    if(filename.indexOf("::") !== -1){
       var fileinfo = filename.split("::"); 
       if(fileinfo.length == 2){
         this.name      = fileinfo[0];
	 this.query = fileinfo[1];
       }
    }
    var obj = options._context_._database_;
    var targerDir = entrance + "/" +obj.name + "/";

    if (this.query != undefined) {
       var deferred = $.Deferred();
       var response = {};
       var text, error, ret;       
       console.log(targerDir)
       console.log(this.name)
       console.log(this.query)
       ret = sqlite_tool.execute(targerDir, this.name, this.query);
       text = ret[0];
       error = ret[1];
       if (error == null) {
         response._table_ = {};
         response._table_.big = BIG.NONE;
         /*formatはcsvにしておく*/
         response._table_.format = "csv";
         response._table_.filled = text;
         deferred.resolve(response);      
       } else {
         console.log("error:"+error.message);
         deferred.resolve(generateErrorFormat(error.message));    
       }
    }
    function generateErrorFormat(message){ 
      var err_format = { _error_: {format: "_error_"}};
      err_format._error_.filled = message;
      return err_format;
    }
    return deferred.promise();
  };
}
module.exports = ReadSQLite;
