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
function MyClass () {

  //private members ( static variables)
  var fs   = require('fs');
  var path = require('path');
  var $    = require('jquery-deferred');

  //public member for asyn call
  this.vts = function(wk_name) {
      return [wk_name];
  };

  this.asyn = function(options, dataPath) {
    console.log('request options:  ' + JSON.stringify(options)  );
    console.log('data path      :  ' + dataPath );
    var vt = {}, data = { list:[] };
    var deferred = $.Deferred();
    var fullPath, st, isAllFolders = false;

    fullPath = path.join(dataPath, '__template__');
    try {
        st = fs.statSync(fullPath);
        if(st.isFile()) {
          var json = JSON.parse(fs.readFileSync(fullPath));
          if(json.subfolder && json.subfolder.trim() !=="*" ) {
            data.list = (json.subfolder.constructor === Array)? json.subfolder: [];
          } else {
            isAllFolders = true;
          }
        }
    } catch(e) { //if no template, search only for current folder
        console.log("error:" + e.message);
        isAllFolders = true;
    }
    if(isAllFolders) {
      try { //all sub folder
        var list = fs.readdirSync(dataPath), st, fullPath;
        for(var i=0; i<list.length; i++){
            fullPath = path.join(dataPath, list[i]);
            st = fs.statSync(fullPath);
            if(st.isDirectory(fullPath) && list[i] !== "__template__" && list[i] !== "__big__" ) {
              data.list.push({
                name          : list[i],
                modified_time :st.mtime
              });
            }
        }
      } catch(e) {
          console.error(e.message);
      } finally {
        if(data.list.length <=0) { //data is under the current folder 
          st = fs.statSync(dataPath);
          data.list.push({
            name: '.',
            modified_time :st.mtime
          });
        }
      }
    }
    vt.format = 'json';
    vt.filled = data;
    deferred.resolve(vt);
    return deferred.promise();
  };
}

module.exports = new MyClass();
