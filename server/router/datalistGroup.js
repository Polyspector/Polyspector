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
const fs = require('fs');
const del = require('del');
module.exports.path = '/api/datalistGroup';

module.exports.create= function(db) {

  var express = require('express');
  var router = express.Router();
  db.run("CREATE TABLE IF NOT EXISTS datalistGroup (" +
         "data TEXT(100) default '{}', "+
         "user TEXT(20) not null, " +
         "trash TEXT(100) default '[]' )"
        );
  
  var modelName = "### STATUS";
  var commonModule = require('../util/common.js'),
      errHandle=commonModule.errHandle,
      logHandle=commonModule.logHandle;
  
  var getStatus = function(req, res) {
    db.get("SELECT * FROM datalistGroup WHERE user= $user",
           {$user: req.query.user}, function(err, row) {
        if (err) {
          errHandle(err);
          res.status(500).send( {error: err.message});
        } else {
          if(row){
            res.send(row);
          } else {
          insertStatus(req, res);
            res.send();
          }
        }
      });
  };
  
  var updateStatus = function(req, res) {
    var  model = req.body,
         stmt_update = "UPDATE datalistGroup SET data=$data, user=$user, trash=$trash WHERE user=$user";
    db.run(stmt_update, 
           {$user: model.user, 
            $data: JSON.stringify(model.data),
            $trash: JSON.stringify(model.trash) }, 
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
         stmt_insert = "INSERT INTO datalistGroup (data, user, trash) VALUES ($data, $user, $trash)";
    db.run(stmt_insert, {$data: '{}', 
                  	 $user: req.query.user, 
                         $trash: '[]'}, 
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
    db.get("SELECT * FROM datalistGroup" , function(err, row) {
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
  var deleteDatalist = function(req) {
    deleteData = req.body.deleteData;
    if (deleteData != undefined) {
      var dataPath = new(require('../backend/utils/dataPath'))();         var entrance = dataPath.getDataPath();
      var filename = entrance + "/" + deleteData;
      console.log(filename);
      if (isExistFile(filename) == true) {
         console.log("Delete datalist: " + filename)
        del.sync([filename], {force: true});
      }
    }
    function isExistFile(file) {
      try {
        console.log(file);
        fs.statSync(file);
        return true
      } catch(err) {
        console.error(err);
        if(err.code === 'ENOENT') return false
      }
    }
  } 
  
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
    deleteDatalist(req);
  });

  return router;
};
