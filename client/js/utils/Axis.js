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
 * Axis class to return format
 * @param {object} options Some parameters for this function
 */

define([], function(){
  var Axis = function(options) {
    this.options = options;
    /** AXIS Signature **/
    this.axisConfig ={
      "Dec"   : "",
      "%"     : "%",
      "Float" : "f",
      "SI"    : "s",
      "Round" : "r",
      "Hex"   : "x"
    };
    /**
     * Return format for Axis
     * @method getFormat
     * @param string
     * @memberOf Axis
     */
    this.getFormat = function(sign, digit) {
      if(this.axisConfig[sign] !== undefined){
        sign = this.axisConfig[sign];
      }else{
        sign = "";
      }
      if(digit !== ""){
        if(sign == "x"){
          format = "#0"+digit+sign;
        }else{
          format = "."+digit+sign;
        }
      }
      return d3.format(format);
    };
    /**
     * Return format for Axis
     * @method axixRange
     * @param order, range_max, [min, max]/[discrete], type, datatype
     * @memberOf Axis
     */
    this.axisRange = function(order, view_range_max, value_range, type, datatype = "number") {
      if(datatype == "number"){
        let range;
        if ((type == "x" && order == "ascending") ||
            (type == "y" && order == "descending")){
          range = [value_range[0], value_range[1]];
        }else if ((type == "y" && order == "ascending") ||
                  (type == "x" && order == "descending")){
          range = [value_range[1], value_range[0]];
        }
        return d3.scale.linear().range([0,view_range_max]).domain(range);
      }else if(datatype == "string"){
        if (order == "descending") {
          value_range.sort(function(a,b){
            return (a < b ? 1 : -1);
          });
        }
        return  d3.scale.ordinal().rangePoints([0,view_range_max]).domain(value_range);
      }
    };
  }
  return Axis;
});
