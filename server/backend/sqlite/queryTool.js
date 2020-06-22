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
 * tools for queries
 *
 */
function queryTool() {
    const QUERY_TABLE_KEYWORD = /\s*from\s*\w+/g;
    const QUERY_COL_KEYWORD = /select\s+((\w+\s*(\w*\s*\'(\w|[^\x01-\x7E])*\')*\,*\s*)+|\*)\s+from/g;
    const SELECT_STATEMENT = /select\s+/g;
    const FROM_STATEMENT = /\s*from\s*/g;
    const OTHERS = /\s*(\w*\s*\'(\w|[^\x01-\x7E])*\')/g;
    var path = __dirname+'/VirtualTable/';
    var fs = require('fs');
    var $  = require('jquery-deferred');

    /**
     * collect query files
     * @return {string array} query files
     */
    this.collectQuery = function() {
	var files = [];
	var list = fs.readdirSync(path); 
	for(var i=0; i<list.length; i++){
	    var fullPath = path + list[i];
	    try{
		var st = fs.statSync(fullPath);
		if(st.isFile()){
		    var ext = list[i].split('.').pop().toLowerCase();
		    if(ext==='qry') {
			files.push(list[i]);
		    }
		}
	    } catch(e) {
		console.log("error:"+e.message);
	    }
	}  
	return files;
    };
       
    /**
     * read a query using the "readFileSync" function
     * @param {string} filename
     * @return {string} query
     */
    this.readQuery = function(filename) {
	var ret;
	return fs.readFileSync(path + filename, 'utf8');
    };

    /**
     * get tables from a query statement
     * @param {string} query
     * @return {string array} tables
     */
    this.getTablesFromQuery = function(query) {
	var tables = [];
	var keywords = query.match(QUERY_TABLE_KEYWORD);
	keywords = keywords[0].replace(FROM_STATEMENT, "");
	keywords = keywords.replace(/^\s*|\s*$/g,'');;
	tables.push(keywords);
	return tables;
    };

    /**
     * get columns from a query statement
     * @param {string}  query
     * @return {string} columns
     */
    this.getColumnsFromQuery = function (query) {
	var cols;
	var keywords = query.match(QUERY_COL_KEYWORD);
	keywords = keywords[0].replace(SELECT_STATEMENT, "");
	keywords = keywords.replace(FROM_STATEMENT, "");
	keywords = keywords.replace(OTHERS, "");
	keywords = keywords.replace(/\s/g, "");
	cols = keywords.split(",");
	return cols;
    };

    /**
     * check whether "src" is included in "array"
     * @param {string} src
     * @param {string array} array
     * @return {bool} true or false
     */
    this.isIncludedInArray = function(src, array) {
	var flg = false;
	array.forEach(function (a) {
		if (src == a) {
		    flg = true;
		}
	    });
	return flg;
    };

    /**
     * check whether a table is included in tables of a query
     * @param {string array} qtables
     * @param {string} table
     * @return {bool} true or false
     */
    this.isMatchedTable = function(qtables, table) {
	var self = this;
	var flg = true;
	var keys;
	flg = self.isIncludedInArray(table, qtables);
	return flg;
    };

    /**
     * check whether columns is included in columns of a query
     * @param {string array} qColumns
     * @param {string array} columns
     * @return {bool} true or false
     */
    this.isMatchedColumns = function(qColumns, columns) {
	var self = this;
	var flg = true;
	var keys;
	qColumns.forEach(function(qColumn) {

		if (qColumn == "*") {
		    //All columns 
		    flg = flg && true;
		} else {
		    flg = flg && self.isIncludedInArray(qColumn, columns);
		}
	    });	
	return flg;
    };

    /**
     * get matched queries
     * @param {string} table
     * @param {string array} columns
     * @return {string array} queries
     */
    this.getMatchedQueriesFromSchema = function(table, columns) {
	var self = this;
	var query;
	var queries = [];
	var qTables;
	var qColumns;
	var files = self.collectQuery();
	files.forEach(function (file) {
		query = self.readQuery(file);
		qTables = self.getTablesFromQuery(query);
//		qColumns = self.getColumnsFromQuery(query);
		if (self.isMatchedTable(qTables, table)
	        //カラム名のマッチングはとりあえず行わない
/*		    && self.isMatchedColumns(qColumns, columns)*/){
		    queries.push(query);
		}
	    });
	return queries;
    };    
};
module.exports = queryTool;
