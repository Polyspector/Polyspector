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
function ReadFile4Bigdata (entrance, filename) {
  var BIG = {
        NONE: 0,
        ROW: 1,
        COLUMN: 2,
        BOTH: 3 
    };
  
  var fs = require('fs'),
      Aggregator = require('./Aggregator'),
      d3 = require('d3');

  var startTime = (new Date()).getTime();
  var table = fs.readFileSync(entrance +  filename, 'utf8');
  var format = filename.split('.').pop().toLowerCase();
    
  var jsonarray = (format=='csv')? d3.csv.parse(table):
                  (format=='tsv')? d3.tsv.parse(table): table;
  console.log('CSV file read END: ' + ((new Date()).getTime() - startTime) + 'miliseconds');

  this.calculateInitValues(jsonarray, d3); //types, ranges
  console.log('calculate initial values: ' + ((new Date()).getTime() - startTime) + 'miliseconds');
  
  this.response = {_table_:{format: 'json'} };
  this.response._table_.types  = this.types;
  this.response._table_.ranges = this.ranges; //not change with options
  this.response._table_.big = BIG.ROW;
    
  this.aggregator = new Aggregator(jsonarray, this.itypes);
  
  console.log('aggregator preparation END: ' + ((new Date()).getTime() - startTime) + 'miliseconds');
}

ReadFile4Bigdata.prototype.calculateInitValues = function(jsonarray, d3) {
    var self = this,
        itypes = {},
        header = Object.keys(jsonarray[0]);
    
    //initialize itypes value
    header.forEach(function(column){
      itypes[column] = true; //is number
    });

    //itypes
    jsonarray.forEach(function(row, index, array){
      header.forEach(function(column){
        if(itypes[column]) { //isNumber value
           itypes[column] = !isNaN(+row[column]) && isFinite(row[column]); //check and set isString value
        }
      });
    });
    

    //ranges
    var ranges = {};
    var iheader = header.filter(function(column){
       return itypes[column];
    });
    jsonarray.forEach(function(row, index, array) {
      iheader.forEach(function(column){
          row[column] = +row[column];
      });
    });
    iheader.forEach(function(column){
      ranges[column]= d3.extent(jsonarray.map(function(d){
          return d[column];
      }));
    });

    var sheader = header.filter(function(column){
       return !itypes[column];
    });
    sheader.forEach(function(column){
      ranges[column]= d3.map(jsonarray, function(d){
            return d[column];
      }).keys().slice(0, 50);
    });
    this.ranges = ranges;
    
    //types
    var types = {};
    header.forEach(function(column){
      types[column] = (itypes[column]) ?'number': 'string';
    });
    this.itypes = itypes;
    this.types = types;

    return;
  };
  
  ReadFile4Bigdata.prototype.vts = function(wk_name) {
      return [wk_name];
  };
  
  ReadFile4Bigdata.prototype.syn = function(options, entrance, filename) {
    console.log('request options:  ' + JSON.stringify(options) );
    var startTime = (new Date()).getTime();
    this.response._table_.filled = this.aggregator.exec(options);
    console.log('aggregating process END: ' + ((new Date()).getTime() - startTime) + 'miliseconds');
    return this.response;
  };
  
  this.clear = function() {
    if(this.aggregator.clear) {
      this.aggregator.clear();
    }
  };
  


module.exports = ReadFile4Bigdata;
