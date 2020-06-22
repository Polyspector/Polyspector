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

/** @module LineChart*/

/**
 * Initial config additional library files for this chart
 */

/**
 * Create LineChart main function
 * @class LineChart
 * @param {type} CustomTooltip CustomTooltip class
 * @returns {LineChart}
 */
define(["util/CustomTooltip",
        "js/utils/Axis",
        "text!./control.html",
        "css!./LineChart"], function (CustomTooltip, Axis, designTpl) {
  /**
    * Constructor create Line Chart
    * @method LineChart
    * @memberOf LineChart
    * @returns {LineChart}
    */
  var LineChart = function (io) {
    this.io = io;
    // Data Mapper
    this.io.dataManager().setMapperProps({
      xaxis: {type: 'number', label: 'X axis', map2: ''},
      yaxis: {type: 'number', label: 'Y axis', map2: [],
              color_label: true, color_column: true}
    });
    this.axisUtils = new Axis();
    this.io.designManager().setTemplate(designTpl);
  };
  /**
    * update chart according with changed of interface variables
    * @method LineChart
    * @memberOf LineChart
    * @returns {LineChart}
    */
  LineChart.prototype.update = function (changed) {
    var self = this;
    if(changed.hasOwnProperty("COLOR_MANAGER")){
      self.redraw();
    }else if(changed.hasOwnProperty("DESIGN_MANAGER")){
      self.redraw();
    }else if(changed.hasOwnProperty("DATA_MANAGER")){
      if(self.brushAction === true){
        self.brushAction = false;
      }else{
        self.redraw();
      }
    }
    return self.root_dom;
  };

  /**
   * render Line Chart
   * @method render
   * @memberOf LineChart
   */
  LineChart.prototype.render = function (containerWidth, containerHeight) {
    var self = this;
    self.initialize(containerWidth, containerHeight);
    self.createChartHeader();
    if(self.io.dataManager() !== undefined &&
       self.io.dataManager().getData().length > 0){
      var data = self.transformData();
      self.createChart(data);
    }
    return self.root_dom;
  };


  LineChart.prototype.getSelectedLegends = function (refresh) {
    var self = this;
    var selectedLegends = [];
    if(self.io.fullrange() || refresh !== undefined) {
      selectedLegends = self.io.dataManager().getMapper("yaxis");
    }else{
      var selectedColumns = self.io.dataManager().getColumnRefiner();
      var ycols = self.io.dataManager().getMapper("yaxis");
      var pos = 0;
      ycols.forEach(function(col){
        if(selectedColumns.indexOf(col) !== -1){
          selectedLegends.push(col);
        }
      });
    }
    return selectedLegends;
  };

  /**
   * initialize
   * @method initialize
   * @memberOf LineChart
   */
  LineChart.prototype.initialize = function (containerWidth, containerHeight) {
    /** Layout **/
    this.layout ={
      top  : 20,
      yaxis: {width: 80},
      main:  {margin:{right: 50}}
    };
    
    /*******************************
     ** Chart Customize Parameter **
     *******************************/

    /** Y AXIS **/
    this.yConfig = {
      scale: "basic",
      range: { max:"auto", min:0},
      caption : {top:-60}
    };
    /** X AXIS **/
    // X AXIS [width - YAxis_width]
    this.xConfig = {
      label   : {height: 50},
      range   : {max:"auto", min:"auto"},
      caption : {height:30},
      scrollbar: {height:25},
      axis    : {height:25},
      margin  : 5
    };

    /** Tooltip **/
    this.tooltipConfig = {
      caption : "",
      attributes : [],
      prefix  : "",
      postfix : "",
      offset  : 0,
      linewidth : 5,
      lineopacity : 0.6
    };

    /** Inner Variable **/
    // VIEW
    this.tooltip      = new CustomTooltip();
    this.tooltip.initialize();
    this.controlPanel = null;

    this.svg          = undefined;
    this.xSvg         = undefined;
    this.ySvg         = undefined;
    this.axisWidth = containerWidth -
      this.layout.yaxis.width -
      this.layout.main.margin.right -
      this.xConfig.margin;

    this.axisHeight   = containerHeight -
      this.layout.top -
      this.xConfig.caption.height -
      this.xConfig.label.height -
      this.xConfig.scrollbar.height;
    this.root_dom  = undefined;
    this.container = undefined;
    this.containerWidth = containerWidth;
    this.containerHeight= containerHeight;

    // DATA
    this.data     = [];
    this.allLegend = [];
    this.legends  = [];


    /** BRUSH **/
    this.brush = undefined;
    this.brushAction = false;

    /** Others **/
    // Y AXIS
    if(this.yConfig.scale == "basic"){
      this.y = d3.scale.linear().range([this.axisHeight,0]);
    }else{
      this.y= d3.scale.log().range([this.axisHeight,0]);
    }
    this.yAxis = d3.svg.axis().scale(this.y).orient("left")
      .ticks(this.io.designManager().getValue("yaxisticknum"))
      .tickFormat(d3.format(".2s"));

    // X AXIS
    this.x = d3.scale.linear().range([0,this.axisWidth]);
    this.xAxis = d3.svg.axis().scale(this.x).orient("bottom");


    // Reset Row Refiner??
    var filter = this.io.dataManager().getRowRefiner();
    var newFilter = {};
    for(var k in filter){
      newFilter[k] = null;
    }
    this.io.dataManager().setRowRefiner(newFilter);
  };

  LineChart.prototype.resize =  function (containerWidth, containerHeight) {
    // update size
    var self = this;
    self.containerWidth  = containerWidth;
    self.containerHeight = containerHeight;
    self.redraw();
  };

 /**
  * create header of chart
  * @method createChartHeader
  * @memberOf LineChart
  */
  LineChart.prototype.createChartHeader = function () {
    var self = this;
    if(self.root_dom === undefined){
      self.root_dom   = self.root_dom  = document.createElement("div");
      self.container = d3.select(self.root_dom);
    }
    if(self.container.selectAll("div.linechart")){
      self.container.selectAll("div.linechart").remove();
    }
    var yaxisDiv, mainDiv, xaxisDiv, xaxiscaptionDiv;
    // Draw Div
    drawDiv();
    // Draw yAxisCaption
    drawXAxisCaptionSVG();
    var mainHeight = self.containerHeight -
      self.layout.top -
      self.xConfig.caption.height -
      self.xConfig.scrollbar.height -
      self.xConfig.axis.height;
    // Draw yAxis
    drawYAxisSVG();
    // Draw SVG
    self.svg = mainDiv.append("svg")
      .attr("class", "linechart")
      .style("width", self.containerWidth - self.layout.yaxis.width - self.layout.main.margin.right)
      .style("height", mainHeight)
      .append("g")
      .attr("transform", "translate(0," + self.layout.top +")");
    // Draw xAxis
    drawXAxisSVG();

    function drawDiv(){
      var div = self.container.append("div")
        .attr("class","linechart");
      // Define Div
      yaxisDiv = div.append("div")
        .attr("class","linechart-yaxis")
        .style("width",self.layout.yaxis.width);
      mainDiv = div.append("div")
        .attr("class","linechart-main")
        .style("width", function(){
          return self.containerWidth - self.layout.yaxis.width - self.layout.main.margin.right +"px";
        })
        .style("overflow-x","auto");
      xaxisDiv = div.append("div")
	.attr("class", "linechart-xaxis");
      xaxiscaptionDiv = div.append("div")
        .attr("class","linechart-xaxis-caption");
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
    function drawXAxisSVG(){
      self.xSvg = xaxisDiv.append("svg")
        .attr("class", "xaxis")
        .style("width", self.containerWidth - self.layout.main.margin.right)
        .style("height", self.xConfig.axis.height)
        .append("g")
        .attr("transform", "translate(" + self.layout.yaxis.width + ",0)");
    }

    function drawXAxisCaptionSVG(){
      xaxiscaptionDiv.append("svg")
        .attr("class", "xaxiscaption")
        .attr("width", self.containerWidth)
        .attr("height", self.xConfig.caption.height)
        .append("g")
          .attr("transform",'translate(0,' + self.xConfig.caption.height/2 +')')
        .append("text").attr("class","xaxis")
          .attr("text-anchor", "middle")
          .text(self.io.designManager().getValue("xaxisCaption"))
          .attr("x", function(){
              return self.containerWidth/2 ;
          });
    }
  };
 /**
  * transform Data
  * @method transform Data
  * @memberOf LineChart
  */
  LineChart.prototype.transformData = function () {
    var self = this;
    var dataManager = self.io.dataManager();
    var chartData = [];
    // 1. Check Data Mapping
    if(dataManager.getMapper("xaxis") === '' ||
       dataManager.getMapper("yaxis") === undefined ||
       dataManager.getMapper("yaxis").length === 0){
      return chartData;
    }
    // 2. Transform Data
    var data = dataManager.getFilteredRows();
    if(data.length === 0){
      data = dataManager.getData();
    }
    var labels = dataManager.getMapper("yaxis");
    
    var notInfoKeys = dataManager.getMapper("yaxis");
    notInfoKeys.push(dataManager.getMapper("xaxis"));
    var colNames = dataManager.getDataType(); 
    var labelData = {};
    labels.forEach(function(d) {
      labelData[d] = [];
    });
    
    data.forEach(function(d) {
      var infos = {};
      for(var key in colNames){
        if(notInfoKeys.indexOf(key) == -1){
	  infos[key] = d[key];
        }
      }
      labels.forEach(function(label){
	labelData[label].push({
	  x     : +d[dataManager.getMapper("xaxis")],
	  value : +d[label],
	  info  : infos
	});
      });
    });
    // sort
    _.each(labelData, function(list, key) {
      list.sort(function(a,b){
        if(a.x < b.x) return -1;
        if(a.x > b.x) return  1;
        return 0;
      });
      chartData.push({name:key, values:list});
    });
    return chartData;
  };
 /**
  * create chart
  * @method createChart
  * @memberOf LineChart
  */
  LineChart.prototype.createChart = function (data) {
    var self = this;
    if(data.length === 0){
      return;
    }
    // 1. Draw Axis
    self.drawAxis(data);
    // 2. Draw Chart
    self.drawChart(data);
    // 3. Draw Tooltips
    //self.drawTooltip(data);
    // 4. Draw Brush
    self.drawBrush();
  };

 /**
  * draw Axis
  * @method drawAxis
  * @memberOf LineChart
  */
  LineChart.prototype.drawAxis = function (data) {
    var self = this;
    var dataManager = self.io.dataManager();
    var designManager = self.io.designManager();
    self.container.select("svg.linechart").style("width", self.axisWidth +"px");
    // X AXIS
    drawXAxis();
    // Y Axis
    drawYAxis();
    return ;

    function drawXAxis(){
      /// 1.Range
      var xcolumn = dataManager.getMapper("xaxis");
      var filteredRows = dataManager.getFilteredRows();
      var xrange;
      if(self.io.drilldown()){
        xrange = dataManager.getDataRangeWith(xcolumn, filteredRows);
      }else{
        xrange = dataManager.getDataRange(xcolumn);
      }
      var order = designManager.getValue("xaxisOrder");
      self.x = self.axisUtils.axisRange(order, self.axisWidth, xrange, "x");
      /// 2.Tick
      var type = designManager.getValue("xaxisticktype");
      var digit = designManager.getValue("xaxisdigitnum");
      var format = self.axisUtils.getFormat(type, digit);
      var xAxis = d3.svg.axis().scale(self.x).orient("bottom")
        .ticks(designManager.getValue("xaxisticknum"))
        .tickFormat(format);
      /// 3. Draw
      var xAxisG = self.xSvg.append("g")
        .attr("class", "x axis");
      xAxisG.call(xAxis);
    }
    // Y AXIS
    function drawYAxis(){
      /// 1.Range
      var yrange = rangeAggregator("yaxis");
      var order = designManager.getValue("yaxisOrder");
      self.y = self.axisUtils.axisRange(order, self.axisHeight, yrange, "y");
      /// 2.Tick
      var type = designManager.getValue("yaxisticktype");
      var digit = designManager.getValue("yaxisdigitnum");
      var format = self.axisUtils.getFormat(type, digit);
      var yAxis = d3.svg.axis().scale(self.y).orient("left")
        .ticks(designManager.getValue("yaxisticknum"))
        .tickFormat(format);
      /// 3.Draw
      self.ySvg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
        .append("text")
        .attr("class"," yaxiscaption")
        .attr("transform", "rotate(-90)")
        .attr("y", self.yConfig.caption.top)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text(designManager.getValue("yaxisCaption"));
      /// 4.Centerize
      self.ySvg.select("text.caption")
        .attr("x", function(){
          return (self.axisHeight - self.xConfig.label.height)/2;
        });
    }
    function rangeAggregator(name){
      var columns = dataManager.getMapper(name);
      var range = [];
      columns.forEach(function(column){
        if(self.io.drilldown()){
          var filteredRows = dataManager.getFilteredRows();
          rangetmp = dataManager.getDataRangeWith(column, filteredRows);
        }else{
          rangetmp = dataManager.getDataRange(column);
        }
        if(range.length > 0){
          if (range[0] > rangetmp[0]){
            range[0] = rangetmp[0];
          }
          if (range[1] < rangetmp[1]){
            range[1] = rangetmp[1];
          }
        }else{
          range[0] = rangetmp[0];
          range[1] = rangetmp[1];
        }
      });
      return range
    }
  };
 /**
  * draw Chart
  * @method drawChart
  * @memberOf LineChart
  */
  LineChart.prototype.drawChart = function (data) {
    var self = this;
    var dataManager = self.io.dataManager();
    var designManager = self.io.designManager();
    var colorManager = self.io.colorManager();
    var highlights = dataManager.getMapperProps("yaxis").map2;
    if(self.io.fullrange()){
      highlights = dataManager.getColumnRefiner();
    }

    var line = d3.svg.line()
          .x(function(d) { return self.x(d.x); })
          .y(function(d) { return self.y(d.value); })
          .interpolate(designManager.getValue("graphType"));
    self.svg.append("clipPath")
      .attr("id", "clipLineChart")
      .append("rect")
      .attr("width", self.axisWidth)
      .attr("height", self.axisHeight);
    // create chart
    var labels = self.svg.selectAll(".label")
          .data(data)
          .enter()
          .append("g")
          .attr("class", "label")
          .attr('id', function(d){
            return d.name;
          });
      labels.append("path")
      .attr("class", function(d){
        return "line_chart";
      })
      .style("stroke", function(d) {
        return colorManager.getColor(d.name);
      })
      .attr("d", function(d) {
        return line(d.values); })
      .style("fill","none");
  };

  /**
   * drawTooltip
   * @method drawTooltip
   * @memberOf LineChart
   */
  LineChart.prototype.drawTooltip = function (data) {
    return ;
    var self = this;
    var selectedLegends = self.getSelectedLegends();
    var line = self.svg.append("line")
          .attr("class","tooltips")
          .attr("x1", 0).attr("x2", 0)
          .attr("y1", 0)
          .attr("y2", function(){
            return self.axisHeight + self.xConfig.label.height;})
          .style("display","none")
          .style("stroke", "orange")
          .style("stroke-width", self.tooltipConfig.linewidth)
          .style("stroke-opacity", self.tooltipConfig.lineopacity);

      // ACTION
    self.container.select("div.linechart-main")
      .on("mouseover", function(d){
        line.style("display","block");
      })
      .on("mousemove", function(){
        var xPosition = d3.mouse(this)[0] - self.tooltipConfig.offset;
        // line
        line.attr("x1", xPosition).attr("x2", xPosition);
        // tooltips
        var tooltipKey     = self.io.dataManager().getMapperProps("xaxis").map2;
        var tooltipValue   = parseInt(self.x.invert(xPosition));
        // Add X Label
        if(self.io.designManager().getValue("xaxisticktype") == "hex"){
          tooltipValue = "0x" + tooltipValue.toString(16);
        }
        var data = createTableData(tooltipValue);
        self.tooltipConfig.attributes = {key: tooltipKey, value: tooltipValue };
        self.tooltip.show(self.tooltip.table(data, self.tooltipConfig), d3.event);
      })
      .on("mouseout", function(d){
        line.style("display","none");
        self.tooltip.hide();
      })
      .on("click", function(){
        if(self.io.designManager().getValue("mouseActionMode") == "CLICK"){
          var pos = parseInt(self.x.invert(d3.mouse(this)[0]));
          self.io.dataManager().setRowRefiner(self.io.dataManager().getMapper("xaxis"), pos);
        }
      });

    function createTableData(xValue){
      var tableData = []; // key,color,value
      var highlights = self.io.dataManager().getMapperProps("yaxis").map2;
      if(self.io.fullrange()){
        highlights = self.io.dataManager().getColumnRefiner();
      }
      self.tooltipConfig.caption = self.io.dataManager().getMapperProps("xaxis").map2 + " : " +  xValue;

      data.forEach(function(d){
        var elem = {};
        if(selectedLegends.indexOf(d.name) !== -1){
          elem.key = d.name;
          if(highlights.indexOf(d.name) !== -1){
            if(self.io.colorManager().getDomainName() !== "Y axis"){
              elem.color = self.io.colorManager().getColorOfRow(d.name);
            }else{
              elem.color = self.io.colorManager().getColor(d.name);
            }
          }
          elem.value = "";
          for(var i=0; i< d.values.length; i++){
            if(d.values[i].x == xValue){
              elem.value = d.values[i].value;
              break;
            }else if(d.values[i].x < xValue){
              elem.value = d.values[i].value;
            }else{
              break;
            }
          }
        }
        tableData.push(elem);
      });
      return tableData;
    }
  };
 /**
  * draw Brush
  * @method drawBrush
  * @memberOf LineChart
  */
 LineChart.prototype.drawBrush = function(){
   var self = this;
   if(self.io.designManager().getValue("mouseActionMode") == "1D-BRUSH"){
     self.brush = d3.svg.brush()
       .x(self.x)
       .on("brushstart", function(){
         d3.event.sourceEvent.stopPropagation();
       })
       .on("brushend", function(){
         d3.event.sourceEvent.stopPropagation();
         self.brushAction = true;
         var filter = {}, xcol = self.io.dataManager().getMapper('xaxis');
         filter[xcol] = self.brush.empty() ? null : self.brush.extent();
         self.io.dataManager().setRowRefiner(filter);
       });
     self.svg.append("g")
       .attr("class", "x brush")
       .call(self.brush)
       .selectAll("rect")
       .attr("y", -10)
       .attr("height", self.axisHeight + 10 + self.xConfig.label.height);
   }else{
     self.brush = undefined;
   }
 };
  /**
   * redraw
   * @method redraw
   * @memberOf LineChart
   */
  LineChart.prototype.redraw = function () {
    var self = this;
    self.axisHeight   = self.containerHeight -
      self.layout.top -
      self.xConfig.caption.height -
      self.xConfig.label.height -
      self.xConfig.scrollbar.height;
    self.axisWidth = self.containerWidth -
      self.layout.yaxis.width -
      self.layout.main.margin.right -
      self.xConfig.margin;

    self.createChartHeader();
    var data = self.transformData();
    self.createChart(data);
    return self.root_dom;
  };
 
  return LineChart;
});
