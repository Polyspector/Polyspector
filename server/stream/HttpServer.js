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

/*jshint esversion: 6 */
//use permission module for auther
function HttpServer(base_path, http_port, mq) {
  var client_path = base_path + '/../'+ global.config.get('Http.client.path');
  var express = require('express'),
      app = express(),
      //http = require('http').Server(app),
     
      bodyParser    = require('body-parser'),
      cookieParser  = require('cookie-parser'),
      compression   = require('compression'),
      favicon       = require('serve-favicon'),
      methodOverride= require('method-override'),
      cookieSession = require('cookie-session'),
      errorHandler  = require('errorhandler'),
      serveStatic = require('serve-static'),
      csrf = require('csurf'),
      exphbs = require('express-handlebars'),
      sqlite3 = require('sqlite3').verbose(),
      fs = require('fs');

  var historyDB = new (require('./HistoryDB'))();
     //http2 = require('spdy');

  var db_path = (process.env.POLYSPECTOR_SYS_DB_PATH != undefined)? process.env.POLYSPECTOR_SYS_DB_PATH : base_path + '/db';
  if(!fs.lstatSync(db_path).isDirectory()) {
      console.log('POLYSPECTOR_SYS_DB_PATH=' + process.env.POLYSPECTOR_SYS_DB_PATH + ' is not valid directory. Use ' + base_path + '/db, instead\n')
      db_path = base_path + '/db';
  }

  var dbname = (process.env.DB || global.config.get('FrontEnd.database.name'));
      db = new sqlite3.Database(db_path + '/' + dbname + '.db'  );
      
  var recursiveRoutes = function(folderName) {
    
    fs.readdirSync(folderName).forEach(function(file) {
      var fullName = folderName+'/' +file;
      var stat = fs.lstatSync(fullName);
      
      if (stat.isDirectory()) {
        if(file.startsWith('.') <= -1){
           console.log("skip folder ('" + fullName + "')");
        } else {
          recursiveRoutes(fullName);
          console.log("enter folder ('" + fullName + "')");
        }
      } else{
          var index = fullName.toLowerCase().indexOf('.js');
          var moduleName = file.substring(0, file.indexOf('.js'));
          if (index >=0 ) {
            console.log("require('" + fullName + "') ");
            var router_module = require(fullName.substring(0, index));
            app.use(router_module.path, router_module.create(db));
          }else{
            console.log("skip file ('" + fullName + "')" );
          }
      }
    });
  };
  
  var dumpError = function(err) {
    if (typeof err === 'object') {
      if (err.message) {
        console.log('\nMessage: ' + err.message)
      }
      if (err.stack) {
        console.log('\nStacktrace:')
        console.log('====================')
        console.log(err.stack);
      }
    } else {
      console.log('dumpError :: argument is not an object');
    }
  }
  
  // Allow node to be run with proxy passing
  app.enable('trust proxy', 1);

  // Compression (gzip)
  app.use(compression());
  
  //PUT or DELETELE inplace if browser does not support it
  app.use(methodOverride());

  //https://stackoverflow.com/questions/19917401/error-request-entity-too-large
  app.use(bodyParser.json({limit: '50mb'}));
  app.use(bodyParser.raw({limit: '50mb', type: 'application/octet-stream'}));// receiving binary data
  app.use(bodyParser.urlencoded({limit: '50mb', extended: true, parameterLimit:100000}));
  app.use(serveStatic(client_path));
  
  //Cookie config to populate req.signedCookies
  app.use(cookieParser(global.config.get('Http.session.cookieSecret') ) );
  
  //to populate req.session, needed for CSRF
  app.use(cookieSession({keys: [global.config.get('Http.session.sessionSecret') ] } ) );
  app.use(csrf());
  

  // view engine setup
  // We need serverside view templating to initially set the CSRF token in the <head> metadata
  // Otherwise, the html could just be served statically from the public directory
  app.set('view engine', 'html');
  app.set('views', base_path + '/views');
  app.engine('html', exphbs({defaultLayout: false}));
  //app.set('port', http_port); 

  app.use(favicon( client_path+'/imgs/favicon.ico', {
    maxAge: 2592000000
  }));
  
  //error handling middleware should be loaded after the loading the routes
  if ('development' === app.get('env')) {
    app.use(errorHandler());
  }
  
  //log handle
  app.use(function (req, res, next) {
    historyDB.log(req);
    next();
  });

  // error handler
  app.use(function (err, req, res, next) {
    if (err.code === 'EBADCSRFTOKEN') {
      // handle CSRF token errors here
      res.status(403);
      res.send('session has expired or form tampered with');
    } else {
      next(err);
    }
  });
 
  
  try{
    recursiveRoutes(base_path+'/router');
  }catch(err) {
    dumpError(err);
  }
  
  //print all router list
  app._router.stack.forEach(function(r){
    if (r.route && r.route.path){
      console.log(r.route.stack[0].method+ ', '+ r.route.path);
    }
  });
  
  //patch for database
  require(base_path + '/patch.js')(db);
  
  this.server = app.listen(http_port, function () {
    console.log('STARTUP:: Express server(', base_path, ') listening on port', http_port);
    //trace db
    /*db.on("trace", function(sql) {
      if(global.config.get('FrontEnd.database.trace')){
        console.log(sql);
      }
    });*/
  });

  process.on('uncaughtException', function (err) {
    //console.log('Caught exception: ', err);//skip
  });

  // Close the db connection on process exit  (should already happen, but to be safe)
  process.on("exit", function(){
    db.close();
  });

}

module.exports = HttpServer;

