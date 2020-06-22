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

require('./util/wrapperConsoleForLog4js.js');
global.config = require('config') ;

var mq_host = (global.config.has('RabbitMQ.server.host'))? global.config.get('RabbitMQ.server.host') : 'localhost',
    mq_port = (global.config.has('RabbitMQ.server.port'))? global.config.get('RabbitMQ.server.port') : 5672,
    mq_user = (global.config.has('RabbitMQ.server.user'))? global.config.get('RabbitMQ.server.user') : 'guest',
    mq_password =(global.config.has('RabbitMQ.server.password'))? global.config.get('RabbitMQ.server.password') : 'guest',
    mq_server = 'amqp://'+ mq_user+':'+mq_password + '@'+mq_host+ ':'+ mq_port;
var http_port = process.env.PORT || ((global.config.has('Http.server.port'))? global.config.get('Http.server.port') : 8001);
var ws_port = (global.config.has('Ws.server.port'))? global.config.get('Ws.server.port') : 3000;

global.mqFrontend = new (require('./stream/MqFrontend'))(mq_server);

global.httpServer = new(require('./stream/HttpServer')) (__dirname, http_port );

global.wsServer = new (require('./stream/WsServer'))(global.httpServer.server);
