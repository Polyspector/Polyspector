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
module.exports.path = '/api/snapshot';
module.exports.create = function (db) {
  var express = require('express');
  var router = express.Router();
  var fs = require('fs');
  router.get('/:imgname', function(req, res){
      
      console.log('GET request for snapshot accepted: ' + req.params.imgname);
      
      var folder = __dirname + "/../snapshot";
      var emsg = null;
      if (!fs.existsSync(folder)){
        //return error
        //emsg = "No image folder";
      }
    
      var fullpath_file = folder + '/'+ req.params.imgname;
       if (!fs.existsSync(fullpath_file)){
          fullpath_file = __dirname + '/../db/null.jpg';
       }
      
      if(!emsg) {
        fs.stat(fullpath_file, function (err, stat) {
          if(err){
            res.status(500).send(err.message);  
          }else {
                  var img = fs.readFileSync(fullpath_file);
                  res.contentType = 'image/jpeg';
                  res.contentLength = stat.size;
                  res.end(img, 'binary');
          }
        });
      } else {
        res.status(500).send(emsg);
      }
      
  });
  
  router.post('/:imgname', function(req, res){
      
      console.log('POST request for snapshot accepted: ' + req.params.imgname);
      
      var folder = __dirname + "/../snapshot";
      if (!fs.existsSync(folder)){
        fs.mkdirSync(folder);
      }
      if(req.body.image){
        var fullpath_file = folder +'/'+ req.params.imgname + req.body.ext;
        var data = req.body.image.replace(/^data:image\/\w+;base64,/, "");
        var buf = new Buffer(data, 'base64');
        fs.writeFile(fullpath_file, buf);
      }
      
      res.send(200); //success
  });

  return router;
};
