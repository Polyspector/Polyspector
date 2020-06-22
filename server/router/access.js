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


module.exports.path = '/api/access';
module.exports.create = function (db) {
  var express = require('express');
  var router = express.Router();
  var  _ = require("underscore");

  // Create our users table if it doesn't exist
  db.run("CREATE TABLE IF NOT EXISTS access ( " +
         "toolId TEXT NOT NULL, userId TEXT NOT NULL DEFAULT '*', authority TEXT(5) NOT NULL DEFAULT 'read')");
 
  //firstly, make sure the req.body.toolId is created by req.signedCookies.user_id
  //if yes then insert the access authority for the toolId and specified req.body.userId,
  function insertAccess(req, res) {
    db.get("SELECT * FROM tool WHERE user = ? AND id =?", req.signedCookies.user_id, req.body.toolId,
      function(err, row) {
        if (err) {
          res.status(500).send({ error: "Error when adding access authority for tool: " + req.body.toolId });
        } else {
          if(row){
            db.run("INSERT INTO access(toolId, userId, authority) VALUES (?, ?, ?)",
            [ req.body.toolId, req.body.userId, req.body.authority ], function(err){
              if(err) {
                res.status(500).send({ error: "Faild to add access authority for tool: " + req.body.toolId });
              } else {
                res.json({ success: "User is successfully added." });
              }
            });
          } else {
             res.status(500).send({ error: "Can't insert access authority for tool created by others."});
          }
      }
    });
  }

  //firstly, make sure the req.body.toolId is created by req.signedCookies.user_id
  //if yes then insert the access authority for the toolId and specified req.body.userId
  function updateAccess(req, res) {

     db.get("SELECT * FROM tool WHERE user = ? AND id =?", req.signedCookies.user_id, req.body.toolId,
      function(err, row) {
        if (err) {
          res.status(500).send({ error: "Error when updating access authority for tool: " + req.body.toolId });
        } else {
          if(row) {
            db.run("UPDATE access SET authority=? WHERE userId=? AND toolId=?", //auth_token is saltseed for the user
              [ req.body.authority, req.body.userId, req.body.toolId ], function(err){
                if(err) {
                  res.status(500).send({ error: "update access failed for tool:"+ req.body.toolId });
                } else {
                  res.json({ success: "access authority is successfully updated." }); 
                }
            });      
          } else {
             res.status(500).send({ error: "Havn't enough authority to update access authority for tool: " + req.body.toolId });
          }
      }
    });
  }

  //firstly, make sure the req.body.toolId is created by req.signedCookies.user_id
  //if yes then delete the access authority for the toolId and specified req.body.userId
  function deleteAccess(req, res) {
     db.get("SELECT * FROM tool WHERE user = ? AND id =?  ",  req.signedCookies.user_id, req.body.toolId,
      function(err, self_created_tool) {
        if (err) {
          res.status(500).send({ error: "Failed to find self-created tool: " + req.body.toolId });
        } else {
          if(self_created_tool) {
            db.run("DELETE FROM access WHERE userId = ? and toolId=?", [ req.body.userId, req.body.toolId ],
            function(err){
              if(err) {
                res.status(500).json({ error: "Error while trying to delete access authority." }); 
              } else {
                res.json({ success: "access authority is successfully deleted." });
              }
          });
        } else {
          res.status(500).send({ error: "Can't delete access authority created by others. " });
        }  
      }
    });
  }

  function getToolNames(req, res) {
    if(req.body.userId ) {
      db.all("SELECT toolId FROM access WHERE userId = $user", 
             { $user: req.body.userId}, function(err, rows) {
          if (err) {
            console.error(err);
            res.status(500).send({error: err.message});
          } else {
            var tools = _.map(rows, function(row) {return row.toolId;});
            res.send({tools: tools});
          }
        });
    } else {
      var emsg = "incorrect query params( user="+req.body.userId +')';
      //errHandle(emsg);
      console.error(emsg);
      res.status(500).send({error: emsg});
    }
  }

  // GET /api/access
  // @desc: checks a access status based on session (userId, toolId)
  //in: userId, toolId 
  //out: access --> session
  router.get('/check', function(req, res) {
    db.get("SELECT authority FROM access WHERE (userId=? OR userId='*') AND toolId= ? ORDER BY authority DESC", 
           [ req.signedCookies.user_id, req.signedCookies.tool_id,  req.signedCookies.authority ], function(err, row){
      if(row) {
        res.json();
      } else {
        res.status(500).json({ error: "Client has no valid access cookies."  });
      }
    });
  });

  // POST /api/auth/signup
  // @desc: add/create access authority
  router.post('/add', function(req, res) {
          if(req.body.userId && req.body.toolId && req.body.authority) {
            db.get("SELECT userId, authority FROM access WHERE userId = ?  AND toolId = ? ORDER BY authority DESC", 
                [ req.body.userId, req.body.toolId], function(err, row) {
              if(row) {
                updateAccess(req, res);
              } else {
                insertAccess(req,res); 
              }
            }); //db.get end
          } else {
             res.status(500).send({ error: "Not enough parameters to add access authority." });
          }
  });

  // POST /api/auth/update
  // @desc: update an access authority
  router.post('/update', function(req, res) {
    updateAccess(req, res);
  });

  // POST /api/auth/logout
  // @desc: user, clearing the signed cookies for access authority, used to unselect tool in GUI
  router.post("/clear", function(req, res) {
   db.get("SELECT * FROM access WHERE userId = ? AND toolId = ?", 
           [ req.signedCookies.user_id, req.signedCookies.tool_id ], function(err, user) {
        if(user) {
          res.clearCookie('tool_id');
          res.clearCookie('authority');
          res.json({ success: "User successfully cleared access authority." });
        } else {
          res.json({ success: "No need to clear access authority again." });
        }
    });
  });

  // POST /api/auth/remove
  // @desc: deletes a access authority from access table
  router.post("/remove", function(req, res) {
     deleteAccess(req, res);
  });
  
  // POST /api/auth/remove
  // @desc: deletes a access authority from access table
  router.post("/tools", function(req, res) {
     getToolNames(req, res);
  });

  return router;
};
