//require('../util/wrapperConsoleForLog4js.js')
var amqp = require('amqplib'),
    config = require('config'),
    fs = require('fs'),
    _= require('underscore');
var mq_host = (config.has('RabbitMQ.server.host'))? config.get('RabbitMQ.server.host') : 'localhost',
    mq_port = (config.has('RabbitMQ.server.port'))? config.get('RabbitMQ.server.port') : 5672,
    mq_user = (config.has('RabbitMQ.server.user'))? config.get('RabbitMQ.server.user') : 'guest',
    mq_password =(config.has('RabbitMQ.server.password'))? config.get('RabbitMQ.server.password') : 'guest',
    mq_server = 'amqp://'+ mq_user+':'+mq_password + '@'+mq_host+ ':'+ mq_port;

var gconfig = JSON.parse( fs.readFileSync(__dirname+'/config.json', 'utf8') ),
    entrance = (_.isEmpty(gconfig.dataPath))? __dirname+'/data/':  gconfig.dataPath.toString().trim() ,
    callback = new (require('./utils/ReadFile.js'))();

function collector (path) {
    var files = [];
    var list = fs.readdirSync(path); //get all contents under path
    for(var i=0; i<list.length; i++){
      var fullPath = path + list[i];
      try{
        var st = fs.statSync(fullPath);
        if(st.isFile()){
          var ext = list[i].split('.').pop().toLowerCase();
          if(ext==='csv' || ext==='tsv') {
            files.push(list[i]);
          }
        }
      } catch(e) {
        console.log("error:"+e.message);
      }
    }  
    return files;
}

amqp.connect(mq_server).then(function (conn) {
  return conn.createChannel().then(function (ch) {
    var mqBackend = new (require('./utils/MqBackend'))(ch);
    setInterval(function(){
      mqBackend.starts('TABLE', entrance, collector(entrance), callback);
    }, 3000);
  });
}).then(null, console.warn);
