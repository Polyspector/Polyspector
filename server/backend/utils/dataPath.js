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
var fs = require('fs');
var path = require("path");
function dataPath() {
  this.getDataPath = function() {
    var entrance = path.join(__dirname, '..', 'data/');
    if (process.env.POLYSPECTOR_USER_DATA_PATH != undefined) {
      entrance = process.env.POLYSPECTOR_USER_DATA_PATH;
    } else {
      var fullpath =  path.join(__dirname , '..' , 'config.json');
      if (fs.existsSync(fullpath)) {
        var gconfig = JSON.parse( fs.readFileSync(fullpath, 'utf8') );
        if(gconfig.dataPath && gconfig.dataPath.trim().length>0) {
          entrance = gconfig.dataPath.trim();
        }
      }
    }
    console.log("Read data from " + entrance);
    return entrance;
  }
};

module.exports = dataPath;
