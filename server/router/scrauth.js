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


module.exports.path = '/api/scrauth';
module.exports.create = function (db) {
  var express = require('express');
  var router = express.Router();
  var  _ = require("underscore");
  
  // Create our users table if it doesn't exist
  db.run("CREATE TABLE IF NOT EXISTS scrauth ( " +
         "screenId TEXT NOT NULL, userId TEXT NOT NULL DEFAULT '*' )");
 
  //firstly, make sure the req.body.screenId is created by req.signedCookies.user_id
  //if yes then insert the access authority for the screenId and specified req.body.userId,
  function insertAccess(loginUserId, screenId, userId) {

    db.get("SELECT * FROM screen WHERE user = ? AND id =?", [loginUserId, screenId], //have the authority
      function(err, row) {
        if (err) {
          //res.status(500).send({ error: "Error when adding access authority for screen: " + req.body.screenId });
        } else {
          if(row) {
            db.run("INSERT INTO scrauth(screenId, userId) VALUES (?, ?)",
            [ screenId, userId ], function(err) {
              if(err) {
                //res.status(500).send({ error: "Faild to add access authority for screen: " + req.body.screenId });
              } else {
                //res.json({ success: "User is successfully added." });
              }
            });
          } else {
             //res.status(500).send({ error: "Can't insert access authority for screen created by others."});
          }
      }
    });
  }


  //firstly, make sure the req.body.toolId is created by req.signedCookies.user_id
  //if yes then delete the access authority for the toolId and specified req.body.userId
  function deleteAccess(loginUserId, screenId, userId) {
     db.get("SELECT * FROM screen WHERE user = ? AND id =?  ",  [loginUserId, screenId],
      function(err, self_created_screen) {
        if (err) {
          //res.status(500).send({ error: "Failed to find self-created screen: " + screenId });
        } else {
          if(self_created_screen) {
            db.run("DELETE FROM scrauth WHERE userId = ? and screenId=?", [userId, screenId],
            function(err) {
              if(err) {
                //res.status(500).json({ error: "Error while trying to delete access authority." }); 
              } else {
                //res.json({ success: "access authority is successfully deleted." });
              }
             });
          } else {
            //res.status(500).send({ error: "Can't delete access authority created by others. " });
          }  
      }
    });
  }

  function setSharedUserWithScreen(req, res) {
    var user = req.body.user;
    
    db.get("SELECT * FROM scrauth WHERE screenId =? AND userId = ? ",  [req.body.screenId, user.userId], 
      function(err, existed_in_scrauth) {
        if (err) {
           res.status(500).send({error: err.message});
        } else {
          if(existed_in_scrauth) {
            if(!(+user.shareFlag)) {
              deleteAccess(req.signedCookies.user_id, req.body.screenId, user.userId);
            }
          } else {
            if(+user.shareFlag) {
              insertAccess(req.signedCookies.user_id, req.body.screenId, user.userId);
            }
          }
          res.json({ success: "successfully set screen authority " });
        }
    }); 
  }
  

  function getSharedUsersWithScreen(req, res) {
    db.all("SELECT userId FROM scrauth WHERE screenId = $screenId", 
       { $screenId: req.query.screenId}, function(err, rows) {
        if (err) {
            console.error(err);
            res.status(500).send({error: err.message});
        } else {
            res.send({users: rows});
        }
      });
  }

  // GET /api/scrauth/check
  // @desc: checks a access status based on session (userId, screenId)
  // in: userId, screenId 
  // out: access --> session
  router.get('/check', function(req, res) {
    db.get("SELECT * FROM scrauth WHERE (userId=? OR userId='*') AND screenId= ?", 
           [ req.signedCookies.user_id, req.signedCookies.screen_id ], function(err, row){
      if(row) {
        console.log("PASS AAA");
        res.json();
      } else {
        res.status(500).json({ error: "Client has no valid access cookies."  });
      }
    });
  });

  // POST /api/scrauth/add
  // @desc: add/create access authority
  router.post('/add', function(req, res) {
          if(req.body.userId && req.body.screenId) {
            db.get("SELECT * FROM scrauth WHERE userId = ?", 
                [ req.body.userId], function(err, row) {
              if(row) {
                //updateAccess(req, res);
              } else {
                insertAccess(req,res); 
              }
            }); //db.get end
          } else {
             res.status(500).send({ error: "Not enough parameters to add access authority." });
          }
  });

  // POST /api/auth/logout
  // @desc: user, clearing the signed cookies for access authority, used to unselect tool in GUI
  router.post("/clear", function(req, res) {
   db.get("SELECT * FROM scrauth WHERE userId = ? AND screenId = ?", 
           [ req.signedCookies.user_id, req.signedCookies.screen_id ], function(err, user) {
        if(user) {
          res.clearCookie('screen_id');
          res.json({ success: "User successfully cleared access authority." });
        } else {
          res.json({ success: "No need to clear access authority again." });
        }
    });
  });

  // POST /api/auth/remove
  // @desc: deletes a access authority from scrauth table
  router.post("/remove", function(req, res) {
     //deleteAccess(req, res);
  });
  
  // POST /api/auth/remove
  // @desc: deletes a access authority from scrauth table
  router.post("/user", function(req, res) {
    console.log("PASS BBB");
     setSharedUserWithScreen(req, res);
  });

  router.get("/users", function(req, res) {
     getSharedUsersWithScreen(req, res);
  });

  return router;
};
