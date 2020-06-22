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
 * @fileoverview implement for AreaChart
 */

/**
 * Create AreaChart main function
 * @class AreaChart
 * @param {type} Axis class
 * @returns {AreaChart}
 */
define(["js/utils/Axis",
        "text!./control.html",
        "css!./AreaChart"], function (Axis, designTpl) {
  /**
   * Constructor create AreaChart
   * @class AreaChart
   * @param {ChartModel} io - model of chart which extend from Backbone.Model
   * @returns {AreaChart}
   */
  var AreaChart = function (io) {
    this.io = io;

    this.io.designManager().setTemplate(designTpl);
    this.axisUtils = new Axis();
    //higher priority for set initial io variable values from template
    this.io.dataManager().setMapperProps({
      xaxis: {type: 'number', label: 'X axis', map2: '' },
      yaxis: {type: 'number', label: 'Y axis', map2: [],
	      color_label: true, color_column: true}
    });
  };
  /**
   * update chart according with changed of interface variables
   * @method AreaChart
   * @memberOf AreaChart
   * @returns {AreaChart}
   */
  AreaChart.prototype.update = function (changedAttr) {
    var self = this;
    
    // if _CHART_ changed
    if(changedAttr.hasOwnProperty("DATA_MANAGER")) {
      self.redraw();
      if(self.io.fullrange()) {
        self.drawRect();
      }
    } else if (changedAttr.hasOwnProperty("DESIGN_MANAGER")) {   
      self.redraw();
    } else 
      self.redraw();
  };
  
  AreaChart.prototype.drawRect = function() {
    var self = this;
    var range = self.io.dataManager().getRowRefiner();
    var xcol = self.io.dataManager().getMapper('xaxis');
    if (range[xcol] === undefined) {
      return;
    }
    self.svg.select(".svgMain").append("g")
      .append("rect")
      .attr("class", "currentrange")
      .attr("y", 0)
      .attr("x", self.x(+range[xcol][0]))
      .attr("height", self.height)
      .attr("width", self.x(+range[xcol][1] - +range[xcol][0]))
      .attr("fill",function(d) {
        return "red";
      })
      .attr("opacity", 0.2);  
  };
  AreaChart.prototype.redraw = function() {
    var self = this;
    self.axisHeight = self.containerHeight -
      self.layout.top - 
      self.xConfig.caption.height -
      self.xConfig.label.height -
      self.xConfig.scrollbar.height;
    
    self.axisWidth = self.containerWidth -
      self.layout.yaxis.width -
      self.layout.main.margin.right;
    
    self.height = self.containerHeight;
    
    self.x = d3.scale.linear().range([0, self.axisWidth]);    
    self.y = d3.scale.linear().range([self.axisHeight, 0]);
    self.createChartHeader();
    self.drawCharts();
  };
 
  /**
   * render Line Chart
   * @method render
   * @memberOf AreaChart
   */
  AreaChart.prototype.render = function (containerWidth, containerHeight) {
    this.initialize(containerWidth, containerHeight);    
    // create chart header
    this.createChartHeader();
    // create charts
    this.drawCharts();
    return this.svg_dom;      
    
  };
  /**
   * initialize
   * @method initialize
   * @memberOf AreaChart
   */
  AreaChart.prototype.initialize = function (containerWidth, containerHeight) {
    /** Layout **/
    this.layout ={
      top  : 20,
      yaxis: {width: 80},
      main:  {margin:{right: 50}}
    };
    
    /** Y AXIS **/
    this.yConfig = {
      scale: "basic",
      range: { max:"auto", min:0},
      caption : {top:-60, left:"auto"}
    };
    /** X AXIS **/
    // X AXIS [width - YAxis_width]
    this.xConfig = {
      label   : {height: 50},
      range   : {max:"auto", min:"auto"},
      caption : {height:20, top:20, left:"auto"},
      scrollbar: {height:25}
    };
    
    // set default value for checkbox
    this.defaultCheckbox = false;
    // define width and height of drawing area
    this.margin = {top: 20, right: 40, bottom: 40, left: 40};
    
    // set width, height
    this.containerWidth  = containerWidth;
    this.containerHeight = containerHeight;
    
    this.width = containerWidth;
    this.height = containerHeight;
    
    this.axisHeight = containerHeight -  this.layout.top - this.xConfig.caption.height - 
      this.xConfig.label.height - this.xConfig.scrollbar.height;
    
    this.axisWidth = containerWidth - this.layout.yaxis.width - this.layout.main.margin.right;
    
    this.x = d3.scale.linear().range([0, this.axisWidth]);
    this.y = d3.scale.linear().range([this.axisHeight, 0]);

    this.name = "g1";
    // init for others      
    this.svg = null;
    this.svg_g = null;
    
    this.root_dom  = undefined;

    this.container = undefined;
    this.containerWidth = containerWidth;
    this.containerHeight= containerHeight;

    this.before_selected = [];
  };


  /**
   * Convert received data to understandable data format for this chart
   * @method transformData
   * @memberOf AreaChart
   */
  AreaChart.prototype.transformData = function () {
    var self = this, linesData = {};
    var ycols = self.io.dataManager().getMapper('yaxis');
    var xcol = self.io.dataManager().getMapper('xaxis');
    var data = (self.io.fullrange())? 
      self.io.dataManager().getData(): self.io.dataManager().getFilteredRows();

    if(_.isEmpty(ycols) || _.isEmpty(xcol)) return {};
    
    // filter max x value
    self.maxXValue = d3.max(data.map(function (d) {
      return +(d[xcol]);
    }));
    
    // filter min x value
    self.minXValue = d3.min(data.map(function (d) {
      return +(d[xcol]);
    }));
    
    // sorting x axis data for line chart
    data.sort(function(rowa, rowb) {
      return +rowa[xcol] > rowb[xcol] ? 1 : -1;
    });
    var graphType = self.io.designManager().getValue("graphType");
    if (graphType == "normalized") {
      var sum = 0;
      data.forEach(function (d) {
	sum = 0;
	ycols.forEach(function (key) {    
	  sum += d[key] - 0;
	});
	d.rate = 100 / sum;
      });
    } else {
      data.forEach(function (d) {
	d.rate = 1;
      });
    }
    
    // set data to draw chart
    ycols.forEach(function (key) {    
      //set all y data
      linesData[key] = data.filter(function(row){
	return row[key] !== undefined || !isNaN(row[key]);
      }).map(function (row) {
        return {xval:+row[xcol], yval: +(+row[key] * row.rate)};
      });
    });
    return linesData;
  };
    /**
     * create header of chart
     * @method createChartHeader
     * @memberOf LineChart
     */
   AreaChart.prototype.createChartHeader = function () {
       var self = this;

       if(self.svg_dom === undefined){
	   self.svg_dom = document.createElement("div");
       }
       self.svg =  d3.select(self.svg_dom)
           .attr('class', 'areachart');

       if(self.svg.select("g")){
	   self.svg.select("g").remove();
       }
       self.svg_g = self.svg.append("g");      
   };
  AreaChart.prototype.getAreaChartData = function() {
    var self = this;
    var transData;
    var graphType = self.io.designManager().getValue("graphType");
    transData = self.createStackedData();
    return transData;    
  };
  /**
   * draw normal line chart if number of selected item is 1 or more than 1
   * @method params
   * @memberOf AreaChart
   */
   AreaChart.prototype.drawCharts = function () {
     var self = this;
     var transData = self.getAreaChartData();
     if (typeof(transData) == "undefined") {
       return;
     }
     var g1 = self.drawAreaChart(transData, self.name, {x: 0, y: 0});
     self.drawBrush(g1);
   };
	  
  AreaChart.prototype.drawBrush = function(g1){
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
      g1.select(".svgMain").append("g")
	.attr("class","x brush")
	.call(self.brush)
	.selectAll("rect")
	.attr("height", self.height + self.margin.top + self.margin.bottom);
    }else{
      self.brush = undefined; 
    }
  };
  AreaChart.prototype.createAreaData = function () {
    var self = this;
    area = d3.svg.area()
      .x(function(d) { 
        return self.x(d.xval); 
      })
      .y0(function(d) { 
        return self.y(d.y0); 
      })
      .y1(function(d) { 
        return self.y(d.y0 + d.y); 
      })
      .interpolate(self.io.designManager().getValue("interpolationType"));       
    return area;
  };
	  
   AreaChart.prototype.createStackedData = function () {
     var self = this;
     var data = self.transformData();
     if (Object.keys(data).length === 0) {
       return;
     }
     var values = {}, obj = {}, i, tmp, yvals; 
     for(dkey in data){
       var v = data[dkey];
       v.forEach(function(d2) {
         obj = {};
         obj[dkey] = d2.yval;
         if (values[d2.xval] == undefined) {
           values[d2.xval] = {};
         } 
         values[d2.xval].yvals = obj;
       });
     }
     for(dkey in data){
       var v = data[dkey];
       var array = [];
       Object.keys(values).sort(function(a,b){
         if(+a < +b) return -1; 
         if(+a > +b) return 1; 
         return 0
       }).forEach(function(key) {
         obj = {};
         tmp = null;
         v.forEach(function(d2) {
           if (d2.xval == +key) {
             tmp += d2.yval;
           }
         });
         obj.xval = +key;
         if (tmp != null) {
           obj.yval = tmp;
         } else {
           obj.yval = 0;
         }
         array.push(obj);
       });
       data[dkey] = array;         
     }
     
     var stack = d3.layout.stack()
       .x(function (d) { 
	 return d.xval;
       })
       .y(function (d) { 
	 return d.yval;
       })
       .values(function (d) { 
	 return d;
       });
     /*Tranform data for stacking*/
     var data2 = [];
     let ycols = self.io.dataManager().getColumnRefiner();
     for(key in data){
       if(self.io.fullrange() ||
	  (!self.io.fullrange() && ycols.indexOf(key) !== -1)){
	 data2.push(data[key]);
       }
     };
     stack(data2);
     return data;
   };

  /**
   * draw X axis, Y axis for chart
   * @method params
   * @memberOf AreaChart
   */
       
  AreaChart.prototype.drawAxises = function (data, position, group) {
    var self = this;
    var designManager = self.io.designManager();
    var dataManager = self.io.dataManager();
    drawXAxis();
    drawYAxis();

    function drawXAxis() {
      // 1. Range
      var xcolumn = dataManager.getMapper('xaxis');
      var filteredRows = dataManager.getFilteredRows();
      var xrange;
      if(self.io.drilldown()){
        xrange = dataManager.getDataRangeWith(xcolumn, filteredRows);
      }else{
        xrange = dataManager.getDataRange(xcolumn);
      }
      var order = designManager.getValue("xaxisOrder");
      self.x = self.axisUtils.axisRange(order, self.axisWidth, xrange, "x");
      // 2. Tick
      var type = designManager.getValue("xaxisticktype");
      var digit = designManager.getValue("xaxisdigitnum");
      var format = self.axisUtils.getFormat(type, digit);
      var xAxis = d3.svg.axis().scale(self.x).orient("bottom")
            .ticks(designManager.getValue("xaxisticknum"))
            .tickFormat(format);
      /// 3. Draw
      var height = self.y.range()[0] + position.y;
      var xAxisG = group.select(".svgXaxis").append("g")
              .attr("class", "x axis").call(xAxis);
      var xCaption = self.io.designManager().getValue("xaxisCaption");
      
      xAxisG.selectAll(".tick text").style("text-anchor", "start").attr("fill", "white");
      xAxisG.select("path").attr("fill", "none");
      var xtext = xAxisG
	.append('text')
	.attr('x',self.axisWidth/2)
	.attr('y',self.margin.bottom)
	.attr("text-anchor", "middle")
	.attr("fill", "white")
	.text(function(){
          if (xCaption === "") {
            return dataManager.getMapper('xaxis');
          } else {
	    return designManager.getValue("xaxisCaption");
          }
	});
      ;
    };

    function drawYAxis() {
      var yrange = self.y.domain();
      var order = designManager.getValue("yaxisOrder");
      self.y = self.axisUtils.axisRange(order, self.axisHeight, yrange, "y");
      
      let type = designManager.getValue("yaxisticktype");
      let digit = designManager.getValue("yaxisdigitnum");
      let format = self.axisUtils.getFormat(type, digit);
      var yAxis = d3.svg.axis().scale(self.y)
	.orient("left")
	.ticks(designManager.getValue("yaxisticknum"))
	.tickFormat(format);
      
      /// 3.Draw
      var yAxisG = group.select(".svgYaxis")
	.append("g").attr("class", "y axis")
	.call(yAxis);
      yAxisG.selectAll(".tick text")
	.attr('transform', function(d,i,j) { return 'translate(0,-10)';})
	.attr("fill", "white");
      yAxisG.select("path").attr("fill", "none");
      yAxisG.append("text")
	.attr("class"," yaxiscaption")
	.attr("transform", "rotate(-90)")
	.attr("y", self.yConfig.caption.top)
	.attr("dy", ".71em")
	.style("text-anchor", "end")
	.attr("fill", "white")
	.text(designManager.getValue("yaxisCaption"));
    };
    return;
  };

  AreaChart.prototype.setYaxisDiv = function (group) {   
    var self = this;
    group.append("div")
      .attr("class","areachart-yaxis")
      .style("width", function(){
        return self.layout.yaxis.width;
      });
  };
  AreaChart.prototype.setMainDiv = function (group) {
    var self = this;
    group.append("div")
      .attr("class","areachart-main")
      .style("width", function(){
        return self.containerWidth - self.layout.yaxis.width - self.layout.main.margin.right +"px";
      })
      .style("height",   function(){
	return self.layout.top + self.y.range()[0] + "px";
      });
  };
  AreaChart.prototype.setXaxisDiv = function (group, scaleY) {   
    var self = this;
    group.append("div")
      .attr("class","areachart-xaxis")
      .style("width", function(){
        return self.containerWidth - self.layout.yaxis.width - self.layout.main.margin.right +"px";
      })
      .style("overflow-x","auto");
  };
  AreaChart.prototype.setDiv = function (group) {
    var self = this;
    self.setYaxisDiv(group);
    self.setMainDiv(group);
    self.setXaxisDiv(group);
  };
	    
  AreaChart.prototype.setYaxisSvg = function (group) {
    var self = this;
    group.select(".areachart-yaxis").append("svg")
      .attr("class","yaxis")
      .attr("width", self.layout.yaxis.width)
      .style("height",   function(){
	return self.layout.top + self.y.range()[0] + "px";
      })
      .append("g")
      .attr("transform", "translate(" +
	    self.layout.yaxis.width+","+ self.layout.top + ")")
      .attr("class","svgYaxis");
  };
  AreaChart.prototype.setMainSvg = function (group) {
    let self = this;
    group.select(".areachart-main").append("svg")
      .attr("class", "svgMain")
      .style("height",   function(){
	return self.layout.top + self.y.range()[0] + "px";
      })
      .style("width", self.containerWidth - self.layout.yaxis.width - self.layout.main.margin.right);
  };
  AreaChart.prototype.setXaxisSvg = function (group) {
    var self = this;
    group.select(".areachart-xaxis").append("svg")
      .attr("class", "svgXaxis")
      .style("width", function(){
        return self.containerWidth - self.layout.yaxis.width - self.layout.main.margin.right +"px";
      })
      .style("overflow-x","auto")
      .attr("height", self.xConfig.caption.height + 40);       
  };

   AreaChart.prototype.setSvg = function (group) {
     var self = this;       
     self.setYaxisSvg(group);
     self.setMainSvg(group);
     self.setXaxisSvg(group);
   };
	    
   AreaChart.prototype.drawAreaChart = function (data_, name, position) {
     let self = this;
     let svg_g = self.svg_g;       
     let group = svg_g.append("g").attr("class", name);
     
     self.setDiv(group);
     self.setSvg(group);       
     self.setAxisesDomain(data_);
     self.drawAxises(data_, position, group);
     
     // transFormData
     let data = []
     let cols = self.io.dataManager().getColumnRefiner();
     for(key in data_){
       if(self.io.fullrange() ||
        (!self.io.fullrange() && cols.indexOf(key) !== -1)){
          data.push({name: key, values: data_[key]});
       }
     }
     let gMain = group.select(".svgMain")
       .append("g")
       .attr("transform", "translate(0," + self.layout.top +")");
     let gArea = gMain.selectAll("." + name + "area")
       .data(data)
       .enter().append("g")
       .attr("class", name + "area")
       .attr("transform", "translate(" + 0 + "," + position.y + ")")
       .attr('id', function (d, i) {
         return d.name.replace(/ /g, "_");
       });
     let colorManager = self.io.colorManager();
     let area = this.createAreaData();
     let color = d3.scale.category20().range();
     let colorCounter = 0;
     let ycols = self.io.dataManager().getColumnRefiner();
     
     gArea.append("path")
       .attr("class", function(d){
         let classname = "areachart";
         if(ycols.indexOf(d.name) == -1){
           classname += " hideme";
         }
         return classname;
       })
       .attr("d", function (d) {
         return area(d.values);
       })
       .attr("id", function (d) {
         return d.name;
       })
       .style("fill", function (d) {
         if(colorManager.getDomainName() !== "Y axis"){
           return colorManager.getColorOfRow(d.color);
         }
         return colorManager.getColor(d.name);
       })
       .style("fill-opacity", 0.8)
       .on("click", function(d) {
          self.clickAction(d);
       })
       .on("mouseover", function(){
	 d3.select(this).style("fill-opacity", 0.7);
       })
       .on("mouseout", function(){
	 d3.select(this).style("fill-opacity", 1.0);
       });
     return group;
   };

  /**
   * click Action
   * @method clickAction
   * @memberOf AreaChart
   */
   AreaChart.prototype.clickAction = function (d){
     let self = this;
     let dataManager = self.io.dataManager();
     let xaxis = dataManager.getMapperProps("xaxis").map2[0];
     let selected = [xaxis];
     if(d3.event.shiftKey){
       selected = self.before_selected;
       let pos = selected.indexOf(d.name);
       if(pos !== -1){
	 selected.splice(pos, 1);
       }else{
	 selected.push(d.name);
       }
     }else{
       selected.push(d.name);
     }
     dataManager.setColumnRefiner(selected);
     self.before_selected = selected;
   };

  /**
   * get domain value for X, Y axis
   * @method setAxisesDomain
   * @memberOf AreaChart
   */
  AreaChart.prototype.setAxisesDomain = function (data) {
    var self = this;
    let dataManager = self.io.dataManager();
    let xcol = dataManager.getMapperProps("xaxis").map2
    let xrange = dataManager.getDataRange(xcol);
    self.x.domain(xrange);
    
    let ycols = dataManager.getMapperProps("yaxis").map2
    var yMin = 0;
    var yMax;
    for(key in data){
      var max = d3.max(data[key], function(d){
	return d.y0 + d.y;
      });
      if (yMax == undefined || yMax < max){
	yMax = max;
      }
    }
    self.y.domain([yMin, yMax]);
  };  
  return AreaChart;
});
