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
function CreateRandomData () {

  var faker= require('faker');

  var BIG = {
        NONE: 0,
        ROW: 1,
        COLUMN: 2,
        BOTH: 3 
    };

  //public member for asyn call
  this.vts = function(wk_name) {
      return ['original'];
  };

  this.syn = function(options, entrance, filename) { 
    
    console.log('request options:  ' + JSON.stringify(options)  );
    
    var response = {_table_:{}}, data=[];
 
   for(var i =0; i<1000; i++) {
      var item ={};
      item.user = faker.Name.firstName();
      item.salary = faker.Helpers.randomNumber(100);
      item.address = faker.Address.streetAddress();
      item.time =  new Date(faker.Date.between("2015-01-01", "2016-10-31")).getMonth()+1; 
      data.push(item);
    }

    response._table_.big = BIG.NONE;
    response._table_.format = 'json';
    response._table_.filled = data;
    
    return response;
  };
}

module.exports = CreateRandomData;
