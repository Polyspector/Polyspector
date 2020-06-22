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
    //progress = require('progress'),
    url = require('url'),
    _ = require('underscore'),
    inquirer = require('inquirer'),
    cheerio = require('cheerio');
var $  = require('jquery-deferred');

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
  .option('-a, --add', 'add new user')
  //.option('-d, --del', 'delete existed user')
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

var signup_parameters = [
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

var change_parameters = [
    { 
      type: 'password',
      name: 'password',
      message: 'Enter a new password (>=5 characters):',
      validate: function (str) {
        return !_.isEmpty(str) && str.length>=5;
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

var confirm_parameters = [
    { 
      type: 'confirm',
      name: 'confirm',
      message: 'Are you confirm to delete the user?',
      validate: function (str) {
        return !_.isEmpty(str);
      }
    }
];


var function_parameters = [
    {
      type: 'list',
      name: 'func',
      message: 'Select one action (Show user list, Add user, Delete user, Change Password, Logout, Exit)?',
      choices: ['Show user list','Add an new user','Delete an existed user', new inquirer.Separator(), 'Change password of current user', /*'Logout',*/ 'Exit'],
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
      //console.log(parameters);
      loginUser(parameters, token);
    });
  } else {
    console.log(e || r.body);
  }
});

function execFunctions(token) {
  inquirer.prompt(function_parameters).then(function(fparameters) {
    switch (fparameters.func) {
    case 'show':
      showUserList(signup_parameters);
      break;
    case 'add':
      inquirer.prompt(signup_parameters).then(function(parameters) {
        signupNewUser(parameters, token);
      });
      break;
    case 'delete':
      setUser(signup_parameters.user, token).done(function(userToBeDeleted) {
        inquirer.prompt(confirm_parameters).then(function(answer) {
          if(answer.confirm) {
            deleteUser(userToBeDeleted, token);
          } else {
            console.log("Cancel the action!");
          }
        });
      })
        .fail(function(err){
          console.error(err);
        });
      break;
    case 'change':
      inquirer.prompt(change_parameters).then(function(parameters) {
        changePassword(parameters, token);
      });
      break;
            case 'logout':
      logoutUser(token);
      break;
    case 'exit':
      logoutUser(token);
      break;
    default:
      break;
    }
  });
}

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
     /* setTimeout(function() {  
        logoutUser(token); 
        console.log('TimeOut!');
      }, 10000);*/
      execFunctions(token);
    }
  });
}

function showUserList(token) {
  var options = {
    method: 'GET',
    json: true,
    jar: cookieJar,
    url: program.url+'api/auth/users',
    headers: {'X-CSRF-Token': token }
  };
  request(options, function(e, r, body) {
    if(e || r.statusCode !== 200) {
      console.error(e || body.error);
    } else {
      body.users.forEach(function(user, index){
        console.log('('+(index+1)+') '+ user);
      });
    }
    //execFunctions(token);
  });
}

function signupNewUser(parameters, token) {
  var options = {
    method: 'POST',
    json: true,
    jar: cookieJar,
    body: {
      userId: parameters.user,
      password: parameters.password,
    },
    url: program.url+'api/auth/signup',
    headers: {'X-CSRF-Token': token }
  };
  request(options, function(e, r, body){
    if(e || r.statusCode !== 200) {
      console.error(e || body.error || body );
    } else {
      console.log('successful in adding new user :'  + parameters.user);
    }
    //execFunctions(token);
  });
}

function setUser(logined_user, token) {
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

function deleteUser(userToBeDeleted, token) {
  var options = {
    method: 'POST',
    json: true,
    jar: cookieJar,
    body: {
      user: userToBeDeleted
    },
    url: program.url+'api/auth/remove',
    headers: {'X-CSRF-Token': token }
  };
  request(options, function(e, r, body) {
    if(e || r.statusCode !== 200) {
      console.error(e || body.error);
    } else {
      console.log('successful in deleting user :'  + userToBeDeleted);
    }
    //execFunctions(token);
  });
}

function changePassword(parameters, token) {
  var options = {
    method: 'POST',
    json: true,
    jar: cookieJar,
    body: {
      password: parameters.password
    },
    url: program.url+'api/auth/update',
    headers: {'X-CSRF-Token': token }
  };

  request(options, function(e, r, body){
    if(e || r.statusCode !== 200) {
      console.error(e || body.error);
      //process.exit(1);
    } else {
      console.log('successful in updating password');
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
      //process.exit(1);
    } else {
      console.log('successful in Logout !' );
    }
  });
}
