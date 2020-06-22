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

function RunScript(){
  var BIG = {
    NONE   : 0,
    ROW    : 1,
    COLUMN : 2,
    BOTH   : 3
  };
  var ext2cmd = {
    ".rb" : "ruby",
    ".js" : "node",
    ".sh" : "sh"
  };
  var fs = require('fs');
  var $  = require('jquery-deferred');
  var path = require("path");
  //public member for asyn call
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
  this.asyn = function(options, entrance, scriptname) { //scriptname is wk_name
    this.name = scriptname;
    console.log("[INFO] : Receive Request @ WorkerName :: " +  this.name);
    console.log('[INFO] : request options:  ' + JSON.stringify(options)  );

    var deferred = $.Deferred();
    var response = {};
    var exec = require('child_process').execSync;
    var tmp  = require('tmp');
    var StringDecoder = require('string_decoder').StringDecoder;
    var decoder = new StringDecoder('UTF-8');

    console.log("[INFO] : " + entrance);
    console.log("[INFO] : " + scriptname);
    if(ext2cmd[path.extname(scriptname)] !== undefined){
      var tmpobj = tmp.fileSync({postfix:".json"});
      var command = "echo '" + JSON.stringify(options) + "' > " + tmpobj.name + ";";
      command += ext2cmd[path.extname(scriptname)] +
        " " + __dirname + "/VirtualTable/"+ scriptname +
        " " + entrance   +
        " " + tmpobj.name +
        " ; rm -f " + tmpobj.name;
      console.log("[INFO] : " + command);
      var result = exec(command);
      response._table_ = {};
      response._table_.big = BIG.BOTH;
      response._table_.format = "csv";
      response._table_.filled = decoder.write(result);
      deferred.resolve(response);
    }else{
      response._error_= {};
      response._error_ .format = "json";
      response._error_ .filled = "Worker ERROR";
      deferred.reject(response);
    }
    return deferred.promise();
  };
}

module.exports = RunScript;
