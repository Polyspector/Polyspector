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
 * Main app initialization and initial auth check
 */
require(["js/app", "js/router", "model/SessionModel"],
        function(app, WebRouter, SessionModel) {

    // Just use GET and POST to support all browsers
    Backbone.emulateHTTP = true;//

    // Create a new session model and scope it to the app global
    // This will be a singleton, which other modules can access
    app.session = new SessionModel({});

    app.router = new WebRouter();

    // HTML5 pushState for URLs without hashbangs
    var hasPushstate = !!(window.history && history.pushState);
    if(hasPushstate){
         Backbone.history.start({ pushState: true, root: '/' });
    }
    else {
        Backbone.history.start();
    }
});


