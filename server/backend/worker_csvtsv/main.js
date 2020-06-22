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

var amqp = require('amqplib'),
    config = require('config'),
    fs = require('fs'),
    path = require("path");

var mq_host = (config.has('RabbitMQ.server.host'))? config.get('RabbitMQ.server.host') : 'localhost',
    mq_port = (config.has('RabbitMQ.server.port'))? config.get('RabbitMQ.server.port') : 5672,
    mq_user = (config.has('RabbitMQ.server.user'))? config.get('RabbitMQ.server.user') : 'guest',
    mq_password =(config.has('RabbitMQ.server.password'))? config.get('RabbitMQ.server.password') : 'guest',
    mq_server = 'amqp://'+ mq_user+':'+mq_password + '@'+mq_host+ ':'+ mq_port;

var entrance = path.join(__dirname, '.', 'data/'),
    worker_folder = path.dirname(__filename).split(path.sep).pop(),
    callback = new (require('./ReadFile.js'))();

//collect the worker names
function collector (parentPath) {
    var files = [], fullPath, st, ext, noTemplate = false;
    fullPath = path.join(parentPath, '__template__');
    try {
        st = fs.statSync(fullPath);
        if(st.isFile()) {
          var content = fs.readFileSync(fullPath, 'utf8');
          var json = JSON.parse(content);
          files = (json.normal && json.normal.constructor === Array)? json.normal : [];
        }
    } catch(e) { //if no template, search only for current folder
        noTemplate = true;
    }

    if(noTemplate) { //get all contents under parent folder
      var list = fs.readdirSync(parentPath);
      list.forEach(function(file) {
        fullPath = path.join(parentPath, file);
        try {
          st = fs.statSync(fullPath);
          if(st.isFile()){
            ext = file.split('.').pop().toLowerCase();
            if(ext==='csv' || ext==='tsv') {
              files.push(file);
            }
          }
        } catch(e) {
          console.log("error:" + e.message);
        }
      });
  }

  return files;
}

amqp.connect(mq_server).then(function (conn) {
  return conn.createChannel().then(function (ch) {
    var mqBackend = new (require('../utils/MqBackend'))(ch);
    setInterval(function(){
      mqBackend.starts_one_worker('TABLE',
                                  entrance,
                                  worker_folder, //worker folder
                                  collector(entrance),
                                  callback);
    }, 3000);
  });
}).then(null, console.warn);
