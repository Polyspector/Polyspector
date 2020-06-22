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
require('../../util/wrapperConsoleForLog4js.js')
var amqp = require('amqplib');
var config = require('config') ;
var fs = require('fs');
var callback = new (require('./ReadSQLite.js'))();
var dataPath = new(require('../utils/dataPath'))(); 
var entrance = dataPath.getDataPath();
var pathLib = require('path');

var sqlite_tool = new (require('./sqlite_tool.js'))();
var queryTool = new (require('./queryTool.js'))();
function collector (path) {
  var sqliteFiles = [];
  var files = [];  
  getSQLiteFiles();
  sqliteFiles.forEach(function (sqliteFile) {
    var schemaObj = sqlite_tool.getSchemaObject(entrance+"/__template__/", sqliteFile);
    Object.keys(schemaObj).forEach(function(key) {
      var queries = queryTool.getMatchedQueriesFromSchema(key, schemaObj[key]);
      queries.forEach(function (query) {
        files.push(sqliteFile + "::" + query);
      });
    });
  });
  return files;
  function getSQLiteFiles() {
      var list = fs.readdirSync(entrance+"/__template__/"); //get all contents under path
      for(var i=0; i<list.length; i++){
	  var fullPath = path + "/__template__/" + list[i];
	  try{
	      var st = fs.statSync(fullPath);
	      if(st.isFile()){
		  var ext = list[i].split('.').pop().toLowerCase();
		  if(ext==='csv' || ext==='tsv'
		     || ext==='db' || ext ==='sqlite3') {
		      sqliteFiles.push(list[i]);
		  }
	      }
	  } catch(e) {
	      console.log("error:"+e.message);
	  }
      }  
      return sqliteFiles;
  }
}

var mq_host = (config.has('RabbitMQ.server.host'))? config.get('RabbitMQ.server.host') : 'localhost',
    mq_port = (config.has('RabbitMQ.server.port'))? config.get('RabbitMQ.server.port') : 5672,
    mq_user = (config.has('RabbitMQ.server.user'))? config.get('RabbitMQ.server.user') : 'guest',
    mq_password =(config.has('RabbitMQ.server.password'))? config.get('RabbitMQ.server.password') : 'guest',
    mq_server = 'amqp://'+ mq_user+':'+mq_password + '@'+mq_host+ ':'+ mq_port;

amqp.connect(mq_server).then(function (conn) {
  return conn.createChannel().then(function (ch) {
    var fs = require('fs');
    var mqBackend = new (require('../utils/MqBackend'))(ch);
    setInterval(function(){
    mqBackend.starts('TABLE', entrance, collector(entrance), callback);    
	}, 6000);
  });
}).then(null, console.warn);
