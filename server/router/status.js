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
module.exports.path = '/api/status';

module.exports.create= function(db) {

  var express = require('express');
  var router = express.Router();

  db.run("CREATE TABLE IF NOT EXISTS status (" +
         "data TEXT(100) DEFAULT '{}', "+
         "tool TEXT(100) DEFAULT '{}', "+
         "user TEXT(20) NOT NULL PRIMARY KEY )"
        );

  var modelName = "### STATUS";
  var commonModule = require('../util/common.js'),
      errHandle=commonModule.errHandle,
      logHandle=commonModule.logHandle;

  var getStatus = function(req, res) {
    db.get("SELECT * FROM status WHERE user= $user",
           {$user: req.query.user}, function(err, row) {
        if (err) {
          errHandle(err);
          res.status(500).send( {error: err.message});
        } else {
          if(row){
            res.send(row);
          } else {
            res.status(500).send( {error: 'Not status for user:' + req.query.user});
          }
        }
      });
  };

  var updateStatus = function(req, res) {
    var  model = req.body,
         stmt_update = "UPDATE status SET data=$data, tool=$tool WHERE user=$user";
    db.run(stmt_update,
           {$user: model.user,
            $tool: JSON.stringify(model.tool),
            $data: JSON.stringify(model.data) },
      function(err) {
        if (err) {
          errHandle(err);
          res.status(500).send( {error: err.message});
        } else {
          res.send();
        }
      });
  };

  var insertStatus = function(req, res) {
    var  model = req.body,
         stmt_insert = "INSERT INTO status (user, data, tool) VALUES ($user, $data, $tool)";
    db.run(stmt_insert, {$user: model.user,
                         $data: JSON.stringify(model.data),
                         $tool: JSON.stringify(model.tool) },
      function(err) {
        if (err) {
          errHandle(err);
          res.status(500).send( {error: err.message});
        } else {
           res.send();
        }
      });
  };

  var writeStatus = function(req, res) {
    var  stmt_options = {$user: req.body.user},
         stmt_select = "SELECT data, tool FROM status WHERE user= $user";
    db.get(stmt_select, stmt_options, function(err, row) {
        if (err) {
          errHandle(err);
          res.status(500).send( {error: err.message});
        } else {
          if(row) {
            updateStatus(req, res);
          } else {
            insertStatus(req, res);
          }
        }
    });
  };

  router.get('/', function (req, res) {
    logHandle(modelName+' GET: ' + JSON.stringify(req.query));
    getStatus(req, res);
  });

  router.put('/', function (req, res) {
    logHandle(modelName+' PUT:' + JSON.stringify(req.body));
    writeStatus(req, res);
  });

  router.post('/', function (req, res) {
    logHandle(modelName+' POST:' + JSON.stringify(req.body));
    writeStatus(req, res);
  });

  return router;
};
