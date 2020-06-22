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

if (typeof define !== 'function') { var define = require('amdefine')(module); }

var when = require('when');

var params = { durable: false,
            autoDelete : true,
            exclusive: true,
            arguments  : {
              "x-message-ttl" : 20000
            }
          };
          
define(['amqplib'], function (amqp) {
  var myclass = function (host) {
    
    var that = this;
    var options = { durable: false,
            autoDelete : true,
            exclusive: true,
            arguments  : {
              "x-message-ttl" : 20000
            }
          };
    
    this.requestId = 0;
    this.requests = {};
    
    that.channel = amqp.connect(host).then(function (conn) {
      return conn.createChannel();
    });
    
    //receive request event
    that.channel.then(function (ch) {
      var qname = 'request';
      var exname = 'request';
            
      var processing = function (reqmsg) {
        var func = that.findMethod(reqmsg.fields.routingKey);
        if (func) {
          func(reqmsg.content)
            .done(
              function　(result)　{
                ch.publish('response',
                           'topic',
                  result,
                  {correlationId: reqmsg.properties.correlationId}
                  ); //the result should be Buffer binary
              },
              function (error) {
                ch.publish('response',
                    'topic',
                    new Buffer('Calling ' + reqmsg.fields.routingKey + 'failed: ' + error),
                    {correlationId: reqmsg.properties.correlationId}
                  );
              }
            );
        }//if end
      };//processing definition end
      
      
      return when.all([
        ch.assertExchange(qname, 'topic'),
        ch.assertQueue(qname),
        ch.bindQueue(qname, exname, '#'),
        ch.consume(qname, processing, {noAck: true})
      ]);
      
    });
    
    //receive notify event
    that.channel.then(function (ch) {
      var qname = 'notify';
      var exname = 'notify';

      return when.all([
        ch.assertExchange(qname, 'topic'),
        ch.assertQueue(qname),
        ch.bindQueue(qname, exname, '#'),
        ch.consume(qname,
          function (msg) {
            var method = msg.fields.routingKey,
              payload = msg.content,
              func = that.findMethod(method);
            if (func) {
              func(payload);
            }//if end
          },
          {noAck: true})
      ]);
    });
  };

  myclass.prototype.findMethod = function (methodName) {
    return this.DEFERS.echo; //test
  };

  myclass.prototype.DEFERS = {};
  myclass.prototype.DEFERS.echo = function (content) {
    var d = when.defer();
    if (content) {
      setTimeout(function () {
        d.resolve(content);
      }, 1000);
    } else {
      d.reject('No messsage to echo !');
    }
    return d.promise;
  };
  myclass.prototype.NOTIFIES = {};

  //send request event
  myclass.prototype.request = function (method, payload, callback) {
    var that = this;
    var answer = this.requests[this.requestId] = when.defer();
    var onceFinished = function (msg) {
        var answer = that.requests[msg.properties.correlationId];
        if (msg.content.error) {
          answer.reject(msg.content.error);
        } else {
          answer.resolve(msg.content.payload);
        }
        delete that.requests[msg.properties.correlationId];
      };
    if (that.channel) {
      var qname = 'request',
        exname = 'request';
      var ok = that.channel.then(function (ch) {
          return when.all([
            ch.assertExchange(qname, 'topic'),
            ch.assertQueue(qname),
            ch.bindQueue(qname, exname, '#'),
            ch.consume(qname, onceFinished, {noAck: true})
          ]).then(function () {
            ch.sendToQueue(qname, payload, {correlationId: that.requestId, replyTo: qname});
            return answer.promise;
          });
        });
      return ok;
    } else {
      answer.reject('No socket connection !');
      return answer.promise;
    }
  };

  //send notify event
  myclass.prototype.notify = function (method, payload) {
    var that = this;
    if (that.channel) {
      that.channel.then(function (ch) {
        ch.assertExchange('notify', 'topic')
          .then(function　()　{
            ch.publish('notify', method, payload, {correlationId: that.requestId});
          });
      });
    }
  };
  
  return myclass;
});
