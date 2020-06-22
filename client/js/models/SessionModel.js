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
 * @desc stores the POST state and response state of authentication for user
 */
define([
  "js/app",
  "model/UserModel"
], function (app, UserModel) {

  var SessionModel = Backbone.Model.extend({

      // Initialize with negative/empty defaults
      // These will be overriden after the initial checkAuth
      defaults: {
        logged_in: false
      },

      initialize: function () {
        _.bindAll(this, 'checkAuth', 'postAuth');

        // Singleton user object
        // Access or listen on this throughout any module with app.session.user
        this.user = new UserModel({});
        // Access or listen on this throughout any module with app.session.count
        this.count = 0;
      },

      url: function () {
        return app.API + '/auth';
      },

      //Fxn to update user attributes after recieving API response
      updateSessionUser: function (userData) {
        this.user.set(_.pick(userData, _.keys(this.user.defaults)));
      },

      /* * Check for session from API
         * The API will parse client cookies using its secret token
         * and return a user object if authenticated
      */
      checkAuth: function(callback, args) {
        var self = this;
        this.fetch({
          success: function (mod, res) {
            if (!res.error && res.user) {
              self.updateSessionUser(res.user);
              self.set({ logged_in : true });
              if ('success' in callback) {
                  callback.success(mod, res);
              }
            } else {
                self.set({ logged_in : false });
                if('error' in callback) {
                  callback.error(mod, res);
                }
              }
            },

            error:function(mod, res) {
              self.set({ logged_in : false });
              if('error' in callback) callback.error(mod, res);
            }
          })
          .done( function(data, textStatus, jqXHR){
              if('complete' in callback) callback.complete();
          })
          .fail( function(jqXHR, textStatus, errorThrown) {
              console.error(errorThrown);
          });
        },

      /*
         * Abstracted fxn to make a POST request to the auth endpoint
         * This takes care of the CSRF header for security, as well as
         * updating the user and session after receiving an API response
      */
      postAuth: function(opts, callback, args) {
            var self = this;
            var postData = _.omit(opts, 'method');
            $.ajax({
                url: this.url() + '/' + opts.method,
                contentType: 'application/json',
                dataType: 'json',
                type: 'POST',
                data:  JSON.stringify(postData),
                success: function(res){
                  console.log(res);
                  if(!res.error ){
                        if(_.indexOf(['login'/*, 'signup'*/], opts.method) !== -1){
                            self.updateSessionUser( res.user || {} );
                           self.count = res.count;
                            self.set({ logged_in: true });//_.extend(postData,{ logged_in: true }));
                        } else {
                            self.set({ logged_in: false });//_.extend(postData,{ logged_in: false }));
                        }
                        if(callback && 'success' in callback) callback.success(res);
                    } else {
                        if(callback && 'error' in callback) callback.error(res);
                    }
                },
                error: function(mod, res){
                    if(callback && 'error' in callback) callback.error(res);
                }
            }).complete( function(){
                if(callback && 'complete' in callback) callback.complete(res);
            });
        },

        login: function(opts, callback, args){
            this.postAuth(_.extend(opts, { method: 'login' }), callback);
            Backbone.history.navigate('/', {trigger:false, replace: false});
        },

        logout: function(opts, callback, args){
            this.postAuth(_.extend(opts, { method: 'logout' }), callback);
            Backbone.history.navigate('/', {trigger:false, replace: false});
            //clear data in element
        },

        signup: function(opts, callback, args){
            this.postAuth(_.extend(opts, { method: 'signup' }), callback);
        },

        removeAccount: function(opts, callback, args){
            this.postAuth(_.extend(opts, { method: 'remove_account' }), callback);
        }

    });

    return SessionModel;
});

