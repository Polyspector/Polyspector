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

var request = require("request"),
    program = require('commander'),
    url = require('url'),
    _ = require('underscore'),
    inquirer = require('inquirer'),
    cheerio = require('cheerio');

var $  = require('jquery-deferred');
//3 Value Checkbox
//http://extremefe.github.io/bootstrap-checkbox/
//http://vanderlee.github.io/tristate/
function parseURL(host) {
  
  if(!host) {
    return null;  
  }

  var urlObj = url.parse(host);
  
  if(!urlObj.protocol){
    urlObj.protocol = 'http';
  }
  if(!urlObj.host){
    urlObj.host = 'localhost';
  }
  if(!urlObj.port){
    urlObj.port = '8004';
  }
  return url.format(urlObj);
}

program
  .version('0.0.1')
  .option('-u, --url <n>', 'http://server:port', parseURL)
  .parse(process.argv);

if(!program.url) {
    program.help();
    process.exit(1);
}

var login_parameters = [
    {
      type: 'input',
      name: 'user',
      message: 'Enter login user name:',
      validate: function (str) {
        return !_.isEmpty(str);
      }
    },
    {
      type: 'password',
      name: 'password',
      message: 'Enter login user password:',
      validate: function (str) {
        return !_.isEmpty(str);
      }
    }
];

//add user<>tool access to table
var set_parameters = [
    {
      type: 'input',
      name: 'user',
      message: 'Enter new user name:',
      validate: function (str) {
        return !_.isEmpty(str);
      }
    },
    {
      type: 'password',
      name: 'password',
      message: 'Enter new user password:',
      validate: function (str) {
        return !_.isEmpty(str);
      }
    },
    {
      type: 'password',
      name: 'password_again',
      message: 'Once again, enter new user password:',
      validate: function (str, response) {
        return !_.isEmpty(str) && str == response.password;
      }
    }
];

//change user<>tool access to table
var change_parameters = [
    { 
      type: 'password',
      name: 'password',
      message: 'Enter a new password:',
      validate: function (str) {
        return !_.isEmpty(str);
      }
    },
    {
      type: 'password',
      name: 'password_again',
      message: 'Once again, enter the new password:',
      validate: function (str, response) {
        return !_.isEmpty(str) && str == response.password;
      }
    }
];

//delete tool<>user access in table
var delete_parameters = [
    {
      type: 'input',
      name: 'user',
      message: 'Enter user name to be deleted:',
      validate: function (str) {
        return !_.isEmpty(str);
      }
    },
    { 
      type: 'confirm',
      name: 'confirm',
      message: 'Are you confirm to delete the user?',
      validate: function (str) {
        return !_.isEmpty(str);
      }
    }
];

//switch functions 
var function_parameters = [
    {
      type: 'list',
      name: 'func',
      message: 'select one action (Add access, Delete access, Change access, Logout, Exit)?',
      choices: ['Add tool access of an user','Delete tool access of an user', 'Change tool access of an user'/*, 'Logout', 'Exit'*/],
      validate: function (str) {
        return !_.isEmpty(str);
      },
      filter: function (str){
        return str.split(' ')[0].toLowerCase();
      }
    }
];

var cookieJar = request.jar();

request({url: program.url, method: 'GET', jar: cookieJar}, function(e, r, html){
  if(!e && r.statusCode == 200 ) {
    var $ = cheerio.load(html),
        token= $('meta[name="csrf-token"]').attr('content');
    inquirer.prompt(login_parameters).then(function(parameters) {
      loginUser(parameters, token);
    });
  } else {
    console.log(e || r.body);
  }
});

function loginUser(parameters, token) {
  var options = {
    method: 'POST',
    json: true,
    jar: cookieJar,
    body: {
      userId: parameters.user,
      password: parameters.password,
    },
    url: program.url+'api/auth/login',
    headers: {'X-CSRF-Token': token }
  };

  request(options, function(e, r, body){
    if(e || body.error) {
      console.error(e || body.error);
      process.exit(1);
    } else {    
      inquirer.prompt(function_parameters).then(function(fparameters) {
          switch (fparameters.func) {
            case 'add':
              setUser(token, parameters.user).done(function(user) {
                setTool(token, parameters.user).done(function(tool) {
                  setAuthority().done(function(authority){
                    addAccess(user, tool, authority, token);
                  });
                })
                .fail(function(err){
                  console.error(err);
                });
              })
              .fail(function(err){
                console.error(err);
              });
              break;

            case 'delete':
              setUser(token, parameters.user).done(function(user) {
                setAssignedTool(token, user).done(function(tool) {
                  deleteAccess(user, tool, token);
                })
                .fail(function(err){
                  console.error(err);
                });
              })
              .fail(function(err){
                console.error(err);
              });
              break;
            
            case 'change':
              setUser(token, parameters.user).done(function(user){
                setAssignedTool(token, user).done(function(tool){
                  setAuthority().done(function(authority){
                    changeAccess(user, tool, authority, token);
                  });
                })
                .fail(function(err){
                  console.error(err);
                });
              })
              .fail(function(err){
                  console.error(err);
              });
              break;
            
            case 'logout':
              logoutUser(token);
              break;
              
            case 'exit':
              break;
            default:
              break;
          }
        });
    }
  });
}

function setUser(token, logined_user) {
  var deferred = $.Deferred(),
      url = program.url+'api/auth/users';
  var options = {
    method: 'GET',
    json: true,
    jar: cookieJar,
    url: url,
    headers: {'X-CSRF-Token': token }
  };
  request(options, function(e, r, body) {
    if(e || r.statusCode !== 200) {
      console.error(e || body.error);
      deferred.reject({error: e || body.error});
    } else {
      var users = _.without(body.users, logined_user); 
      users.push('ALL(*)');
      var user_parameters = {
          type: 'list',
          name: 'user',
          message: 'select one user :',
          choices: users,
          validate: function (str) {
            return !_.isEmpty(str);
          },
          filter: function (str){
            return (str=='ALL(*)')?'*': str;
          }
      };
      inquirer.prompt(user_parameters )
        .then(function(parameters) {
          deferred.resolve(parameters.user);
      });
    } //if-else end
  });
  return deferred.promise();
}

function setTool(token, user) {
  var deferred = $.Deferred();
  var options = {
    method: 'POST',
    json: true,
    jar: cookieJar,
    body: { user: user},
    url: program.url+'api/tool/list',
    headers: {'X-CSRF-Token': token }
  };
  
  request(options, function(e, r, body) {
    if(e || r.statusCode !== 200) {
      console.error(e || body.error);
      deferred.reject({error: e || body.error});
    } else {
      if(body.tools.length >0) {
        var tool_parameters = {
          type: 'list',
          name: 'tool',
          message: 'select one tool :',
          choices: body.tools,
          validate: function (str) {
            return !_.isEmpty(str);
          }
        };
        inquirer.prompt(tool_parameters).then(function(parameters) {
          deferred.resolve(parameters.tool);
        });
      } else {
        deferred.reject('no assigned tool list avaliable for user: '+ user);
      }
    }
  });
  return deferred.promise();
}

function setAssignedTool(token, user) {
  var deferred = $.Deferred();
  var options = {
    method: 'POST',
    json: true,
    jar: cookieJar,
    body: { userId: user },
    url: program.url+'api/access/tools',
    headers: {'X-CSRF-Token': token }
  };
  
  request(options, function(e, r, body) {
    if(e || r.statusCode !== 200) {
      console.error(e || body.error);
      deferred.reject({error: e || body.error});
    } else {
      if(body.tools.length >0) {
        var tool_parameters = {
          type: 'list',
          name: 'tool',
          message: 'select one tool :',
          choices: body.tools,
          validate: function (str) {
            return !_.isEmpty(str);
          }
        };
        inquirer.prompt(tool_parameters).then(function(parameters) {
          deferred.resolve(parameters.tool);
        });
      } else {
        deferred.reject('no tool list avaliable for user: '+ user);
      }
    }
  });
  return deferred.promise();
}

function setAuthority() {
  var deferred = $.Deferred();
  var authority_parameters = {
          type: 'list',
          name: 'authority',
          message: 'select one authority (Read-Only or Read-Write ) :',
          choices: ['Read only authority', 'Write and read authority'],
          filter: function (str){
            return str.split(' ')[0].toLowerCase();
          }
        };
  inquirer.prompt(authority_parameters).then(function(parameters) {
    deferred.resolve(parameters.authority);
  });
  return deferred.promise();
}

function getToolList(parameters, token) {
  var options = {
    method: 'POST',
    json: true,
    jar: cookieJar,
    body: {
      userId: parameters.user,
      password: parameters.password,
    },
    url: program.url+'api/access/tools',
    headers: {'X-CSRF-Token': token }
  };
  request(options, function(e, r, body){
    if(e || r.statusCode !== 200) {
      console.error(e || body.error);
      //process.exit(1);
    } else {
      console.log('successful in getting tool list');
    }
  });
}

//add access authority
function addAccess(user, tool, authority,token) {
  var options = {
    method: 'POST',
    json: true,
    jar: cookieJar,
    body: {
      userId: user,
      toolId: tool,
      authority: authority
    },
    url: program.url+'api/access/add',
    headers: {'X-CSRF-Token': token }
  };
  request(options, function(e, r, body){
    if(e || r.statusCode !== 200) {
      console.error(e || body.error);
    } else {
      console.log('successful in adding access authority.');
    }
  });
}

function deleteAccess(user, tool, token) {
  
  var options = {
    method: 'POST',
    json: true,
    jar: cookieJar,
    body: {
      userId: user,
      toolId: tool
    },
    url: program.url+'api/access/remove',
    headers: {'X-CSRF-Token': token }
  };

  request(options, function(e, r, body){
    if(e || r.statusCode !== 200) {
      console.log('user='+user+' tool='+tool);
      console.error(e || body.error);
    } else {
      console.log('successful in deleting access authority');
    }
  });
}

function changeAccess(user, tool, authority, token) {
  var options = {
    method: 'POST',
    json: true,
    jar: cookieJar,
    body: {
      userId: user,
      toolId: tool,
      authority: authority
    },
    url: program.url+'api/access/update',
    headers: {'X-CSRF-Token': token }
  };

  request(options, function(e, r, body){
    if(e || r.statusCode !== 200) {
      console.error(e || body.error);
    } else {
      console.log('successful in updating access authority');
    }
  });
}

function logoutUser(token) {
  var options = {
    method: 'POST',
    json: true,
    jar: cookieJar,
    url: program.url+'api/auth/logout',
    headers: {'X-CSRF-Token': token }
  };
  request(options, function(e, r, body){
    if(e || r.statusCode !== 200) {
      console.error(e || body.error);
    } else {
      console.log('successful in Logout !' );
    }
  });
}
