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

var _ = require('underscore');
var HistoryDB = function() {
  var self = this;
  var host = global.config.has('History.server.host')? global.config.get('History.server.host') : 'localhost',
      port = global.config.has('History.server.port')? global.config.get('History.server.port') : 27017,
      database = global.config.has('History.server.database')? global.config.get('History.server.database'): 'vispla';
  
  var db = require('monk')(host +':'+  port + '/' +  database);
  self.collection = db.get("logs");
  db.catch(function(err) {
    self.collection = null;
  });
};

HistoryDB.prototype.log= function(req) {
  if(this.collection ) {
    var save = _.omit(req.body, '_id');
    if(_.isEmpty(save)) {
      console.log('NULL request !!');
    } else {
      save.current_date = new Date(); 
      this.collection.insert(save, {castIds: false}, function(err, res) {
        if (err) throw err;
        console.debug(save);
      });
    }
  }
}

module.exports = HistoryDB;
