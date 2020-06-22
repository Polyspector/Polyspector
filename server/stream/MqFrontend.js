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

function MqFrontend(host) {
  //private members (static variables once initialized)
  var self = this;
  var uuid = require('uuid'),
      _ = require('underscore'),
      when = require('when');
  var requests = {};
  //pubic members
  this.LRUinterval = 5000;//5 seconds
  this.LRUcount = 10000;//10 seconds
  this.LRU4vts = {};
  this.vts = {
    ADVANCED: {},
    TABLE: {},
    TREE: {},
    STREAM: {}
  };
  // TODO
  this.timestamp_vts = {
    ADVANCED: {}
  }
  setInterval(this.clearStopedVTS.bind(this), this.LRUinterval); //check and clear vts
  this.channel = require('amqplib').connect(host).then(function (conn) {
      this.connection = conn;
      return conn.createChannel();
  });

  this.close = function() {
    if(this.connection) {
      this.connection.close();
    }
  };

  this.aftprocess = function (ch, msg) {
    if(msg) {
      var defer = requests[msg.properties.correlationId];
        if(defer) { //request from me
          //console.log(msg.content.slice(0,100));
          defer.resolve(msg.content);
          delete requests[msg.properties.correlationId];
          ch.ack(msg, false);
        } else { //not my messsage, return it to broker(mq)
          ch.nack(msg, false, true);
        }
    }
  };

  //publisher (rpc)
  this.request = function (wvt_name, options) { //wvt_name should be wk_name.vt_name
    var uid = uuid(); //request id
    var toBeAnswered = requests[uid] = when.defer();
    var ex = "topic_rpc";
    if (self.channel) {
      return self.channel.then(function (ch) { //socket between frontend <--> MQserver
        var ok = ch.assertQueue('__rpc__.'+ wvt_name/*, {exclusive: true}*/) //response queue with routing_key
          .then(function (qok) { return qok.queue; });
        ok = ok.then(function (queue) {
          return ch.consume(queue, function(msg){ self.aftprocess(ch, msg);}, {noAck: false}) //noAsk=false  will assure correct response with multiple frontend?
            .then(function () {
              return queue;
            });
        });
        ok = ok.then(function (queue) {
          ch.assertExchange(ex, 'topic', {durable: false});
          //console.log('------------------------------'+ JSON.stringify(options));
          ch.publish(ex, wvt_name, options/*new Buffer((options)? JSON.stringify(options): "{}")*/, { //request ex + routing_key
            correlationId: uid,
            replyTo: queue,
            vt: wvt_name
          });
          return toBeAnswered.promise;
        });
        return ok;
      });
    } else {
      toBeAnswered.reject('No Message Queue channel connection!');
      return toBeAnswered.promise;
    }
  };

  //get virtual table notify event
  this.channel.then(function (ch) {
    let ex = 'vt_adding';

    ch.assertExchange(ex, 'fanout', {durable: false});
    ch.assertQueue('', {exclusive: true}).then( function(qok) {
      ch.bindQueue(qok.queue, ex, '');
      ch.consume(qok.queue, function(recvMsg){
        //this.assert.equal('application/json', recvMsg.properties.contentType);
        //console.log('vt name=' + recvMsg.content.toString('utf8'));
        let vparam = JSON.parse(recvMsg.content);
        if(vparam.type) {
          currentDate = new Date();
          //console.log("# channle notify  #" + vparam.type+"#"+ vparam.value+"#"+vparam.name);
          //console.log(self.vts)

          let name = vparam.name;
          let val = vparam.value;
          let category = vparam.type;
          let key = vparam.type;
          let merger = _.union;

          if(!['TABLE','TREE','STREAM','ADVANCED'].includes(category)){ // for direct select in ADVANCED
            category = "ADVANCED";
            val = { [key]: vparam.value };
          }

          if(category == "ADVANCED"){ // setup custom merger
            merger = function(a,b){
              for(let k in b){
                if(k in a){
                  a[k] = _.union(a[k], b[k]);
                }else{
                  a[k] = b[k];
                }
              }
              return a;
            }
          }

          if( (name in self.vts[category]) && (currentDate - self.LRU4vts[name]) <= self.LRUcount){
            self.vts[category][name] =  merger(self.vts[category][name], val);
          }else{
            self.vts[category][name] = val;
          }
          self.LRU4vts[name] = new Date();
        }
      }, {noAck: true});
    });
  });
}

MqFrontend.prototype.registerUpdatingDataCB = function (callback) {
  var that = this;
  that.channel.then(function (ch) {
    var qname = 'data_updating';
    var ok = ch.assertQueue(qname, {durable: false});
    ok = ok.then(function (qok) {
      return ch.consume(qname, callback, {noAck: true});
    });
  });
};

//send logMessage notify event
MqFrontend.prototype.notify = function (severity, payload) {
  var that = this;
  var exname = 'log';
  if (that.channel) {
    that.channel.then(function (ch){
      ch.assertExchange(exname, 'topic')
        .then(function(){
          ch.publish(exname, severity, payload);
        });
    });
  }
};

MqFrontend.prototype.clearStopedVTS = function () {
  var self  = this,
      index = -1,
      currentDate = new Date();
  Object.keys(this.LRU4vts).forEach( function(wkname) {
    if((currentDate - self.LRU4vts[wkname]) > self.LRUcount) {
      delete self.vts.TABLE[wkname];
      delete self.vts.TREE[wkname];
      delete self.vts.STREAM[wkname];
      delete self.vts.ADVANCED[wkname];
      delete self.LRU4vts[wkname];
    } //delete by LRU conditions
  });
};

module.exports =  MqFrontend;
