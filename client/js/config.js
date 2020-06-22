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

//define global debug flag
if ( (typeof DEBUG) === 'undefined') DEBUG = true;

requirejs.config({
  baseUrl: '../', //main.js's parent folder
  map: {
      '*': {
          //'css': 'assets/libs/css.min',
	  'css': 'assets/libs/require-css/css.min'
      }
  },
  paths: {
    //basic libs
    backbone    : 'assets/libs/backbone/backbone-min',
    text        : 'assets/libs/requirejs-text/text',
    underscore  : 'assets/libs/underscore/underscore-min',
    jquery      : 'assets/libs/jquery/dist/jquery.min',
    bootstrap   : 'assets/libs/bootstrap/dist/js/bootstrap.min',
    stickit     : 'assets/libs/backbone.stickit/backbone.stickit', //replace pass variable  to template:  try to use it
    parsley     : 'assets/libs/parsleyjs/dist/parsley.min',
    undo        : 'assets/libs/backbone-undo/Backbone.Undo',//try to use it locally
    moment      : 'assets/libs/moment/moment', //Parse, validate, manipulate, and display dates in JavaScript.
    d3          : 'assets/libs/d3/d3',
    socketio    : 'socket.io/socket.io',
    msgpack     : 'assets/libs/msgpack-lite/dist/msgpack.min',

    //compact paths
    lib         : 'assets/libs',
    model       : 'js/models',
    view        : 'js/views',
    tpl         : 'js/tpls',
    util        : 'js/utils',
    ctrl        : 'js/ctrls',
    vis         : 'VISUALIZATIONS',
    start       : 'js/main'
  },
  shim: {

    backbone: {
      deps: ['underscore', 'jquery'], exports: "Backbone" 
    },
    undo: { 
      deps: ['backbone'] 
    },
    stickit: {
      deps: ['backbone'] 
    },
  
    bootstrap: { 
      deps: ["jquery"]
    },
    
    socketio: {
      exports: 'io'
    },

    parsley : {
      deps: ['jquery']
    },
    /*crossfilter: {
      deps: [], exports: "crossfilter" 
    },*/
    start: {
      deps: [
        'd3',
        'moment',
        'underscore',
        'undo',
        'backbone',
        'stickit',
        'bootstrap',
        //'crossfilter'
      ],
    }
  }
});

require(['start'], function(){
  window.framework = window.framework || {};
  window.framework.mediator = _.extend({}, Backbone.Events);
  window.framework.context = {};
  window.framework.undoer = new Backbone.UndoManager({maximumStackLength : 30});
  
  var token = $('meta[name="csrf-token"]').attr('content');
  if (token) {
    var oldSync = Backbone.sync;
    Backbone.sync = function(method, model, options) {
      if(!options) { options = {};  }
      options.headers = { 'X-CSRF-Token': token };
      return oldSync(method,model,options);
    };
    $.ajaxSetup({
      beforeSend: function(xhr, settings) {
        xhr.setRequestHeader('X-CSRF-Token', token);
      }
    });
  } //if end

  //ajax-extent
  // use this transport for "binary" data type
  $.ajaxTransport("+binary", function(options, originalOptions, jqXHR) {
    // check for conditions and support for blob / arraybuffer response type
    if (window.FormData && ((options.dataType && (options.dataType == 'binary')) || (options.data && ((window.ArrayBuffer && options.data instanceof ArrayBuffer) || (window.Blob && options.data instanceof Blob))))) {
        return {
            // create new XMLHttpRequest
            send: function(headers, callback) {
                // setup all variables
                var xhr = new XMLHttpRequest(),
                    url = options.url,
                    type = options.type,
                    async = options.async || true,
                    // blob or arraybuffer. Default is blob
                    dataType = options.responseType || "blob",
                    data = options.data || null,
                    username = options.username || null,
                    password = options.password || null;

                xhr.addEventListener('load', function() {
                    var data = {};
                    data[options.dataType] = xhr.response;
                    // make callback and send data
                    callback(xhr.status, xhr.statusText, data, xhr.getAllResponseHeaders());
                });
                xhr.addEventListener('error', function() {
                    var data = {};
                    data[options.dataType] = xhr.response;
                    // make callback and send data
                    callback(xhr.status, xhr.statusText, data, xhr.getAllResponseHeaders());
                });

                xhr.open(type, url, async, username, password);

                // setup custom headers
                for (var i in headers) {
                    xhr.setRequestHeader(i, headers[i]);
                }

                xhr.responseType = dataType;
                xhr.send(data);
            },
            abort: function() {}
        };
    }
  });
  //ajax-extent

});
// Initialize the application with the main application file.

