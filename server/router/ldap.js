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
module.exports.path = '/ldap';
module.exports.create = function (db) {
  var express = require('express');
  var router = express.Router();
  var  _ = require("underscore");
  
  var passport     = require('passport'),
      passport_init = passport.initialize(),
      LdapStrategy = require('passport-ldapauth');
  
  var OPTS = {
    usernameField: 'userId',
    passwordField: 'password',
    server:  global.config.has('ldap.server')? global.config.get('ldap.server'): 'localhost'
  };
 
  passport.use(new LdapStrategy(OPTS));

  router.post('/', passport_init,  function(req, res, next) {
    try {
      passport.authenticate('ldapauth', {session: false}, function(err, user, info) {
      
        if (err) {
          return res.status(500).send( {error: "Username does not exist."});
        }
        else if(!user) {
          return res.status(500).send( {error: "Username does not exist."});
        }
        else {
          res.cookie('user_id',
                          user.uid,
                          { signed: true, maxAge: global.config.get('Http.session.cookieMaxAge') } //options
                    );

          res.cookie('auth_token',
                          user.cn,
                          { signed: true, maxAge: global.config.get('Http.session.cookieMaxAge')  } //options
                    );
          // Correct credentials, return the user object
          return res.json({ user: {id: user.uid} });
        }
      })(req, res, next);//passport
    } catch (err) {
      return res.status(500).send( {error: "Unkonwn error!"});
    }
  });

  return router;
};
