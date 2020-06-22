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
 * @desc        backbone router for pushState page routing
 */

define([
  "js/app",
  "model/SessionModel",
  "model/UserModel",
  "view/IndexView"
], function(app, SessionModel, UserModel, IndexView){

    var WebRouter = Backbone.Router.extend({

        initialize: function(){
          _.bindAll(this, 'show', 'index');
        },

        routes: {
          "" : "index"
        },

        show: function(options){
            // Close and unbind any existing page view
            if(this.viewInstance) this.viewInstance.close();

            // Establish the requested view into scope
            this.viewInstance = new IndexView();

            //Render inside the page wrapper
            this.viewInstance.render();
        },

        index: function() {
          // Fix for non-pushState routing (IE9 and below)
          var hasPushState = !!(window.history && history.pushState);
          if(!hasPushState) {

            this.navigate(
              (window.location.pathname.length>1)? window.location.pathname.substring(1):'',
              {trigger: true, replace: true}
            );
          }
          else {
            this.show(); //no options??
          }
        }

    });
    return WebRouter;
});
