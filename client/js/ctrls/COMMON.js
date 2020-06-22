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
define(function(){
  var MyClass = function(){};

  //create an new hash/array from event String
  MyClass.prototype.makeObject = function(param, initValue ) {
      var ret = initValue;
      if(param) {
        if( param.constructor == String) {
          try {
            ret = JSON.parse(param);
          } catch(err) {
            console.error(err);
          }
        } else  if( param.constructor == Array) {
          ret = _.clone(param); //shallow clone
        } else if( param.constructor == Object) {
          ret = $.extend(true, {}, param); //object deep clone
        } else {
          ret = param;
        }
      }
      return ret;
  };

 MyClass.prototype.stringify = function(json) {
  　var ret, old = Date.prototype.toJSON;
    Date.prototype.toJSON = function() {
      return this.getFullYear() + '-' + ('0'+(this.getMonth()+1)).slice(-2) + '-' + ('0'+this.getDate()).slice(-2) + 'T' +
     ('0'+this.getHours()).slice(-2) + ':' + ('0'+this.getMinutes()).slice(-2) + ':' + ('0'+this.getSeconds()).slice(-2) + '.000Z';
  　}
    ret = JSON.stringify(json);
    Date.prototype.toJSON = old;
    return ret;
 }
 //compare two arrray have the same elements without considering their orders
 //@param: @arr1, @arr2
 MyClass.prototype.isEqualArray = function(arr1, arr2) {
    if(arr1.length !== arr2.length)
        return false;
    for(var i = arr1.length; i--;) {
        if(arr2.indexOf(arr1[i]) < 0 ) {
            return false;
        }
    }
    return true;
 };
 
  //compare two object have the same elements without considering their orders
 //@param: @arr1, @arr2
 MyClass.prototype.isEqualObject= function(obj1, obj2) {
    var ret = false;
    if(obj1.constructor == String && obj2.constructor== String ) {
        ret= (obj1 == obj2);
    } else 
    if(obj1.constructor == Array && obj2.constructor== Array ) { //order in unrelated
       ret = (_.difference(obj1, obj2).length <=0 && _.difference(obj2, obj1).length <=0) ; 
    } else 
    if(obj1.constructor == Object && obj2.constructor== Object ) {
       ret= (JSON.stringify(obj1) == JSON.stringify(obj2) ); //order is important!
    }
    return ret;
 };
 
  //compare two object have the same elements without considering their orders
 //@param: @arr1, @arr2
 MyClass.prototype.isOrderEqualObject= function(obj1, obj2) {
  var ret = false;
  if(obj1.constructor == String && obj2.constructor== String ) {
      ret= (obj1 == obj2);
  } 
  else 
  if(obj1.constructor == Array && obj2.constructor== Array ) { //order in unrelated
     if(obj1.length == obj2.length) {
        ret = true;
        for(var i=0; i< obj1.length; i++){
          if(obj1[i]!==obj2[i]) {
            ret = false;
            break;
          }
        };
     }
  } 
  else 
  if(obj1.constructor == Object && obj2.constructor== Object ) {
     ret= (JSON.stringify(obj1) == JSON.stringify(obj2) ); //order is important!
  }
  return ret;
};


 MyClass.prototype.numberAfterDot= function (val) {
      var number = 0, sval = val? val.toString():'';
      if(sval.split('.').length >1) {
          number = sval.split('.')[1].length;
      }
      return number;
 };
 
/*
MyClass.prototype.alert = function($where, message) {
  $where.text(message).dialog();
};
*/

 return new MyClass();
 
});
