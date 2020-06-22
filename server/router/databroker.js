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
module.exports.path = '/api/data';
module.exports.create = function (db) {
  let express = require('express');
  let router = express.Router();
  //let msgpack = require('msgpack-lite');
  
  //get data as json { data1: {type: 'csv', data: '...'}, data2: ....}
  router.get('/:virtualTable', function (req, res) {
    global.mqFrontend.request(req.params.virtualTable, req.body).then(
      function (payload) {
        res.header('Content-Type', 'application/*'); //change
        res.send(payload);
      },
      function (error) {
        console.log(error);
        //var err = {};
        //err[req.params.virtualTable] = {error: 'server error!'};
        res.status(404).send();
      }
    );
  });
  
  router.post('/:virtualTable', function (req, res) {
    global.mqFrontend.request(req.params.virtualTable, req.body).then(
     function (payload) {
       res.header('Content-Type', 'application/*'); //change
       res.send(payload);
     },
     function (error) {
       console.log(error);
       //var err = {};
       //err[req.params.virtualTable] = {error: 'server error!'};
       //res.header('Content-Type', 'text/plain;charset=utf-8');
       res.status(404).send(/*JSON.stringify(err)*/);
     }
    );
  });
  
  return router;
};
