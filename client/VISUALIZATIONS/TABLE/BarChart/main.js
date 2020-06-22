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
 * @fileoverview implement for BarChart
 */

/** @module BarChart*/

/**
 * Initial config additional library files for this chart
 */

/**
 * Create BarChart main function
 * @class BarChart
 * @param {type} CustomTooltip CustomTooltip class
 * @returns {BarChart}
 */
define(["util/CustomTooltip",
        "js/utils/Axis",
        "text!./control.html",
        "css!./BarChart"], function (CustomTooltip,Axis,designTpl) {
  /**
    * Constructor create Bar Chart
    * @method BarChart
    * @memberOf BarChart
    * @returns {BarChart}
    */
  var BarChart = function (io) {
    this.io = io;
    // Data Mapper
    this.io.dataManager().setMapperProps({
      xaxis: {label: 'X axis' , map2: '', color_label: true, color_column: true},
      yaxis: {type: 'number', label: 'Y axis' , map2:[], color_label: true , color_column: true}
    });
    this.axisUtils = new Axis();
    this.io.designManager().setTemplate(designTpl);
  };

  /**
    * update chart according with changed of interface variables
    * @method BarChart
    * @memberOf BarChart
    * @returns {BarChart}
    */
  BarChart.prototype.update = function (changed) {
    this.draw();
  };

  /**
   * render Bar Chart
   * @method render
   * @memberOf BarChart
   */
  BarChart.prototype.render = function (containerWidth, containerHeight) {
    let self = this;
    self.initialize(containerWidth, containerHeight);
    let selectedLegends = self.io.dataManager().getMapper("yaxis");
    self.io.designManager().setControl("xaxisLabelFocus",
      {type:"selection", name:"X Axis Label Focused By Value", range: selectedLegends, value:[]});
    self.draw();
    return self.root_dom;
  };

  /**
   * draw Bar Chart
   * @method draw
   * @memberOf BarChart
   */
  BarChart.prototype.draw = function () {
    this.createHeader();
    let data = this.transformData(true);
    if(data !== undefined && data.length > 0){
      this.createChart(data);
    }
    return this.root_dom;
  };

  /**
   * initialize
   * @method initialize
   * @memberOf BarChart
   */
  BarChart.prototype.initialize = function (containerWidth, containerHeight) {
    /** Layout **/
    this.layout ={
      top  : 20,
      yaxis: {width: 80},
      main:  {margin:{right: 25}}
    };
    /*******************************
     ** Chart Customize Parameter **
     *******************************/
    /** Y AXIS **/
    // Y AXIS [height - XAxis_height]
    this.yConfig = {
      scale: "basic", // ["basic", "log"]
      caption : {top:-60, left:"auto"}
    };
    /** X AXIS **/
    // X AXIS [width - YAxis_width]
    this.xConfig = {
      sort    : {key: "total", order: "descending"},
      label   : {upper:100},
      caption : {height:30, top:20, left:"auto"},
      scrollbar: {height:25}
    };
    /** Tooltip **/
    this.tooltipConfig = {
      caption : "",
      attributes : [],
      prefix  : "",
      postfix : "",
      reverse : true
    };

    /** Inner Variable **/
    // VIEW
    this.tooltip      = new CustomTooltip();
    this.tooltip.initialize();
    this.svg          = undefined;
    this.ySvg         = undefined;
    this.root_dom  = undefined;
    this.container = undefined;
    this.containerWidth = containerWidth;
    this.containerHeight= containerHeight;

    // X AXIS
    // -Label Domain
    this.xLabel = d3.scale.ordinal();
    // -Grouped Domain
    this.xGroupLabel = d3.scale.ordinal();
    this.xAxis = d3.svg.axis().scale(this.xLabel).orient("bottom");
    this.beforeColorColumnName = undefined;
    this.beforeSelected = {xrow: undefined,
                           xval: undefined,
                           y: undefined};
  };

  /**
   * Transform received data to understandable data format for this chart
   * @method transformData
   * @memberOf BarChart
   */
  BarChart.prototype.transformData = function (refresh) {
    let self = this;
    let colorManager = self.io.colorManager();
    let dataManager = self.io.dataManager();
    let designManager = self.io.designManager();
    // 1. Setup Axis Height
    self.axisHeight = self.containerHeight -
      self.xConfig.caption.height -
      designManager.getValue("xaxisLabelHeight") -
      self.xConfig.scrollbar.height;

    self.y = d3.scale.linear().range([self.axisHeight,0]);
    self.yAxis = d3.svg.axis().scale(self.y).orient("left");

    // 2. Transform Data to Chart Format
    if(_.isEmpty(dataManager.getMapper("xaxis"))){
      return [];
    }

    return chartData(refresh);

    // inner method
    function chartData(refresh){
      let chartData = [];
      let refiner = dataManager.getColumnRefiner();
      let selectedLegends = [];
      if(self.io.fullrange()){
        selectedLegends = dataManager.getMapper("yaxis");
      }else{
        dataManager.getMapper("yaxis").forEach(function(d){
          if(refiner.indexOf(d) !== -1){
            selectedLegends.push(d);
          }
        });
      }
      if(selectedLegends == undefined){
        return;
      }
      self.beforeColorColumnName = colorManager.getDomainName();
      var graphType = designManager.getValue("graphType");
      var total = 1;
      dataManager.getFilteredRows().forEach(function(row){
        var element = {};
        element.key = row[dataManager.getMapper("xaxis")];
        selectedLegends.forEach(function(k){
          element[k] = row[k];
          total += +row[k];
          if(colorManager.getDomainName() !== "Y Axis"){
            element["__color__"] = {};
            element["__color__"][colorManager.getDomainName()] = row[colorManager.getDomainName()];
          }
        });
        chartData.push(element);
      });
      if((selectedLegends !== undefined) &&
         (selectedLegends.length > 0 )){
        var y0List = {};
        if(graphType == "stacked" ||graphType == "normalized"){
          chartData.forEach(function(d){
            if(y0List[d.key] === undefined){
              y0List[d.key] = 0;
            }
            d.group = selectedLegends.map(function(name){
              return {key: d.key,
                      name: name,
                      y0:y0List[d.key],
                      y1: y0List[d.key] += +d[name],
                      color: d["__color__"]};
            });
            d.total = d.group[d.group.length - 1].y1;
            y0List[d.key] = d.group[d.group.length - 1].y1;
            if(graphType == "normalized"){
              d.group.forEach(function(e) {
                e.y0 /= d.total;
                e.y1 /= d.total;
              });
            }
          });
        }else if(graphType == "grouped"){
          chartData.forEach(function(d){
            d.group = selectedLegends.map(function(name){
              if(y0List[d.key+"__"+name] === undefined){
                y0List[d.key+"__"+name] = 0;
              }
              return {key: d.key,
                      name: name,
                      y0:y0List[d.key+"__"+name],
                      y1: y0List[d.key+"__"+name] += +d[name],
                      color: d["__color__"]};
            });
            d.total = 0;
            d.group.forEach(function(e){
              d.total += e.y1;
            });
          });
        }
      }
      return chartData;
    }
  };

  /**
   * create header of chart
   * @method createHeader
   * @memberOf BarChart
   */
  BarChart.prototype.createHeader = function () {
    var self = this;
    // Initialize
    if(self.root_dom === undefined){
      self.root_dom   = self.root_dom  = document.createElement("div");
      self.container = d3.select(self.root_dom);
    }
    if(self.container.selectAll("div.barchart")){
      self.container.selectAll("div.barchart").remove();
    }
    var yaxisDiv,mainDiv,xaxiscaptionDiv;

    // Draw Div
    drawDiv();

    // Draw yAxisCaption
    drawXAxisCaptionSVG();
    var mainHeight = self.containerHeight - self.xConfig.caption.height - self.xConfig.scrollbar.height;
    // Draw yAxis
    drawYAxisSVG();

    // Draw Main
    var svgWidth = self.containerWidth - self.layout.yaxis.width - self.layout.main.margin.right;
    self.svg = mainDiv.append("svg")
      .attr("class", "barchart")
      .style("width", svgWidth)
      .style("height", mainHeight)
      .append("g")
      .attr("transform", "translate(0," + self.layout.top +")");

    function drawDiv(){
      var barDiv = self.container.append("div")
            .attr("class","barchart");
      // Define Div
      yaxisDiv      = barDiv.append("div")
        .attr("class","barchart-yaxis")
        .style("width", function(){
          return self.layout.yaxis.width;
        });
      mainDiv       = barDiv.append("div")
        .attr("class","barchart-main")
        .style("width", function(){
          return self.containerWidth - self.layout.yaxis.width - self.layout.main.margin.right +"px";
        })
        .style("overflow-x","auto");
      xaxiscaptionDiv = barDiv.append("div")
        .attr("class","barchart-xaxis-caption");
    }
    function drawYAxisSVG(){
      self.ySvg = yaxisDiv.append("svg")
        .attr("class","yaxis")
        .attr("width", self.layout.yaxis.width)
        .attr("height", mainHeight)
        .append("g")
        .attr("transform", "translate(" +
              self.layout.yaxis.width+","+ self.layout.top + ")");
    }
    function drawXAxisCaptionSVG(){
      xaxiscaptionDiv.append("svg")
        .attr("class", "xaxiscaption")
        .attr("width", self.containerWidth)
        .attr("height", self.xConfig.caption.height)
        .append("g")
        .attr("transform","translate(0,"+ self.xConfig.caption.top+")")
        .append("text").attr("class","xaxis")
        .text(self.io.designManager().getValue("xaxisCaption"))
        .attr("fill", "white")
      xaxiscaptionDiv.select("text.xaxis")
        .attr("x", function(){
          if(self.xConfig.caption.left === "auto" ||
             self.xConfig.caption.left === undefined){
            return self.containerWidth/2  -
              d3.select(this).property("clientWidth")/2;
          }
          return  self.xConfig.caption.left;
        });
    }
  };

  /**
   * create bar chart depend on selected items by user
   * @method creatChart
   * @memberOf BarChart
   */
  BarChart.prototype.createChart = function (data) {
    var self = this;
    // 1. Sort   Data
    sortData();
    // 2. Draw   Axis
    self.drawAxis(data);
    // 3. Draw   Chart
    self.drawChart(data);
    function sortData(){
      if(self.io.designManager().getValue("xaxisOrder") == "VALUE(descending)"){
        data = data.sort(function(a,b){
          return d3.descending(a[self.xConfig.sort.key], b[self.xConfig.sort.key]);
        });
      }else if(self.io.designManager().getValue("xaxisOrder") == "VALUE(ascending)"){
        ata = data.sort(function(a,b){
          return d3.ascending(a[self.xConfig.sort.key], b[self.xConfig.sort.key]);
        });
      }
    }
  };
  /**
   * draw x axis and y axis of chart
   * @method drawAxis
   * @memberOf BarChart
   * @returns {undefined}
   **/
  BarChart.prototype.drawAxis = function (data) {
    var self = this;
    var graphType = self.io.designManager().getValue("graphType");
    // Setup xLabel range
    var axisWidth = self.containerWidth - self.layout.yaxis.width - self.layout.main.margin.right;

    var labels = data.map(function(d){return d.key;});

    var uniqueKeys = {};
    for (var i = 0; i < data.length; i++) {
      uniqueKeys[data[i].key] = 1 + (uniqueKeys[data[i].key] || 0);
    }

    var minWidth = self.io.designManager().getValue("barMinWidth") *  Object.keys(uniqueKeys).length;

    //if(labels.length > self.xConfig.label.upper){
    if(axisWidth < minWidth) {
      axisWidth = minWidth;
      self.container.select("svg.barchart").style("width", minWidth +"px");
    }

    self.xLabel = d3.scale.ordinal().rangeBands([0,axisWidth], 0.1);
    // Setup Axis
    self.xLabel.domain(data.map(function(d){return d.key;}));
    var ymax,ymin;
    if(graphType == "normalized") {
      ymax = 1;
      ymin = 0;
      if(self.io.designManager().getValue("yaxisRangeMaxAuto") == "OFF"){
        ymax = (parseInt(self.io.designManager().getValue("yaxisRangeMaxManual")) /100);
      }
      if(self.io.designManager().getValue("yaxisRangeMinAuto") == "OFF"){
        ymin = (parseInt(self.io.designManager().getValue("yaxisRangeMinManual"))/100);
      }
      self.y.domain([ymin,ymax]);
    } else {
      ymax = 0;
      ymin = 0;
      var tmp  = 0;
      if(graphType == "stacked"){
        if(self.io.designManager().getValue("yaxisRangeMinAuto") == "ON"){
          tmp = d3.min(data,function(d){ return +d.total;});
          if(tmp < ymin && tmp < 0){
            ymin = tmp;
          }
        }else{
            ymin = self.io.designManager().getValue("yaxisRangeMinManual");
        }
        if(self.io.designManager().getValue("yaxisRangeMaxAuto") == "ON"){
          ymax = +d3.max(data,function(d){ return +d.total;});
        }else{
          ymax = +self.io.designManager().getValue("yaxisRangeMaxManual");
        }
        var ymaxMargin = +self.io.designManager().getValue("yaxismargin");
        if(ymaxMargin !== undefined && ymaxMargin !== 0 ){
            ymax = ymax + ymax*ymaxMargin*0.01;
        }
      }else if(graphType == "grouped"){
        var selectedLegends = [];
        if(self.io.fullrange()) {
          selectedLegends = self.io.dataManager().getMapperProps("yaxis").map2;
        }else{
          selectedLegends = self.io.dataManager().getColumnRefiner();
        }
        selectedLegends.forEach(function(key){
          tmp = self.io.dataManager().getDataRange(key);
          if(self.io.designManager().getValue("yaxisRangeMinAuto") == "ON"){
            if(tmp[0] < 0 && tmp[0] <ymin){
              ymin = tmp[0];
            }
          }else{
            ymin = +self.io.designManager().getValue("yaxisRangeMinManual");
          }
          if(self.io.designManager().getValue("yaxisRangeMaxAuto") == "ON"){
            var ymaxList = {};
            var ymaxTmp = 0;
            data.forEach(function(d){ ymaxTmp += +d[key];});
            if(ymaxTmp > ymax){
              ymax = ymaxTmp;
            }
            var ymaxMargin = +self.io.designManager().getValue("yaxismargin");
            if(ymaxMargin !== undefined && ymaxMargin !== 0 ){
              ymax = ymax + ymax*ymaxMargin*0.01;
            }
          }else{
            ymax = +self.io.designManager().getValue("yaxisRangeMaxManual");
          }
        });
        self.xGroupLabel.domain(selectedLegends)
          .rangeRoundBands([0, self.xLabel.rangeBand()]);
      }
      self.y.domain([ymin, ymax]);
    }

    // Initialize X Axis
    var xAxis = d3.svg.axis().scale(self.xLabel).orient("bottom");

    // Initialize Y Axis
    var type = self.io.designManager().getValue("yaxisticktype");
    var digit = self.io.designManager().getValue("yaxisdigitnum");
    var yAxis = d3.svg.axis().scale(self.y).orient("left")
      .ticks(self.io.designManager().getValue("yaxisticknum"))
      .tickFormat(self.axisUtils.getFormat(type, digit));

    // Create X Axis
    /// Add X Axis Label Action
    self.svg.append("g")
      .attr("class","xaxis")
      .attr("transform", "translate(0," + (self.axisHeight) + ")")
      .call(xAxis)
      .selectAll("text")
      .attr("id", function(d){
        return d;
      })
      .style("text-anchor", "start")
      .attr("dx",".5em")
      .attr("dy","-.3em")
      .attr("transform","rotate(90)")
      .attr("font-size",
            self.io.designManager().getValue("xaxisCaptionFontsize")+"pt" )
      .style("fill", function(d){
        var refiner = self.io.dataManager().getRowRefiner();
        var array = refiner[self.io.dataManager().getMapperProps("xaxis").map2];
        if(array !== undefined && array.indexOf(d) !== -1){
          return "orange";
        }
        return "white";
      })
      .on("click",function(d){
        self.clickAction({key: d});
      });

    self.ySvg.append("g")
      .attr("class", "yaxis")
      .call(yAxis)
      .append("text")
      .attr("class"," yaxiscaption")
      .attr("transform", "rotate(-90)")
      .attr("y", self.yConfig.caption.top)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text(self.io.designManager().getValue("yaxisCaption"))
      .attr("fill", "white");
    self.ySvg.selectAll("text").attr("fill", "white");
    /// Centerize
    self.ySvg.select("text.caption")
      .attr("x", function(){
        if(self.yConfig.caption.left === "auto" ||
           self.yConfig.caption.left === undefined){
          var left = (self.axisHeight - self.xConfig.label.height)/2 -
                self.ySvg.select("text").property("clientWidth")/2;
          return  -left;
        }
        return self.yConfig.caption.left;
      });
  };

  BarChart.prototype.drawChart = function(baseData){
    var self = this;
    var dataManager = self.io.dataManager();
    var designManager = self.io.designManager();
    var colorManager = self.io.colorManager();
    var highlightColumns = dataManager.getMapperProps("yaxis").map2;
    var row = dataManager.getMapperProps("xaxis").map2[0];
    var highlightRows = dataManager.getRowRefiner()[row];
    if(self.io.fullrange()){
      highlightColumns = dataManager.getColumnRefiner();
    }
    if(highlightRows == undefined){
      highlightRows = [];
    }
    var data = baseData.filter(function(d){return d.total > 0;});
    if(data.length > 0){
      var bar = self.svg.selectAll(".g_barchart")
        .data(data)
        .enter().append("g")
        .attr("class", "g_barchart")
        .attr("transform", function(d){
          return "translate(" + self.xLabel(d.key) + ",0)";});
      var clickmode = designManager.getValue("clickmode");
      var rects = bar.selectAll("rect").data(function(d){return d.group;});
      rects.exit().remove();//remove unneeded circles
      rects.enter().append("rect")
        .attr("id", function(d){ return d.key; })
        .attr("class", function(d){
          if((clickmode == "yaxis" && highlightColumns.indexOf(d.name) !== -1) ||
             (clickmode == "xaxis")){
            return "_" + d.name.replace(/ /g, "_") + " rect_barchart";
          }
          return "_" + d.name.replace(/ /g, "_") + " rect_barchart hideme";
        })
        .attr("width", function(d){
          return getParameter("width");
        })
        .attr("y", self.axisHeight)
        .attr("height", 0)
        .style("fill", function(d){
          if(colorManager.getDomainName() !== "Y axis"){
            return colorManager.getColorOfRow(d.color);
          }
          return colorManager.getColor(d.name);
        })
        .style("fill-opacity", 1.0)
        .on("click", function(d){
          self.clickAction(d);
        })
        .on("mouseover", function(d,i){
          d3.select(this).style("fill-opacity", 0.7);
          var targetData = baseData.filter(function(e){
            return d.key == e.key;
          });
          var tableData = createTableData(targetData, d);
          self.tooltip.show(self.tooltip.table(tableData,self.tooltipConfig), d3.event);
        })
        .on("mouseout", function(d,i){
          d3.select(this).style("fill-opacity", 1);
          self.tooltip.hide();
        })
        .attr("x", function(d){ return getParameter("x", d);})
        .attr("y", function(d){ return getParameter("y", d);})
        .attr("height", function(d){ return getParameter("height", d);});
    }

    // Update X AXIS Label (Zero)
    var chartXLabel = [];
    var chartXLabelSpecNEZero = [];
    var targetColumns = designManager.getValue("xaxisLabelFocus");
    if(targetColumns) {
      data.forEach(function(d){
        for(var i=0; i <targetColumns.length;i++){
          if( d[targetColumns[i]] !== undefined && +d[targetColumns[i]] !== 0){
            chartXLabelSpecNEZero.push(d.key);
            break;
          }
        }
        chartXLabel.push(d.key);
      });
    }
    self.svg.selectAll("g.x.axis")
      .selectAll("text")
      .attr("class", function(d){
        if(chartXLabel.indexOf(d) === -1){
          return "x axis zero";
        }
        return "x axis";
      })
      .style("fill", function(d){
        var refiner = dataManager.getRowRefiner();
        var array = refiner[dataManager.getMapperProps("xaxis").map2];
        if(array !== undefined && array.indexOf(d) !== -1){
          return "orange";
        }
        return "white";
      })
      .text(function(d){
        if(chartXLabelSpecNEZero.indexOf(d) !== -1){
          return d;
        }
        return d;
      })
      .on("mouseover", function(key){
        var targetData = baseData.filter(function(d){
          return d.key == key;
        });
        var tableData = createTableData(targetData);
        self.tooltip.show(self.tooltip.table(tableData,self.tooltipConfig), d3.event);
      })
      .on("mouseout", function(){
        self.tooltip.hide();
      });

    function createTableData(data, target){
      var total = d3.max(data, function(d){ return +d.total;});
      var highlights = dataManager.getMapperProps("yaxis").map2;
      if(self.io.fullrange()){
        highlights = dataManager.getColumnRefiner();
      }
      if(target !== undefined){
        return getDetails();
      }
      return getSummary();

      function getSummary(){
        var tableData = [];
        var legendsKey   = [];
        var legendsTotal = {};
        var legendsColor = {};
        data.forEach(function(d){
          if(legendsKey.length === 0){
            d.group.forEach(function(g){
              legendsTotal[g.name] = 0;
              legendsKey.push(g.name);
              legendsColor[g.name] = d.__color__;
            });
          }
          legendsKey.forEach(function(key){
            legendsTotal[key] += +d[key];
          });
          if(total < d.total){
            total = d.total;
          }
        });
        // COLUMN
        for(var key in legendsTotal){
          var elem   = {};
          elem.key   = key;
          if(designManager.getValue("graphType") !== "normalized"){
            elem.value = legendsTotal[key];
          }else{
            var ratio = parseInt(+legendsTotal[key]/total*1000)/10;
            elem.value = legendsTotal[key] + "("+ ratio +"%)";
          }
          if(highlights.indexOf(key) !== -1){
            if(self.io.colorManager().getDomainName() !== "Y axis"){
              elem.color = colorManager.getColorOfRow(legendsColor[key]);
            }else{
              elem.color = colorManager.getColor(key);
            }
          }
          tableData.push(elem);
        }
        self.tooltipConfig.caption = data[0].key;
        self.tooltipConfig.attributes = [{key : "Total", value: total}];

        return tableData;
      }

      function getDetails(){
        var tableData = [];
        var targetFlag = false;
        data.forEach(function(d){
          d.group.forEach(function(g){
            var elem = {};
            targetFlag = false;
            if(g == target){
              targetFlag = true;
            }
            elem.key = g.name;
            if(self.io.designManager().getValue("graphType") !== "normalized"){
              elem.value = d[g.name];
            }else{
              var ratio = parseInt(d[g.name]/total*1000)/10;
              elem.value = d[g.name] + "("+ ratio +"%)";
            }
            if(highlights.indexOf(g.name) !== -1){
              if(self.io.colorManager().getDomainName() !== "Y axis"){
                elem.color = self.io.colorManager().getColorOfRow(d.__color__);
              }else{
                elem.color = self.io.colorManager().getColor(g.name);
              }
            }
            if(targetFlag){
              elem.fontWeight = "900";
            }
            tableData.push(elem);
          });
        });
        self.tooltipConfig.caption = data[0].key;
        self.tooltipConfig.attributes = [{key : "Total", value: total}];

        return tableData;
      }
    }
    /**
     * calculate parameter for each graphtype
     * @method getParameter
     * @memberOf getParameter
     */
    function getParameter(mode, d) {
      var graphType = self.io.designManager().getValue("graphType");
      switch (mode) {
        case "width":
          if(graphType == "stacked" || graphType == "normalized"){
            return self.xLabel.rangeBand();
          }else if(graphType == "grouped"){
            return self.xGroupLabel.rangeBand();
          }
          break;
        case "x":
          if(graphType == "grouped"){
            return self.xGroupLabel(d.name);
          }
          break;
        case "y":
          if(graphType == "stacked" || graphType == "normalized"){
            if(d.y1 !== undefined){
              if(self.y(d.y1) <= self.axisHeight) {
                return self.y(d.y1);
              } else {
                return self.axisHeight;
              }
            }
          }else if(graphType == "grouped"){
            if(self.y(d.y1) <= self.axisHeight){
              return self.y(d.y1);
            }else{
              return self.axisHeight;
            }
          }
          break;
        case "height":
          var height=1;
          if(graphType == "stacked" || graphType == "normalized"){
            height = self.y(d.y0) - self.y(d.y1);
            if (self.y(d.y0) > self.axisHeight){
              height = self.axisHeight - self.y(d.y1);
            }else if(self.y(d.y1)> self.axisHeight){
              height = 0;
            }
            return (height<0)? 0: height;
          }else if(graphType == "grouped"){
            height = self.y(d.y0) - self.y(d.y1);
            if (self.y(d.y0) > self.axisHeight){
              height = self.axisHeight - self.y(d.y1);
            }else if(self.y(d.y1)> self.axisHeight){
              height = 0;
            }
            return (height<0)? 0: height;
          }
          break;

        default:
          console.log("[Error]:: Unsupported Mode "+ mode);
        }
      return null;
    } //function end
  };

 /**
   * click Action
   * @method clickAction
   * @memberOf BarChart
   */
  BarChart.prototype.clickAction = function(d){
    var self = this;
    var designManager = self.io.designManager();
    var dataManager = self.io.dataManager();
    var pos = -1;
    var append = false;
    if(d3.event.shiftKey){
      append = true;
    }
    if(designManager.getValue("clickmode") == "xaxis"){
      selectXAxis();
    }else if(designManager.getValue("clickmode") == "yaxis"){
      selectYAxis();
    }
    function selectXAxis(){
      var targetRow = dataManager.getMapperProps("xaxis").map2;
      var array = [];
      if(dataManager.getRowRefiner(targetRow).length !== undefined){
        pos = dataManager.getRowRefiner(targetRow).indexOf(d.key);
      }
      if(append){
        array = dataManager.getRowRefiner(targetRow);
        if(pos == -1){
          if(array.length === undefined) {
            array = [];
          }
          array.push(d.key);
        }else{
          array.splice(pos,1);
          if(array.length === 0){
            array = null;
          }
        }
      }else{
        if(pos == -1){
       array.push(d.key);
        }else{
          array = null;
        }
      }
      self.beforeSelected.xrow = targetRow;
      self.beforeSelected.xval = array;
      dataManager.setRowRefiner(targetRow, array);
    };
    function selectYAxis(){
      var xaxis_column = dataManager.getMapperProps("xaxis").map2[0];
      if(append){
        var selected = dataManager.getColumnRefiner();
     selected.push(xaxis_column);
     pos = selected.indexOf(d.name);
     if(pos !== -1){
       selected.splice(pos,1);
     }else{
       selected.push(d.name);
     }
      }else{
     var selected = [xaxis_column];
     selected.push(d.name);
      }
      dataManager.setColumnRefiner(selected);
      self.beforeSelected.y = selected;
    };
  };
  return BarChart;
});
