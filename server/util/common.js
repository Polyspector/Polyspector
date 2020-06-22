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

module.exports.errHandle =  function(err) {
  var NestedError = require('nested-error');
  if (typeof err === 'object') {
          if (err.message) {
            console.log('\nMessage: ' + err.message);
          }
          var nestedErr= new NestedError(err);
          if (nestedErr.stack) {
            console.log('\nStacktrace:');
            console.log('====================');
            console.log(nestedErr.stack);
          }
  } else {
          console.log('Error: '+ err);
  }
 };

module.exports.logHandle =  function(msg) {
  console.log(msg);
};
