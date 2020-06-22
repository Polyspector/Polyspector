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

//save board/board collection properties
module.exports.path = '/api/chart';
module.exports.create = function (db) {
  var express = require('express');
  var router = express.Router();
  var _ = require('underscore');

  var modelName = '###chart ';
  var commonModule = require('../util/common.js'),
      errHandle=commonModule.errHandle,
      logHandle=commonModule.logHandle;

  db.run("CREATE TABLE IF NOT EXISTS chart ( " +
           "id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE, " +
           "vtname TEXT not null default '', " +
           "vttype TEXT not null default '__NONE__', " + //libpath
           "libtype TEXT default '', " +
           "linkids TEXT default '[]', " +
           "caption TEXT default '', " +
           "colorTheme TEXT default '', " +
           "colorDomainName TEXT default '', " +
           "colorDomain TEXT default '[]', " +
           "colorIndexes TEXT default '{}', " +
           "dataRefiner TEXT default '{}', " +
           "dataSelector TEXT default '[]', " +
           "dataExtraRefiner TEXT default '{}', " +
           "dataExtraSelector TEXT default '[]', " +
           "dataMapper TEXT default '{}', " +
           "hybridRefiner TEXT default '{}', " +
           "timer TEXT default '{}', "+
           "ioattrs TEXT not null default '{}' )"
          );

    //this function should not be called!
    router.get('/', function (req, res) {
      logHandle(modelName +'GET(error): ' + JSON.stringify(req.query));
      res.send({});
    });

    //this function should not be called!
    router.delete('/', function(req, res) {
      logHandle(modelName +'DELETE(error): ' + JSON.stringify(req.params));
    });

    //this function should not be called!
    router.put('/', function(req, res) {
      logHandle(modelName+'PUT(error): ' + JSON.stringify(req.params));
    });

    //create a new model
    router.post('/', function (req, res) {
      var model = req.body;
      logHandle(modelName+'POST: ' + JSON.stringify(req.body));

      var params = "", dict = {};
      if(model.recommend_id) {
        dict.$id = model.recommend_id;
        params = '$id';
      }

      //at lest use param
      dict.$vtname = model.vtname || '';
      params += (params.length>0)? ' , $vtname': '$vtname';
      if(model.vttype) {
        dict.$vttype = model.vttype;
        params += ' , $vttype';
      }

      var stmt_insert = "INSERT OR IGNORE INTO chart (" + params.replace(/\$/g,'') + ") VALUES (" + params + ")";
      db.run(stmt_insert, dict, function(err, other){
             if (err) {
                errHandle(err);
                res.status(500).send({error: err.message});
              } else {
                res.send({id: this.lastID});
              }
           }
      );
    });

    //get one model
    router.get('/:id', function (req, res) {
      var emsg;
      logHandle(modelName +'GET(id): ' + JSON.stringify(req.params));
      db.get("SELECT * FROM chart WHERE id= ?", [req.params.id], function(err, row){
          if(!err && row) {
            res.send(row);
          } else {
            emsg = "Haven't found chart with id= " +req.params.id;
            errHandle(emsg);
            res.status(500).send({ error: emsg });
          }
      });
    });

    router.delete('/:id', function(req, res) {
      logHandle(modelName+'DELETE(id): ' + JSON.stringify(req.params.id));
      if(req.signedCookies.authority !== 'read') {
        var stmt_delete = "DELETE FROM chart WHERE id=?";
        db.run(stmt_delete, [ +req.params.id],
              function(error) {
                  if(error){
                    errHandle(error);
                    res.status(500).send({error: error.message});
                  }else{
                    res.json({message: 'Successful!' });
                  }
              });
      } else {
        var emsg = "Haven't enought access authority to delete chart with id= " +req.params.id;
        errHandle(emsg);
        res.send();
      }
    });

    router.post('/:id', _checkScreenAuthority, function(req, res){
      logHandle(modelName+'POST(id): ' + req.params.id);
      write_callback(req, res);
    });//post end

    router.put('/:id',  _checkScreenAuthority,function(req,res){
      logHandle(modelName+'PUT(id): ' + req.params.id);
      write_callback(req, res);
    });//put end

    router.patch('/:id', _checkScreenAuthority, function(req,res){
      logHandle(modelName+'PATCH(id): ' + req.params.id);
      write_callback(req, res);
    });//put end

    //check whether or not the current screen have write authority
    function _checkScreenAuthority(req, res, next) {
      if (req.body.screenId) {
        db.get("SELECT * FROM screen WHERE id=$id", {$id: req.body.screenId},
          function(err, row) {
            //check writable or only readable
            if(err || !row) {
              res.status(203).send({error: 'no this screen'+ req.body.screenId +'!'});
            } else {
              if(row.tag) {
                res.status(203).send({error: 'screen '+req.body.screenId + ' is only readable!'});
              } else {
                next();　//pass to write action
              }
            }
          });
      } else {
        res.status(203).send({error: 'no screen id for upate chart!'});
      }
    }

    /*update screen update time */
    function updateScreenTime(req) {
      db.run("UPDATE screen SET time = CURRENT_TIMESTAMP WHERE id=$id AND user=$user ",
          {$id:req.body.screenId, $user:req.signedCookies.user_id},
          function(err) {
            if(err) {
              errHandle(err);
            }
          });
    }

    function execUpate(req, res) {
      var emsg;
      var andpart = "", valarrs =[], model = _.omit(req.body, '_id');
      if(model.screenId) {   delete model.screenId; } //delete screenId if exist

      for(var key in model) {
          if (model.hasOwnProperty(key) && key!== 'id') {
             var value = model[key];
             if(typeof value == 'object') value = JSON.stringify(value);
             valarrs.push(value);
             andpart += (andpart.length>0)? ' , '+key+ '=?' : key+'=?';
          }
      }

      var stmt_update = "UPDATE chart SET "+ andpart+ " where id=?";
      valarrs.push( +req.params.id );
      db.run(stmt_update, valarrs,
           function(err) {
             if(err) {
               errHandle(err);
               res.status(500).send({error: err.message});
              } else {
               updateScreenTime(req);
               res.send({});
              }
            }
      );
    }

    function write_callback(req, res) {
      var emsg;
      if( req.signedCookies.authority !=='read') {
        db.serialize(function () {
          db.get("SELECT * FROM chart WHERE id= $id", {$id: +req.params.id},
          function(err, row){
            if (err) {
              errHandle(err);
              res.status(500).send({error: err.message});
            } else {
              if(row) {
                execUpate(req, res);
              } else {
                emsg = "Havn't find chart with id= "+ req.params.id;
                errHandle(emsg);
                res.status(500).send({error: emsg});
              }
            }
          });
        });
      } else {
        emsg = "Havn't enough access authority to update chart with id= "+ req.params.id;
        errHandle(emsg);
        res.send();
      }
    }//callback end
    return router;
};
