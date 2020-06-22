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
/**
 * @desc app globals
 */
define(['socketio'], function(sio) {

    var app = {
        root : "/",                     // The root path to run the application through.
        URL : "/",                      // Base application URL
        API : "/api",                   // Base API URL (used by models & collections)
        // Show alert classes and hide after specified timeout
        showAlert: function(title, text, klass) {
            $("#header-alert").removeClass("alert-danger alert-warning alert-success alert-info");
            $("#header-alert").addClass(klass);
            $("#header-alert").html('<button class="close" data-dismiss="alert">×</button><strong>' + title + '</strong> ' + text);
            $("#header-alert").show('fast');
            setTimeout(function() {
                $("#header-alert").hide();
            }, 7000 );
        }
    };

    //kind: init/close for CONTROL, screen/board for REQUEST
    //type: remotelink, streame
    app.sendByWebsocket = function (type, data) {
        if(!app.websocket || !app.websocket.connected) { //if not connected
            app.websocket = sio.connect(null, {reconnect: true});
            app.websocket.on('connect', function() {
              if(data) app.websocket.emit(type, data);
            });
            app.websocket.on('reconnect', function() {
              if(data) app.websocket.emit(type, data);
            });
        } else {
          if(data) app.websocket.emit(type, data);
        }
    };

    app.control ={}, //initialize control object
    app.sendByWebsocket('init:remotelink'); //connect websocket
    $.ajaxSetup({ cache: false });          // force ajax call on all browsers

    return app;

});
