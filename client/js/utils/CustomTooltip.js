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
/** @module CustomTooltip*/
/**
 * Show and hide tooltip if need
 * @class CustomTooltip
 * @returns {CustomTooltip}
 */
define(["css!./CustomTooltip"],function(){
  var CustomTooltip = function() {
    this.initialize = function(){
      if(d3.selectAll("div.tooltip")[0].length === 0){
        d3.select("body").append("div")
          .attr("class","tooltip")
          .style("will-change", "transform")
          .style("display","none");
      }
    };
    this.table = function(data,config){
      var caption = "";
      if(config.caption !== undefined){
        caption = config.caption;
      }
      var prefix = "";
      if(config.caption !== undefined){
        prefix = config.prefix;
      }
      var postfix = "";
      if(config.postfix !== undefined){
        postfix = config.postfix;
      }
      var thead = "<table style='background-color:#fff'><thead><tr><th>"+ caption+"</th></tr>";
      thead += "</thead>";
      var tbody = "<tbody>";
      if(config.total !== undefined){
        tbody += "<tr><td>Total</td>";
        tbody += "<td width='10px'></td>";
        tbody += "<td>"+config.total+"</td></tr>";
      }
      if(config.attributes !== undefined && config.attributes.length > 0){
        config.attributes.forEach(function(d){
          var color = "#666";
          if(d.color !== undefined){
            color = d.color;
          }
          var fontWeight = "normal";
          if(d.fontWeight !== undefined){
            fontWeight = d.fontWeight;
          }
          tbody += "<tr>";
          tbody += "<td style=color:"+ color;
          tbody += ";font-weight:"+ fontWeight +";>"+ d.key+ "</td>";
          tbody += "<td></td>";
          tbody += "<td style=color:"+ color;
          tbody += ";font-weight:" + fontWeight +";>";
          tbody += prefix + d.value + postfix+"</td>";
          tbody += "</tr>";
        });
      }
      if(config.reverse === undefined || config.reverse !== true) {
        data.forEach(function(d){
          addLine(d);
        });
      } else {
        data.reverse().forEach(function(d){
          addLine(d);
        });
      }
      function addLine(d){
        var color = null;
        if(d.color !== undefined){
          color = d.color;
        }
        var fontWeight = "normal";
        if(d.fontWeight !== undefined){
          fontWeight = d.fontWeight;
        }
        tbody += "<tr>";
        tbody += "<td style=color:"+ color;
        tbody += ";font-weight:"+ fontWeight +";>"+ d.key+ "</td>";
        tbody += "<td></td>";
        tbody += "<td style=color:"+ color;
        tbody += ";font-weight:" + fontWeight +";>";
        tbody += prefix + d.value + postfix+"</td>";
        tbody += "</tr>";
      }
      tbody += "</tbody></table>";
      return thead + tbody;
    };
    this.show = function(contents, event) {
      var offset = {x: 20, y: -20};
      var tooltip = d3.select("div.tooltip")
        .style("display", "block");
      if(event[0] === undefined){
        // event IS NOT  MOUSE EVENT
        tooltip.style("left",event.pageX + offset.x+ "px")
          .style("top",event.pageY + offset.y+ "px");
      }else{
        // event IS MOUSE EVENT
        tooltip.style("left",event[0] + offset.x+ "px")
          .style("top",event[1]+ offset.y+ "px");
      }
      if(tooltip.select("div.content")){
        tooltip.select("div.content").remove();
      }
      tooltip.append("div").attr("class","content")
        .html(contents);
    };
    this.hide = function() {
      d3.select("div.tooltip").style("display", "none");
    };
  };
  return CustomTooltip;
});
