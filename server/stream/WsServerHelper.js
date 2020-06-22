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

define(['socket.io-client', 'jquery-deferred'], function (socketio, $) {
  var myclass = function (url, options) {

    this.requestId = 0;
    this.requests = {};
    this.socket = socketio(url, options);

    var that = this;
    that.socket.on('connect', function () {

      that.socket.on('request', function (request) {
        var method = request.method,
          func = that.RPCS[method];
        if (func) {
          func(request.payload)
            .done(function (result) {
              that.socket.emit('response', {
                payload: result,
                requestId: request.requestId
              });
            })
            .fail(function　(error)　{
              that.socket.emit('response',　{
                error: 'Calling' + method + 'failed:' + error,
                requestId: request.requestId
              });
            });
        } else {
          that.socket.emit('response', {
            error: 'Unkonwn method:' + method,
            requestId: request.requestId
          });
        }
      }); //request end

      that.socket.on('response', function　(response) {
        var deferred = that.requests[response.requestId];
        if (response.error) {
          deferred.reject(response.error);
        } else {
          deferred.resolve(response.payload);
        }
        delete that.requests[response.requestId];
      }); //response end

      that.socket.on('notify', function　(response) {
        var method = request.method,
          func = that.NTFS[method];
        if (func) {
          func(request.payload);
        } //if end
      }); //notify end

      that.socket.on('disconnect', function () {
        that.disconnect();
      }); //response end
    }); //connect end
  };//my class end

  myclass.prototype.request = function (method, payload) {
    var that = this;
    var deferred = this.requests[this.requestId] = $.Deferred();
    if (that.socket) {
      that.socket.emit('request', {
        method: method,
        requestId: that.requestId,
        payload: payload
      });
      that.requestId = (that.requestId > 1000000) ? 0 : that.requestId + 1;//next requestId
      return deferred.promise();
    } else {
      return deferred.reject('No socket connection !').promise();
    }
  };

  myclass.prototype.disconnect = function () { //donot use this assp
    if (this.socket) {
      this.socket.disconnect();
    }
    this.socket = null;
    this.requestId = 0;
    this.requests = {};
  };


  //here is to extend RPCS methods
  myclass.prototype.RPCS = {};
  myclass.prototype.RPCS.echo = function (payload) {
    if (payload) {
      return $.Deferred().resolve(payload).promise();
    } else {
      return $.Deferred().reject('No messsage to echo!').promise();
    }
  };

  myclass.prototype.notify = function (method, payload) {
    if (this.socket) {
      this.socket.emit('notify', {
        method: method,
        payload: payload
      });
    }
  };

  //here is to extend NOTIFY methods
  myclass.prototype.NTFS = {};
  //merge the progressive data into old data
  myclass.prototype.NTFS.progressive = function (payload) {
    if (payload) { //{mid: modelId, myData}
      return payload;
    }
  };

  //replace old data with the new data
  myclass.prototype.NTFS.update = function (payload) {
    if (payload) { //{mid: modelId, myData}
      return payload;
    }
  };

  return myclass;

});
