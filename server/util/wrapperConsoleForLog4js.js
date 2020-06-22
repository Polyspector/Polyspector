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

/**
 * @fileoverview implement for wrapper of replacing log4js for console modules
 */

//Ex) LOG4JS=on node start.js
var log4js = process.env.LOG4JS;
if (log4js != undefined && log4js == "on") {
    var func = require('./consoleForLog4js');
    console.log = function caller(text) {
	func.log(caller, text);
    };
    console.error = function caller(text) {
	func.error(caller, text);
    };
    console.assert = function caller(text) {
	func.assert(caller, text);
    };
    console.warn = function caller(text) {
	func.warn(caller, text);
    };
}
