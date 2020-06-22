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
module.exports.path = '/';
module.exports.create = function (db) {
  var express = require('express');
  var spawnSync = require('child_process').spawnSync;
  var router = express.Router();

  router.get('/', function(req, res) {
    var screenid = (req.query.sid)? req.query.sid:null,
     dataid = (req.query.data)? req.query.data:null,
     options = { csrfToken: req.csrfToken() },
     mode = global.config.get('Http.client.mode'),
     revision='polyspector';
    try {
      var gitcmd = spawnSync('git', ['describe', '--tags']),
          error = gitcmd.stderr;
      if(!error || error.length<=0) {
        revision = (gitcmd.stdout + "").trim();
      }
    } catch(err) {
      //skip
    }
    options.revision = revision;
    if(req.query.sid && req.query.sid.length>0 ) {
      options.screenid = req.query.sid;
    }
    if(req.query.data && req.query.data.length>0 ) {
      options.dataid = req.query.data;
    }

    switch(mode) {
      case 'prod':
        res.render('index-prod', options);
        break;
      case 'test':
        res.render('index-test',options);
        break;
      default:
        res.render('index', options);
    }
  });

  return router;
};
