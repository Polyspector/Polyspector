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


module.exports = function(db) {
  var  _ = require("underscore");

  var screen_SQLs ={ 
              width: "width INTEGER DEFAULT 0",
	            height: "height INTEGER DEFAULT 0",
	            timeout: "timeout INTEGER DEFAULT 0",
              interval: "interval INTEGER DEFAULT 0",
              tag: "tag INTEGER default 0",
	            responsive: "responsive INTEGER DEFAULT 0"
      },
      
      chart_SQLs = {
        timer: "timer TEXT default '{}'",
        hybridRefiner: "hybridRefiner TEXT default '{}'",
        libtype: "libtype TEXT default '' "
      };
  
  //▼pateh for db update ---add columns responsize, 
  db.serialize(function () {
    /*db.all('PRAGMA table_info(screen)', function(err, ocolumns) {
      if(err) {
          console.log(err);
        } else {
          var columns = ocolumns.map(function(ocolumn){return ocolumn.name;});
          columns = _.difference(Object.keys(screen_SQLs), columns);
          columns.forEach(function(column) {
            db.run("ALTER TABLE screen ADD COLUMN " + screen_SQLs[column], function(){});  
          });
        }
      }
    );*/
    
    db.all('PRAGMA table_info(chart)', function(err, ocolumns) {
      if(err) {
          console.log(err);
        } else {
          //db.run("ALTER TABLE chart RENAME COLUMN vttype TO libpath");  
          let columns = ocolumns.map(function(ocolumn){return ocolumn.name;});
          columns = _.difference(Object.keys(chart_SQLs), columns);
          columns.forEach(function(column) {
            db.run("ALTER TABLE chart ADD COLUMN " + chart_SQLs[column]);
          });
          
        }
      }
    );

  });
　//▲pateh for db update ---add columns responsize, 

};
