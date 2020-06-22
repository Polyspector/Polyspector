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
//save/get screen data-- the screen could be current screen, or a bookmarked screen
module.exports.path = '/api/screen';
module.exports.create = function(db) {
  var express = require('express');
  var router = express.Router();
  var uuid = require('uuid');
  
  var modelName = '###SCREEN ';
  
  var commonModule = require('../util/common.js'),
      errHandle=commonModule.errHandle,
      logHandle=commonModule.logHandle;
  
  var $ = require('jquery-deferred'),
      _ = require('underscore');
  
  //screen 
  db.run("CREATE TABLE IF NOT EXISTS screen (" +
         "id TEXT NOT NULL PRIMARY KEY, "+ 
         "user TEXT NOT NULL, "+ 
         "format TEXT, " + // is format necessary ? 2016/7/11
         "description TEXT DEFAULT '', "+ //screen description
         "imgurl TEXT DEFAULT '', " + //snpshot path
         "maxRows INTEGER NOT NULL DEFAULT 5, " +
         "maxColumns INTEGER NOT NULL DEFAULT 2, "+
         "margin INTEGER NOT NULL DEFAULT 5, " +
         "cells TEXT NOT NULL DEFAULT '[]', "+
         "time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP , "+ //last update time
         "width	INTEGER DEFAULT 0, "+
	       "height	INTEGER DEFAULT 0, "+
	       "timeout	INTEGER DEFAULT 0, "+
         "interval INTEGER DEFAULT 0, "+
         "tag INTEGER DEFAULT 0, "+
	       "responsive	INTEGER DEFAULT 0 )"
   );
　
  //referencial screen 
  db.run("CREATE TABLE IF NOT EXISTS scrref (" +
  "userId TEXT NOT NULL PRIMARY KEY, "+ 
  "screenId TEXT DEFAULT '' )" 
  );
  
  //only admin can set the ref screen
  var getDefaultScreen = function(req, res) {
    var fixed_user = 'admin';
    db.get( "SELECT * FROM scrref WHERE userId=$user", {$user: fixed_user}, function(err, row){
      if(err || !row) {
        res.send({});
      } else {
        res.send({screenId: row.screenId});
      }
    });
  };

  var updateDefaultScreen = function(req, res) {
    var fixed_user = 'admin';
    db.get( "SELECT * FROM scrref WHERE userId=$user", {$user: fixed_user}, function(err, row){
      if(row) {
        if(+req.body.isDefault) { //UPDATE
          db.run("UPDATE scrref SET screenId=$id WHERE userId=$user", {$id:req.body.screenId, $user:fixed_user},
          function(err) {
              if(err) {
                res.send({});
              } else {
                res.send({screenId: req.query.screenId});
              }
          });
        } else { //DELETE
          db.run("DELETE FROM scrref WHERE screenId=$id AND userId=$user", {$id:req.body.screenId, $user:fixed_user},
          function(err) {
              if(err) {
                res.send({});
              } else {
                res.send({screenId: req.query.screenId});
              }
          });
        }
      } else { //INSERT
        db.run("INSERT INTO scrref (userId, screenId) VALUES ($user, $id) ",{$id:req.body.screenId, $user:fixed_user},
        function(err) {
          if(err) {
            res.send({});
          } else {
            res.send({screnId: req.query.screenId});
          }
       });
      } //else end
    });
  };

  //get screen list of screens creater
  var getScreens = function(req, res) {
    var stmt_select = db.prepare(
        "SELECT id, description, imgurl, tag, user, time FROM screen WHERE user= $user");
    stmt_select.all({$user: req.query.user}, function(err, rows) {
        if (err) {
          errHandle(err);
          res.status(500).send({error: err.message});
        } else {
           getSharedScreens(req, res, rows).done(function(shared_screens){
            res.send({data: shared_screens.concat(rows)});
           }).fail(function(err){
            res.send({data: rows});
           });
        }
    });
  };
  
  var getSharedScreens = function(req, res, self_screens) {
    
    var deferred = $.Deferred();
    db.all("SELECT screenId FROM scrauth WHERE userId = $userId OR userId = '*' ", 
     { $userId: req.query.user}, function(scrauth_err, scrauth_rows) {
      if (scrauth_err) {
          console.error(scrauth_err);
          deferred.resolve([]);
      } else {
        if(scrauth_rows.length) {
          var screens = scrauth_rows.map(function(screen){
            return "'"+screen.screenId+"'";
          });
          db.all("SELECT  id, description, imgurl, tag, user, time FROM screen WHERE id IN (" + screens.join(',')+')', 
          function(err, rows) {
            if(err) {
              console.error(err);
              deferred.resolve([]);
            } else {
              var screenids = self_screens.map(function(screen){return screen.id;});
              rows = rows.filter(function(row){
                return screenids.indexOf(row.id) < 0; 
              });
              for(var i=0; i<rows.length; i++) {
                rows[i].tag = (rows[i].user !== req.query.user);
              }
          
              deferred.resolve(rows);
            }
          }); 
        } else {
           deferred.resolve([]);
        }
      }
    });
    return deferred.promise();
  };
 
  //the screen id may come from shared tools
  var getScreenWithId = function(req, res) {
    var emsg='',  select_sql= "SELECT * FROM screen WHERE id=$id";
    db.get(select_sql, {$id: req.params.id}, //check the screen exists 
      function(err, row) {
          if (err) {
            res.status(500).send( {error: err.message});
          } else {
            if (row) {
              if(row.user == req.query.user ) { //self screen 
                res.clearCookie('authority');
                res.send(row);
              } else if( typeof(req.signedCookies.authority) !=='undefined') { //authorized tool?
                res.send(row); //screen shared by tool 
              } else {
                 db.get("SELECT * FROM scrauth WHERE screenId=$screenId AND (userId = $userId OR userId = '*') ", // 
                  {$screenId:row.id , $userId: req.query.user}, function(scrauth_err, scrauth_row) {
                    if (scrauth_err || !scrauth_row) {
                       emsg = "Has not enough authority to access screen "+ req.params.id;
                       res.status(500).send( {error: emsg});
                    } else {
                      row.tag |= (row.user !== req.query.user); //if the screen is shared, it is then only readable 
                      res.send(row); //screen shared other users 
                    }
                });
              }
            }else{
              emsg = "Haven't found model with id: "+ req.params.id;
              res.status(500).send( {error: emsg});
            }
          }
        } 
      );
  };
  
  //only the owner can show her/his last writable screen
  var getLastOrDefaultScreenWithoutId = function(req, res) {
    var select_sql= "SELECT * From screen WHERE user=$user AND (tag IS NULL OR tag=$tag) AND " +
        " time= (SELECT MAX(time) FROM screen where user=$user AND (tag IS NULL OR tag=$tag))" ;
    db.get(select_sql, { $user: req.query.user, $tag: 0},
      function(err, row) {
        try{
          if (err) {
            throw err;
          } else {
            if(row) {
              res.send(row);
            } else { //no self editable screens
              getDefaultScreenWithoutId(req, res);
            }
          }
        } catch(e) {
          errHandle(e);
          res.status(500).send( {error: e.message});
        }
      });
  };

  //only the owner can show her/his last screen
  var getDefaultScreenWithoutId = function(req, res) {
    var select_sql= "SELECT * From screen WHERE " +
        "id IN (SELECT screenId FROM scrref where userId= $adminuser ) ";
    db.get(select_sql, { $adminuser: 'admin'},
      function(err, row) {
        try{
          if (err) {
            throw err;
          } else {
            if (row) {
              res.send(row);
            }else{
              res.send({});
            }
          }
        } catch(e) {
          errHandle(e);
          res.status(500).send( {error: e.message});
        }
      });
  };

  //input: the chart id to be cloned
  //output: the cloned new chart id
  var _chart_columns_without_id = [
      'vtname',
      'vttype',
      'linkids',
      'caption',
      'colorTheme',
      'colorDomainName',
      'colorDomain',
      'colorIndexes',
      'dataRefiner',
      'dataSelector',
      'dataExtraRefiner',
      'dataExtraSelector',
      'dataMapper',
      'ioattrs'
    ];

  var _chart_cols_sel =  _chart_columns_without_id.join(','),
      _chart_cols_ins =  '('+ _chart_cols_sel +')',
      _chart_stmt_insert = "INSERT INTO chart " + _chart_cols_ins + " SELECT " + _chart_cols_sel + " FROM chart WHERE id= $id";

  var _cloneChart = function(cell) {

    var deferred = $.Deferred();   
    db.run(_chart_stmt_insert, {$id: cell.id}, function(err) { //use oid to search row and insert
        if(err){ //insert error
          deferred.reject(null);
        } else { //successful
          deferred.resolve({oid: cell.id, nid: this.lastID});
        }
    });
    return deferred.promise();
  };

  var _updateChartLinkids = function(cells_mapping) {
    var deferred = $.Deferred();   
    var values = Object.keys(cells_mapping).map(function(oid) {
          return cells_mapping[oid]; //return the new id
      });
    
    if(!values.length) { 
      deferred.resolve(); 
    } else {
      values.forEach(function(nid) {
        db.get("SELECT * FROM chart WHERE id =?", nid, function(err, row) {
            if(err) {
              deferred.reject(null);
            } else {
              var _chart_stmt_update =  db.prepare("UPDATE chart set linkids=? where id=? ");
              var ids = JSON.parse(row.linkids).map(function(oid){
                if(cells_mapping[oid]) {
                  return cells_mapping[oid] + "";
                } else {
                  return '999999999';
                }
              });
              _chart_stmt_update.each(JSON.stringify(ids), nid, function(err, row){
                //skip
              }, function(err, numRows) {
                deferred.resolve();
              });
              _chart_stmt_update.finalize();
            } //else end
        }); //db.get end
      });//forEach end
    }
    return deferred.promise();
  };

  //input: the chart id to be cloned
  //output: the cloned new chart id 
  var _screen_columns_without_time = [
        'id',
        'user',
        'margin',
        'maxColumns',
        'maxRows',
        'cells',
        'format',
        'imgurl',
        'description',
        'width',
        'height',
        'timeout',
        'interval',
        'responsive',
        'tag'
      ];
  var _screen_cols_sel = _screen_columns_without_time.join(','),
      _screen_cols_ins = '('+ _screen_cols_sel +')',
      _screen_cols_val = ' VALUES ($'+ _screen_cols_sel.replace(/,/g, ",$") +')',
      _screen_stmt_insert = "INSERT INTO screen " + _screen_cols_ins + _screen_cols_val;
  
  var _cloneScreen = function(model, row, cells_mapping) {

    var deferred = $.Deferred();
    var new_cells = JSON.parse(row.cells); 
    
    //update cell.id from the old to the new one
    new_cells.forEach( function(cell) {
       cell.id = cells_mapping[cell.id];
    });

    //"VALUES ($user, $margin, $maxColumns, $maxRows, $cells, $id , $description, $imgurl, $format)";
    db.run(_screen_stmt_insert, {
        $id: model.cloneid,     
        $user: model.user, //current user
        $description: row.description,
        $imgurl: (model.imgurl)? model.imgurl: row.imgurl,
        $tag: model.tag,
        $cells: JSON.stringify(new_cells),

        $margin: row.margin,
        $format: row.format,
        $maxColumns: row.maxColumns,
        $maxRows: row.maxRows,
        
        $width: (row.width)? row.width: 0,
        $height: (row.height)? row.height:0,
        $timeout: (row.timeout)? row.timeout:0,
        $responsive: (row.responsive)? row.responsive:0
      }, 
      function(err) {
        if(err){ //insert error
          deferred.reject(err);
        } else { //successful
          deferred.resolve(model.cloneid);
        }
      }
    );
    return deferred.promise();
  };

  
  //screens from shared tools (different users) can be also copied
  var execCloneScreenWithId = function(req, res) {
    var model = req.body;
    db.get("SELECT * FROM screen WHERE id =$id", {$id: model.id}, //original screen id
        function(err, row) {
          if (err) {
            errHandle(err);
            res.status(500).send({error: err.message});
          } else {
            if (row) {
              //clone all charts in the screen
              var deferreds = [];
              JSON.parse(row.cells).forEach( function(cell){
                deferreds.push(_cloneChart(cell));
              });

              $.when.apply($, deferreds).then(function(){ /*the first function process the success returns*/
                
                var cells_mapping= {}, cells_array_mapping =  Array.from(arguments);
                cells_array_mapping.forEach(function(cell_array_mapping) {
                  cells_mapping[cell_array_mapping.oid] = cell_array_mapping.nid;
                });
                
                //update chart linkids
                _updateChartLinkids(cells_mapping).always(function(){
                  //clone screen
                  _cloneScreen(model, row, cells_mapping).done(function(screen_id){
                    res.send({id: screen_id});
                  }).fail(function(err){
                    errHandle(err);
                    res.status(500).send( {error: err.message});
                  });
                });
              });

              //
            } else {//not unique, update ?
              var emsg = "No cloneable screen ID: " + id;
              errHandle(emsg);
              res.status(500).send( {error: emsg});
            }
          }
        });
  };
  
  var cloneScreenWithId = function (req, res) {
    logHandle(req.body);
    //check cloneid not existed
    var model = req.body;
    //check  whether or not user have owned screen id , if not copy it
    db.all("SELECT * FROM screen WHERE user = $user AND id =$id",
        {$user: model.user, $id: model.cloneid},
        function(err, rows) {
          if (err) {
            errHandle(err);
            res.status(500).send({error: err.message});
          } else {
            if (!rows.length) {//id not existed, OK to be copied
              execCloneScreenWithId(req, res);
            } else { //existed id, warning user to change it
              var emsg = "Existed screen clone ID: " + model.cloneid;
              errHandle(emsg);
              res.status(500).send( {error: emsg});
            }
          }
        }); //db calling end
  };
  
  //now have not used?
  var createNewScreenWithoutId = function (req, res) {
    logHandle(req.body);
    var id = uuid(), model = req.body;
    db.all("SELECT * FROM screen WHERE user = $user AND id =$id",
        {$user: model.user, $id: id},
        function(err, rows) {
          if (err) {
            errHandle(err);
              res.status(500).send({error: err.message});
          } else {
            if (!rows.length) {
              var stmt_insert = "INSERT INTO screen " +
                  "(user, margin, maxColumns, maxRows, cells, id, description, imgurl) "+
                  "VALUES ($user, $margin, $maxColumns, $maxRows, $cells, $id , $description, $imgurl)";
              db.run(stmt_insert,
              {
                $user: model.user ,
                $id: id ,
                $margin: model.margin ,
                $maxColumns: model.maxColumns ,
                $maxRows: model.maxRows ,
                $cells: (typeof model.cells == 'object')? JSON.stringify(model.cells): model.cells ,
                $description: model.description ,
                $imgurl: model.imgurl
              }, function(err) {
                if(err){ //insert error
                  errHandle(err);
                   res.status(500).send( {error: err.message});
                } else { //successful
                  res.send({id: id});
                }
              });
            } else {//not unique, update ?
              var emsg = "Existed screen ID: " + id;
              errHandle(emsg);
              res.status(500).send( {error: emsg});
            }
          }
        });
  };
  
  var execCreateScreenWithId = function(req, res) {
    var model = req.body;
    var stmt_insert = "INSERT INTO screen " +
                  "(user, id, description, margin, maxColumns, maxRows) "+
                  "VALUES ($user, $id , $description, $margin, $maxColumns, $maxRows)";
    db.run(stmt_insert,
     {
       $user: model.user,
       $id: model.id,
       $description: model.description,
       $margin: model.margin,
       $maxColumns: model.maxColumns,
       $maxRows: model.maxRows
     }, function(err) {
       if(err){ //insert error
        errHandle(err);
        res.status(500).send( {error: err.message});
       } else { //successful
         res.send({id: model.id});
       }
     });
  };

  var createScreenWithId = function (req, res) {
    logHandle(req.body);
    var emsg, model = req.body;
    db.get("SELECT * FROM screen WHERE id =$id", {/*$user:model.user,*/ $id: model.id},
      function(err, row) {
        if (err) {
          errHandle(err);
          res.status(500).send({error: err.message});
        } else {
          if (row) {
            emsg = "Existed screen ID: " + model.id;
            errHandle(emsg);
            res.status(500).send( {error: emsg});
          } else {
            execCreateScreenWithId(req, res);
          }
        }
      });
  };

  var execUpdateScreenWithId = function(req, res, screen) {
    var model = req.body, id = req.params.id;
    var andpart = "", valarrs =[];
    if(screen.user== req.signedCookies.user_id || req.signedCookies.authority!=='read') {
      for(var key in model) {
        if (model.time) delete model.time; //delete the old time item
        if (model.hasOwnProperty(key) ) {
          andpart += (andpart.length>0)? ' , '+key+ '=?' : key+'=?';
          var value = model[key];
          if(typeof value == 'object' && value !== null) value = JSON.stringify(value);
          valarrs.push(value);
        }
      }
      andpart+= ", time=CURRENT_TIMESTAMP";
      var stmt_update = "UPDATE screen SET "+ andpart+ " where id=? and user=?";
      valarrs.push(id);
      valarrs.push(model.user);
      db.run(stmt_update, valarrs, function(err) {
        if(err){ //insert error
          errHandle(err);
          res.status(500).send( {error: err.message});
        } else { //successful
          res.send({id: model.id});
        }
      });
    }  else {
      emsg = "Havn't enough tool access authority to update screen :"+ id;
      errHandle(emsg);
      //res.status(500).send( {error: emsg});
      res.send({});
    }
  };

  //for PUT/POST(PATCH) '/api/screen/:id'
  var updateScreenWithId = function (req, res) {
    var emsg,  model = req.body, id = req.params.id;//keep the old id
    logHandle(req.body);
    if(req.params.newid) { 
      model.id = req.params.newid;
    }
    
    db.get("SELECT * FROM screen WHERE id = $id", {$id: id},function(err, row) {
            if (err) {
              errHandle(err);
              res.status(500).send( {error: err.message});
            } else {
              if (row) {//can not be updated
                if(row.tag || row.user !== req.body.user) {
                  emsg = "Havn't enough screen access authority to update screen :"+ id;
                  errHandle(emsg);
                  res.send({});
                } else { //can be updated
                  execUpdateScreenWithId(req, res, row);
                }
              } else {
                emsg = "Havn't found the screen :"+ id;
                errHandle(emsg);
                res.send({});
              }
            }
    });
  };
    
  var insertScreenWithoutId = function (req, res) { //for POST '/api/screen'
    logHandle(req.body);
    var id = uuid(), model = req.body;
    db.get("SELECT * FROM screen id =$id", { $id: id},
        function(err, row) {
          if (err) {
            errHandle(err);
            res.status(500).send({error: err.message});
          } else {
            if (row) {
              var emsg = "Existed screen ID: " + id;
              errHandle(emsg);
              res.status(500).send( {error: emsg});
            } else {
              var stmt_insert = "INSERT INTO screen " +
                  "(user, margin, maxColumns, maxRows, cells, id, imgurl) "+
                  "VALUES ($user, $margin, $maxColumns, $maxRows, $cells, $id , $imgurl)";
              db.run(stmt_insert,
              {
                $user: model.user,
                $id: id,
                $margin: model.margin,
                $maxColumns: model.maxColumns,
                $maxRows: model.maxRows,
                $cells: JSON.stringify(model.cells),
                $imgurl: model.imgurl
              }, function(err) {
                if(err){ //insert error
                  errHandle(err);
                  res.status(500).send( {error: err.message});
                } else { //successful
                  res.send({id: id});
                }
              });
            } 
          }
        });
    };
  
    var _deleteCharts = function(ids) {

      var deferred = $.Deferred();
      var stmt_delete = "DELETE FROM chart WHERE id IN (" + ids.join(',') +") ";
      
      db.run(stmt_delete, {}, function(err) {
          if(err){ //insert error
            deferred.reject(null);
          } else { //successful
            deferred.resolve();
          }
      });
      return deferred.promise();
    };

   //only the screen owner can delete it
   var deleteScreen = function (req, res) {
    var model = req.body;
    db.get("SELECT * FROM screen WHERE id =$id", {$id:  req.query.id}, function(err, row) {
      if (err) {
        errHandle(err);
        res.status(500).send({error: err.message});
      } else {
        if(row){
          var chartids = JSON.parse(row.cells).map(function(cell){return cell.id;});
          _deleteCharts(chartids).done(function(){
            var stmt_delete = "DELETE FROM screen WHERE id=$id AND user=$user";
            db.run(stmt_delete, { $id: req.query.id,  $user: req.query.user},
              function(error) {
                if(error){
                  errHandle(error);
                  res.status(500).send({error: error.message});
                }else{
                  res.json({message: 'Successful!' });
                }
            });
          });
        } else {
          res.status(500).send({error: 'no screen to be deleted'});
        }
      } 
     });
  };
  
  //get screen with lastest or create new screen
  router.get('/', function (req, res) {
    logHandle(modelName+' GET: ' + JSON.stringify(req.query));
    getLastOrDefaultScreenWithoutId(req, res);
  });
  
  //delete screen
  router.delete('/', function(req, res) {
    logHandle(modelName+' DELETE: '+ JSON.stringify(req.query));
    deleteScreen(req,res);
  });

  //save screen(without id)
  router.put('/', function (req, res) {
    logHandle(modelName+' PUT: ' + JSON.stringify(req.query));
    insertScreenWithoutId(req,res);
  });

  router.post('/', function (req, res) {
    logHandle(modelName+' POST: ' + JSON.stringify(req.query));
    insertScreenWithoutId(req,res);
  });
  
  //save Screen with id
  router.post('/:id', function (req, res) {
    logHandle(modelName+' POST(id): ' + req.params.id);
    updateScreenWithId(req, res);
  });

  router.put('/:id', function (req, res) { //update
    logHandle(modelName+' PUT(id): ' + req.params.id);
    updateScreenWithId(req, res);
  });

  router.patch('/:id', function(req,res){
     logHandle(modelName+'PATCH(id): ' + req.params.id);
     updateScreenWithId(req, res);
  });//put end
  
  //get Screen with id
  router.get('/:id', function (req, res) {
    logHandle(modelName+ 'GET(id): ' + req.params.id );
    getScreenWithId(req, res);
  });
  //delete scree with id
  router.delete('/:id', function(req, res) {
    logHandle(modelName+' DELETE(id): ' + req.params.id);
    deleteScreen(req, res);
  });
  
  router.post('/ctrl/clone', function(req, res) {
    logHandle(modelName+' CLONE(id): ' + JSON.stringify(req.body));
    cloneScreenWithId(req, res);
  });
  
  //get list
  router.get('/ctrl/list', function(req, res) {
    logHandle(modelName+' GET(list): ' + req.query.user);
    getScreens(req, res);
  });
  
  
  //get list
  router.get('/ctrl/lastest', function(req, res) {
    logHandle(modelName+' GET(_lastest): ' + req.query.user);
    getLastOrDefaultScreenWithoutId(req, res);
  });
  
  //POST list
  router.post('/ctrl/new', function(req, res) {
    logHandle(modelName+' POST(_new): ' + req.body.id);
    createScreenWithId(req, res);
  });
  
  //create screen
  router.post('/ctrl/new/:id', function(req, res) {
    logHandle(modelName+' POST(_new with id): ' + req.body.id);
    createScreenWithId(req, res);
  });

  //update DEFAULT screen
  router.post('/ctrl/ref', function (req, res) {
    logHandle(modelName+' POST(ref): ' + JSON.stringify(req.body));
    updateDefaultScreen(req, res);
  });

  //get DEFAULT screen
  router.get('/ctrl/ref', function (req, res) {
    logHandle(modelName+' GET(ref): ' + JSON.stringify(req.query));
    getDefaultScreen(req, res);
  });
  return router;
};
