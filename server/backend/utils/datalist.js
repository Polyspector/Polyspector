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
    var deferred = $.Deferred();
    var vt = {};
    // [GLOB] Project
    var data = {list:[]};
    try {
      var list = fs.readdirSync(dataPath);
      for(var i=0; i<list.length; i++){
        var fullPath = dataPath + list[i];
          var st = fs.statSync(fullPath);
          if(st.isDirectory(fullPath) && list[i] !== "__template__" ) {
            var tmp = {
              name          : list[i],
              modified_time : fs.statSync(fullPath).mtime
            };
	          console.log(list[i]);
            data.list.push(tmp);
          }
      }
    }catch(e){
        console.log("Show DIR " + __dirname);
        console.error(e.message);
        data.list.push({name:'dummy', modified_time: (new Date()).toLocaleDateString()});
    }
    vt.format = 'json';
    vt.filled = data;
    deferred.resolve(vt);
    return deferred.promise();
  };
}

module.exports = new MyClass();
