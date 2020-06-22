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
module.exports = MqBackend;

function MqBackend(ch) {
  const self = this;
  let msgpack = require('msgpack-lite');

  this.requestQueueList ={};
  
  this.starts_one_worker = function(chart_type, entrance, worker_folder, filenames, prepare_data_callback) {
    let _filenames = filenames;//.map(function(f){return f.replace(/\./g, '_');});

    if(chart_type) { //notify wtname and show on client screen
      self.notify(chart_type, worker_folder, prepare_data_callback.vts(_filenames));
    }

    if(!self.requestQueueList[worker_folder]) {
      self.create(entrance, prepare_data_callback, worker_folder, null); //file as worker name
    }
  };

  this.starts = function(chart_type, entrance, filenames, prepare_data_callback) {
    
    for(let filename of filenames) {
      var wk_name = filename.replace(/\./g, '_'); /*.csv to _csv*/
      if(chart_type) { //notify wtname and show on client screen
        self.notify(chart_type, wk_name, prepare_data_callback.vts(wk_name));
      }
      if(!self.requestQueueList[wk_name]) {
        self.create(entrance, prepare_data_callback, wk_name, filename); //file as worker name
      }
    }//for end
  };
  
  // nofifier
  this.notify = function(chart_type, wk_name, vts) {
     var ex =  'vt_adding',
         payload = {type: chart_type,  name: wk_name, value:vts};
     ch.assertExchange(ex, 'fanout', {durable: false});
     ch.publish(ex, '', new Buffer(JSON.stringify(payload)), {contentType: 'application/json'});
  };
  
  //wk_name is the name to difficiate workers, org_wk_name is the name to be used for querying data 
  this.create = function(entrance, prepare_data_callback, wk_name, org_wk_name) {
    //receive
    var queueOptions = { durable: false,
          autoDelete : true,
          exclusive: true,
          arguments  : { "x-message-ttl" : 20000 }
        };
    
    ch.assertExchange('topic_rpc', 'topic', { durable: false});
    ch.assertQueue('', queueOptions).then(function(qok) {
      //console.log('------------------- queue name['+ wk_name +']= '+ qok.queue);
      
    self.requestQueueList[wk_name] = qok.queue;
    ch.bindQueue(qok.queue, 'topic_rpc', wk_name +'.#'); //wk_name.vt_name
      return ch.consume(qok.queue, function(msg) {
        self.reply(msg, entrance, prepare_data_callback, org_wk_name);
      }, {noAck: true});
    });
  };
  
  this.reply = function(msg, entrance, prepare_data_callback, org_vt_name) {

    var result, obj_unknown_error = { _error_: 'unknown error in worker!' + org_vt_name };

    if(msg && msg.content) { //warning: delete a file will trigger reply with msg==null
       
      if(prepare_data_callback.syn) {
        result = prepare_data_callback.syn(msgpack.decode(msg.content) /*JSON.parse(msg.content.toString())*/, entrance, org_vt_name);
        
        if(typeof result !=='object') { 
          result = obj_unknown_error; 
        }
        ch.sendToQueue(msg.properties.replyTo,
              msgpack.encode(result), // new Buffer(JSON.stringify(result)),//use msgpack
              { correlationId: msg.properties.correlationId } 
        );
      } else if(prepare_data_callback.asyn) {
        prepare_data_callback.asyn(msgpack.decode(msg.content)/*JSON.parse(msg.content.toString())*/, entrance, org_vt_name)
          .done(function(jsondata) {
            result = (typeof jsondata ==='object')? jsondata : obj_unknown_error;
          })
          .fail(function(errordata){
            result = (typeof errordata ==='object' && 
                  (errordata._error_ || (errordata.format && errordata.format._error_ )))? errordata : obj_unknown_error;
          }).always(function(){
            ch.sendToQueue(msg.properties.replyTo,
              msgpack.encode(result), // new Buffer(JSON.stringify(result)),//use msgpack
              { correlationId: msg.properties.correlationId }
            );
          });
      }
      
      if(prepare_data_callback.clear) { //clear status
        prepare_data_callback.clear();
      }
    }
  };
}
