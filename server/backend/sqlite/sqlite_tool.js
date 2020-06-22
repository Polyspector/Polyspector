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
 * tools for sqlite
 */
var queryTool = new (require('./queryTool.js'))();
function sqlite_tool() {
    const TABLE_KEYWORD = /\s*CREATE\s+TABLE\s+\w+\s*\(/g;
    const CRETATE_TABLE = /\s*CREATE\s+TABLE\s+/g;
    const COL_KEYWORD = /\s*\w+\s*/g;
    const COL_KEYWORDS = /\s*\w+\s*[\s*\w+*\s*]*[\,|\)]/g;
    var exec = require('child_process').execSync;    
    if (exec == undefined) {
       /*if version of node is v0.11*/   
       exec = require("execsyncs");;
    }

    /**
     * get sqlite tables from file name
     * @param {string} file path
     * @param {string} file name
     * @return {array string}sqlite tables
     */
    this.getTables = function(path, filename) {
	var sqliteCommand = "sqlite3 -header --csv  "+ path + filename + " .table";
	var StringDecoder = require('string_decoder').StringDecoder;
	var decoder = new StringDecoder('UTF-8');
	try {
	    var result = exec(sqliteCommand);	
	} catch (e) {
	    console.log("error:"+e.message);
	    return [];
	}
	var words = decoder.write(result).split(/\s+/);
	var tables = [];
	words.forEach(function (elem) {
		if (elem != "") {
		    tables.push(elem);
		}
	    });
	return tables;
    };

    /**
     * chekck whether sqlite file or not
     * @param {string} file name
     * @return {bool} true or false
     */
    this.isDb = function(filename) {
	var ext = filename.split('.').pop().toLowerCase();
	if (ext==='db' || ext ==='sqlite' || ext ==='sqlite3') {
	    return true;
	} else {
	    return false;
	}
    }

    /**
     * execute sqlite "select" from file name and table name
     * @param {string} file path
     * @param {string} file name
     * @param {string} table name
     * @return {array string} selected data
     */
    this.select = function(path, filename, tableName) {
	var selectCommand = "\"select * from " + tableName + ";\"";
	var sqliteCommand = "sqlite3 -header --csv  "+ path + filename + " " + selectCommand;
	var StringDecoder = require('string_decoder').StringDecoder;
	var decoder = new StringDecoder('UTF-8');
	try {
	    var result = exec(sqliteCommand);	
	} catch (e) {
	    console.log("error:"+e.message);
	    return "";
	}
	var data = decoder.write(result);	
	return data;
    }

    /**
     * execute sqlite command
     * @param {string} file path
     * @param {string} file name
     * @param {string} table name
     * @return {array string} data
     */
    this.execute = function(path, filename, command) {
	var sqliteCommand = "sqlite3 -header --csv  "+ path + filename + " \"" + command +"\"";
	var StringDecoder = require('string_decoder').StringDecoder;
	var decoder = new StringDecoder('UTF-8');
	try {
	    var result = exec(sqliteCommand);	
	} catch (e) {
	    console.log("error:"+e.message);
	    return ["", e];
	}
	var data = decoder.write(result);	
	return [data, null];
    }

    /**
     * get schema using ".schema" command
     * @param {string} file path
     * @param {string} file name
     * @return {array string} schema
     */
    this.getSchemas = function(path, filename) {
	var sqliteCommand = "sqlite3 -header --csv  "+ path + filename + " .schema";
	var StringDecoder = require('string_decoder').StringDecoder;
	var decoder = new StringDecoder('UTF-8');
	try {
	    var result = exec(sqliteCommand);	
	} catch (e) {
	    console.log("error:"+e.message);
	    return [];
	}
	var words = decoder.write(result).split(";");
	var schemas = [];
	words.forEach(function (elem) {
		if (elem != "") {
		    elem = elem.replace(/[\n\r]/g,"");
		    schemas.push(elem);
		}
	    });
	return schemas;
    };	

    /**
     * get table from schema 
     * @param {string} schema
     * @return {string} table
     */
    this.getTableFromSchema = function (schema) {
	var table = "";
	var keyword = schema.match(TABLE_KEYWORD);
	if (keyword) {
	    var table = keyword[0].replace(CRETATE_TABLE, "");
	    table = table.replace(/\s*/g, "");
	    table = table.replace(/\(/g, "");
	}
	return table;
    };

    /**
     * get tables from schema 
     * @param {string} schema
     * @return {string} tables
     */
    this.getTablesFromSchemas = function(schemas) {
	var self = this;
	var tables = [];
	var table
	schemas.forEach (function (schema) {
		table = self.getTableFromSchema(schema);
		if (table != "") {
		    tables.push(table);
		}
	    });
	return tables;
    }

    /**
     * get columns from schema 
     * @param {string} schema
     * @return {string} columns
     */
    this.getColumnsFromSchema = function(schema) {
	var col;
	var cols = [];
	var keywords;
	keywords = schema.replace(TABLE_KEYWORD, "");
	keywords = keywords.match(COL_KEYWORDS, "");
	if (keywords) {
	    keywords.forEach(function (word) {
		    col = word.match(COL_KEYWORD);
		    col = col[0].replace(/^\s*|\s*$/g,'');
		    cols.push(col);
		});
	}
	return cols; 
    }

    /**
     * convert schema texts into schema object structure
     * @param {string array} schemas
     * @return {object} cols
     */
    this.convertSchemasDataIntoObjectData = function(schemas) {
	var self = this;
	var obj = {};
	var col;
	schemas.forEach (function (schema) {
		table = self.getTableFromSchema(schema);
		col = self.getColumnsFromSchema(schema);
		if (col != "") {
		    obj[table] = col;
		}
	    });
	Object.keys(obj).forEach(function(key) {
	});
	return obj;
    }

    /**
     * get schema object from sqlite file
     * @param {string array} schemas
     * @return {object} cols
     */
    this.getSchemaObject = function(path, filename) {
	var tables = this.getTables(path, filename);
	var schemas = this.getSchemas(path, filename);
	var schemaObj = this.convertSchemasDataIntoObjectData(schemas);
	return schemaObj;
    }
};
module.exports = sqlite_tool;
