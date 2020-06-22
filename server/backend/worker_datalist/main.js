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
//require('../util/wrapperConsoleForLog4js.js')
var amqp = require('amqplib');
var config = require('config') ;
var dataPath = new(require('../utils/dataPath'))(),
    entrance = dataPath.getDataPath();
//var path = require("path");
var mq_host = (config.has('RabbitMQ.server.host'))? config.get('RabbitMQ.server.host') : 'localhost',
    mq_port = (config.has('RabbitMQ.server.port'))? config.get('RabbitMQ.server.port') : 5672,
    mq_user = (config.has('RabbitMQ.server.user'))? config.get('RabbitMQ.server.user') : 'guest',
    mq_password =(config.has('RabbitMQ.server.password'))? config.get('RabbitMQ.server.password') : 'guest',
    mq_server = 'amqp://'+ mq_user+':'+mq_password + '@'+mq_host+ ':'+ mq_port;
console.log(mq_server);


amqp.connect(mq_server).then(function (conn) {
  return conn.createChannel().then(function (ch) {
    var mqBackend = new (require('../utils/MqBackend'))(ch);
    mqBackend.create(entrance, require('./datalist'), 'datalist', 'datalist');
  });
}).then(null, console.warn);
