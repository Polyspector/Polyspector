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
module.exports.path = '/api/auth';
module.exports.create = function (db) {
  var express = require('express');
  var router = express.Router();
  var bcrypt  = require("bcrypt-nodejs");
  var  _ = require("underscore");
  var super_user_id  = global.config.get('FrontEnd.superuser.id'),
      super_user_pwd = global.config.get('FrontEnd.superuser.password');
  var child_process = require('child_process');
  
  // Create our users table if it doesn't exist
  db.run("CREATE TABLE IF NOT EXISTS user (" +
         "id TEXT UNIQUE PRIMARY KEY, password TEXT, token TEXT UNIQUE)");
 
  // Create superuser manager if not-existed in order to manage users
  db.get("SELECT * FROM user WHERE id = ? ",  [ super_user_id ],  function(err, user){
      var saltseed = bcrypt.genSaltSync(8);
      if(!user) {
         db.run("INSERT INTO user(id, password, token) VALUES ('"+
            super_user_id + "','" +
            bcrypt.hashSync(super_user_pwd, saltseed) + "','" +
            saltseed + "')" );
      } else {
        if( !bcrypt.compareSync(super_user_pwd, user.password)){ //update password
            db.run("UPDATE user SET password= ? WHERE id= ?",
              [bcrypt.hashSync(super_user_pwd, saltseed), super_user_id],  function(err){
              if(err) {
               console.log(err);
              }
            });
        }
      }
  });

  // GET /api/auth
  // @desc: check a user's auth status based on cookie
  router.get('/', function(req, res, next){
    db.get("SELECT * FROM user WHERE id = ? AND token = ?", 
           [ req.signedCookies.user_id, req.signedCookies.auth_token ], function(err, logined_user){
      if(logined_user) {
        res.json({ user: _.omit(logined_user, ['password', 'token']) });
      } else {
        res.json({ error: "Client has no valid login cookies."  });
      }
    });
  });

  // GET /api/auth
  // @desc: get user list
  router.get('/users', function(req, res){
    db.all("SELECT id FROM user", function(err, rows){
      if(rows){
        var  users= _.map(rows, function(row) {return row.id;});
        res.json({ users: users });
      } else {
        res.json({ error: "Failed to get user list."  });
      }
    });
  });

  // POST /api/auth/login
  // @desc: login with a userId and password
  router.post('/login', function(req, res){
    if(/*!_.isEmpty(req.body.screenid) &&*/ req.body.authid==='ldap') {
         res.redirect(307, '/ldap'); //307 will redirect with req parameters
    }
    else
    {
      db.get("SELECT * FROM user WHERE id = ?", [ req.body.userId ], function(err, user){
        if(user) {
          // Compare the POSTed password with the encrypted db password
          if( bcrypt.compareSync( req.body.password, user.password)) { //send back authenticated cookie values
              res.cookie( 'user_id',
                          user.id,
                          { signed: true, maxAge: global.config.get('Http.session.cookieMaxAge') } //options
                        );
              res.cookie( 'auth_token',
                          user.token,
                          { signed: true, maxAge: global.config.get('Http.session.cookieMaxAge')  } //options
                        );
              // Correct credentials, return the user object
              db.run("CREATE TABLE IF NOT EXISTS access_user (count INTEGER)");
              db.get("SELECT count(*) FROM access_user", function(err, count){
                if (count["count(*)"] == 0) {
                  db.run("INSERT INTO access_user (count) VALUES (0)");
                }
                db.get("SELECT count FROM access_user", function(err, resp){
                  db.run("UPDATE access_user SET count = count + 1");
                  console.log("PASS----", resp["count"]);
                  res.json({ user: _.omit(user, ['password', 'token']), count : resp["count"]});
                });
              });
          } else {
              // Username did not match password given
              res.status(500).send( {error: "Invalid username or password."});
          }
        } else {
          // Could not find the username
          res.status(500).send( {error: "Username does not exist."});
        }
      });
    }
  });

  // POST /api/auth/signup
  // @desc: add/create a new user
  router.post('/signup', function(req, res){
    db.serialize(function() {
      db.get("SELECT * FROM user WHERE id = ? AND token = ?", 
           [ req.signedCookies.user_id, req.signedCookies.auth_token ], function(err, logined_user) {
        if(logined_user && logined_user.id =='admin') { //only admin can add new user
          // Retrieve the inserted user data
          db.get("SELECT * FROM user WHERE id = ?", [ req.body.userId ], 
            function(err, user){
              if(user) {
                res.status(500).send({ error: "User ID has been taken:"+ req.body.userId });
              } else {
                var saltseed = bcrypt.genSaltSync(8);
                db.run("INSERT INTO user(id, password, token) VALUES (?, ?, ?)", //token is saltseed for the user
                [ req.body.userId, bcrypt.hashSync(req.body.password, saltseed), saltseed ], function(err, rows){
                  if(err) {
                    res.status(500).send({ error: "Failed to add user:"+ req.body.userId });
                  } else {
                    res.json({ success: "User is successfully added." });
                  }
                });
              }
          });
        } else {
          res.status(500).send({ error: "Havn't enough access authoritation to add user:" + req.body.userId }); 
        }
     }); //db.get end
    });
  });


  // POST /api/auth/signup
  // @desc: update password of an user
  router.post('/update', function(req, res){
    db.serialize(function() {
      db.get("SELECT * FROM user WHERE id = ? AND token = ?", 
           [ req.signedCookies.user_id, req.signedCookies.auth_token ], function(err, logined_user) {
        if(logined_user) {
          db.run("UPDATE user SET password=? WHERE id=?", //token is salt seed for the user
          [ bcrypt.hashSync(req.body.password, req.signedCookies.auth_token), req.signedCookies.user_id ], function(err){
            if(err) {
              res.status(500).send({ error: "update password  failed for user:"+ req.signedCookies.user_id });
            } else {
              res.json({ success: "Password is successfully updated." }); 
            }
          });
        } else {
          res.status(500).send({ error: "Havn't found the current signed user:" + req.signedCookies.user_id }); 
        }
     }); //db.get end
    });
  });


  // POST /api/auth/logout
  // @desc: logs out a user, clearing the signed cookies
  router.post("/logout", function(req, res) {
   db.get("SELECT * FROM user WHERE id = ? AND token = ?", 
           [ req.signedCookies.user_id, req.signedCookies.auth_token ], function(err, logined_user) {
        if(logined_user) {
          res.clearCookie('user_id');
          res.clearCookie('auth_token');
          res.json({ success: "User successfully logged out." });
        } else {
          res.json({ success: "No need to logout again." });
        }
    });
  });

  // POST /api/auth/remove_account
  // @desc: deletes a user (only administrator can delete a user)
  router.post("/remove", function(req, res) {
    db.serialize(function() {
     db.get("SELECT * FROM user WHERE id = ? AND token = ?", 
           [ req.signedCookies.user_id, req.signedCookies.auth_token ], function(err, logined_user) {
        if(logined_user && logined_user.id =='admin' && req.body.user !== 'admin') {
          db.run("DELETE FROM user WHERE id = ?", [ req.body.user ],
            function(err) {
              if(err) {
                res.status(500).json({ error: err.message }); 
              } else {
                res.json({ success: "User is successfully deleted." });
                deleteSharedAccessOfUser(req.body.user);
                deleteStatusOfUser(req.body.user);
              }
            });
        } else {
           res.status(500).send({ error: "Havn't enough access authoritation to delete user:" + req.body.user }); 
        }
      });
    });
  });//serialize end

 function deleteSharedAccessOfUser (user) {
   db.run("DELETE FROM access WHERE EXISTS (SELECT * FROM access WHERE userId = ?)", [ user ], function(err){
      if(err) {
        console.log(err);
      }
   });
 }

 function deleteStatusOfUser (user) {
   db.run("DELETE FROM status WHERE EXISTS( SELECT * FROM status WHERE user = ?)", [ user ], function(err){
      if(err) {
        console.err(err);
      }
   });
 }
 
 return router;
};
