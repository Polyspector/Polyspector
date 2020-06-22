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
module.exports.path = '/api/vts';
module.exports.create = function ( db) {
  var express = require('express');
  var router = express.Router();
  var filesystem = require("fs");

  //get all virtual tables
  router.get('/', function (req, res) {
    let vtListObj = global.mqFrontend.vts;
    if(req.query.kind){
      let list = {};
      switch (req.query.kind) {
        case 'TABLE':
          list = vtListObj.TABLE;
          break;
        case 'TREE':
          list = vtListObj.TREE;
          break;
        case 'STREAM':
          list = vtListObj.STREAM;
          break;
        default:
          for(let worker in vtListObj.ADVANCED) {
            if(req.query.kind in vtListObj.ADVANCED[worker]) {
              list[worker]= vtListObj.ADVANCED[worker][req.query.kind];
            }
          }
          break;
      }
      res.send(list);
    }else{
      res.send(vtListObj);
    }
  });
  router.get('/modules', function(req, res) {
    var modules = {};
    var _getAllFilesFromFolder = function(dir) {
      var results =[];
      filesystem.readdirSync(dir).forEach(function(filename) {
        var file = dir+'/'+filename;
        var stat = filesystem.statSync(file);
        if (stat && stat.isDirectory()) {
          if(filename !== 'TABLE' && filename !== 'TREE' && filename !== 'STREAM') {
            results.push(filename);
          }
        }
      });
      return results;
    };
    //modules['advanced'] =_getAllFilesFromFolder(__dirname + "visualization");
    modules.TREE =_getAllFilesFromFolder(__dirname + "../../../public/js/visualizations/TREE");
    modules.TABLE =_getAllFilesFromFolder(__dirname + "../../../public/js/visualizations/TABLE");
    modules.STREAM =_getAllFilesFromFolder(__dirname + "../../../public/js/visualizations/STREAM");
    res.send(modules);
  });
  return router;
};
