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

/** @module ScatterPlot **/

define(["js/utils/Axis", "text!./control.html", "css!./main"], function (Axis, designTpl) {
  /**
   * Constructor
   * @class ScatterPlot
   * @param {ChartModel} io - model of chart which extend from Backbone.Model
   * @returns {ScatterPlot}
   */
  var ScatterPlot = function (io) {
    this.io = io;
    this.io.colorManager().setTypeOfColorColumn('number', 'string');
    this.io.dataManager().setMapperProps({
      xaxis: { label: 'X Axis', map2: '', spk: 'width'},
      yaxis: { label: 'Y Axis', map2: '', spk: 'height'}
    });
    this.axisUtils = new Axis();
    this.io.designManager().setTemplate(designTpl);
  };

  /**
   * update chart according with changed of interface variables
   * @method ScatterPlot
   * @memberOf ScatterPlot
   * @returns {ScatterPlot}
   */
  ScatterPlot.prototype.update = function (changed) {
    let self = this;
    let designManager = self.io.designManager();
    if(changed.hasOwnProperty("COLOR_MANAGER")) {
      self.updateColors();
    } else if (changed.hasOwnProperty("DESIGN_MANAGER")) {
      self.redraw();
    } else if (changed.hasOwnProperty("DATA_MANAGER") || changed.hasOwnProperty("MODE")) {
      updateLabel(changed);
      if(self.brushAction === true){
        self.brushAction = false;
        self.redraw();
      }else{
        self.redraw();
      }
    }
    return self.root_dom;

    function updateLabel(changed){
      if(changed.hasOwnProperty("DATA_MANAGER") &&
         changed["DATA_MANAGER"]["MAPPER"]){
        if(changed["DATA_MANAGER"]["MAPPER"]["xaxis"]){
          designManager.setValue("xaxisCaption", changed["DATA_MANAGER"]["MAPPER"]["xaxis"]);
        }else if(changed["DATA_MANAGER"]["MAPPER"]["yaxis"]){
          designManager.setValue("yaxisCaption", changed["DATA_MANAGER"]["MAPPER"]["yaxis"]);
        }
      }
    }
  };

  /**
   * render Scatter Plot
   * @method render
   * @memberOf ScatterPlot
   */
  ScatterPlot.prototype.render = function (containerWidth, containerHeight) {
    let self = this;
    // initialize
    self.initialize(containerWidth, containerHeight);
    self.setup();
    // create chart header
    self.createChartHeader();
    // create scatter matrix chart
    self.drawScatterPlot();
    self.updateColors();
    return self.root_dom;
  } ;
  ScatterPlot.prototype.resize =  function (containerWidth, containerHeight) {
    // update size
    let self = this;
    self.containerWidth  = containerWidth;
    self.containerHeight = containerHeight;
    self.redraw();
  };

  ScatterPlot.prototype.redraw = function() {
    let self = this;
    self.setup();
    self.createChartHeader();
    self.drawScatterPlot();
    self.updateColors();
    return self.root_dom;
  };

  /**
   * initialize
   * @method initialize
   * @memberOf ScatterPlot
   */
  ScatterPlot.prototype.initialize = function (containerWidth, containerHeight) {
    /** Layout **/
    this.layout ={
      top  : 20,
      yaxis: {width: 80},
      main:  {margin:{right: 50, top: 20 }}
    };
    /*******************************
     ** Chart Customize Parameter **
     *******************************/

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
      caption : {height:30, top:20, left:"auto"},
      scrollbar: {height:25},
      axis    : {height:25}
    };
    this.containerWidth = containerWidth;
    this.containerHeight= containerHeight;

    /** Mode **/
    this._mode = "fullrange"; // ["fullrange","drilldown"]
    /** Brush **/
    this.brush     = undefined;
    this.brushAction = false;
    this.svg       = undefined;
    this.xSvg      = undefined;
    this.ySvg      = undefined;
    this.root_dom  = undefined;
    this.container = undefined;

  };
  /**
   * setup
   * @method setup
   * @memberOf ScatterPlot
   */
  ScatterPlot.prototype.setup = function () {
    let self = this;
    /** Inner Variable **/
    self.axisWidth = self.containerWidth -
      self.layout.yaxis.width -
      self.layout.main.margin.right;

    self.axisHeight = self.containerHeight -
      self.layout.top -
      self.xConfig.caption.height -
      self.xConfig.label.height -
      self.xConfig.scrollbar.height;

    /** Others **/
    // Y AXIS
    if(self.yConfig.scale == "basic"){
      self.y = d3.scale.linear().range([self.axisHeight,0]);
    }else{
      self.y= d3.scale.log().range([self.axisHeight,0]);
    }
    self.yAxis = d3.svg.axis().scale(self.y).orient("left");
    // X AXIS
    self.x = d3.scale.linear().range([0, self.axisWidth]);
    self.xAxis = d3.svg.axis().scale(self.x).orient("bottom");
    /** Reset Refiner **/
    self.io.dataManager().setRowRefiner({});
  };

  /**
   * create header of chart
   * @method createChartHeader
   * @memberOf ScatterPlot
   */
  ScatterPlot.prototype.createChartHeader = function () {
    let self = this;
    if(self.root_dom === undefined){
      self.root_dom  = document.createElement("div");
      self.container = d3.select(self.root_dom);
    }
    if(self.container.selectAll("div.scatterplot")){
      self.container.selectAll("div.scatterplot").remove();
    }
    let yaxisDiv, mainDiv, xaxisDiv, xaxisCaptionDiv;
    drawDiv();
    function drawDiv(){
      let div = self.container.append("div")
        .attr("class","scatterplot");
      // Define Div
      yaxisDiv = div.append("div")
        .attr("class","scatterplot-yaxis")
        .style("width", function(){
          return self.layout.yaxis.width;
        });
      mainDiv = div.append("div")
        .attr("class","scatterplot-main")
        .style("width", function(){
          return self.containerWidth - self.layout.yaxis.width - self.layout.main.margin.right +"px";
        })
        .style("overflow-x","auto");
      xaxisDiv = div.append("div")
        .attr("class","scatterplot-xaxis");
      xaxisCaptionDiv = div.append("div")
        .attr("class","scatterplot-xaxis-caption");
      var mainHeight = self.containerHeight -
        self.layout.top -
        self.xConfig.caption.height -
        self.xConfig.scrollbar.height -
        self.xConfig.axis.height;
      //  SVG [ yAxis, main, xAxis]
      self.ySvg = yaxisDiv.append("svg")
        .attr("class","yaxis")
        .attr("width", self.layout.yaxis.width)
        .attr("height", mainHeight)
        .append("g")
        .attr("transform", "translate(" +
              self.layout.yaxis.width+","+ self.layout.top + ")");
      self.svg = mainDiv.append("svg")
        .attr("class", "scatterplot")
        .style("width", self.containerWidth - self.layout.yaxis.width - self.layout.main.margin.right)
        .style("height", mainHeight)
        .append("g")
        .attr("transform", "translate(0," + self.layout.top +")");
      self.xSvg = xaxisDiv.append("svg")
        .attr("class", "xaxis")
        .style("width", self.containerWidth - self.layout.main.margin.right)
        .style("height", self.xConfig.axis.height)
        .append("g")
        .attr("transform", "translate(" + self.layout.yaxis.width + ",0)");
      self.xCaptionSVG =  xaxisCaptionDiv.append("svg")
        .attr("class", "xaxiscaption")
        .attr("width", self.containerWidth)
        .attr("height", self.xConfig.caption.height)
        .append("g")
        .attr("transform","translate(0,"+ self.xConfig.caption.top+")")
        .append("text").attr("class","xaxis")
        .text(self.io.designManager().getValue("xaxisCaption"));
      xaxisCaptionDiv.select("text.xaxis")
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
   * draw scatter matrix chart depend on selected items by user
   * @method drawScatterPlot
   * @memberOf ScatterPlot
   */
  ScatterPlot.prototype.drawScatterPlot = function () {
    let self = this;
    let colorManager = self.io.colorManager();
    let dataManager = self.io.dataManager();
    let designManager = self.io.designManager();
    let data = dataManager.getFilteredRows();
    let xcolumn = dataManager.getMapper('xaxis');
    let ycolumn = dataManager.getMapper('yaxis');
    if(xcolumn == undefined || ycolumn == undefined){
      return;
    }
    let filteredRows = dataManager.getFilteredRows();
    let max_data_items = designManager.getValue('MAX_DATA_ITEMS');
    if(max_data_items != undefined && data.length > +max_data_items ) {
      data = _.sample(data, +max_data_items);
    }
    if(filteredRows.length <=0 || _.isEmpty(xcolumn) || _.isEmpty(ycolumn))  return;
    let xrange = dataManager.getAxisRange(xcolumn, self.io.fullrange());
    let yrange = dataManager.getAxisRange(ycolumn, self.io.fullrange());
    if(designManager.getValue("yaxisRangeMinAuto") == "OFF"){
      yrange[0] = +designManager.getValue("yaxisRangeMinManual");
    }else if(designManager.getValue("yaxisRangeMaxAuto") == "OFF"){
      yrange[1] = +designManager.getValue("yaxisRangeMaxManual");
    }
    let order = designManager.getValue("xaxisOrder");
    let dataType = self.io.dataManager().getDataType();
    self.x = self.axisUtils.axisRange(order, self.axisWidth, xrange, "x", dataType[xcolumn]);
    order = designManager.getValue("yaxisOrder");
    self.y = self.axisUtils.axisRange(order, self.axisHeight, yrange, "y", dataType[ycolumn]);
    // drawX
    self.drawAxis(xcolumn,ycolumn);
    // draw brush
    if(designManager.getValue("drawPriority") == "tooltip") {
      self.drawBrush();
    }
    // draw dots
    let xdatatype = dataType[xcolumn];
    let ydatatype = dataType[ycolumn];
    self.svg.selectAll("circle")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", function (d) {
        if (xdatatype == "number"){
          return self.x(+d[xcolumn]);
        }else{
          return self.x(d[xcolumn]);
        }
      })
      .attr("cy", function (d) {
        if (ydatatype == "number"){
          return self.y(+d[ycolumn]);
        }else{
          return self.y(d[ycolumn]);
        }
      })
      .attr("r", 3)
      .style("fill", function (d) {
        if(colorManager.getDomainName() !== "Y axis"){
          return colorManager.getColorOfRow(d.color);
        }
        return colorManager.getColor(d.name);
      })
      .append("title")
      .text(function(d){
        var title = "";
        for(var k in d){
          title +=  "[" + k + "]   : " + d[k] + "\n";
        }
        return title;
      });

    //hide unfocused data for highligh mode
    var refineset =null;
    if(this.io.highlight() || this.io.fullrange()) {
      refineset = dataManager.getHighlightRefiner();
    }
    if(refineset) {
      this.svg.selectAll("circle")
        .classed("hideme", function (row) {
          return !dataManager.isActiveRow(row, refineset);
        });
    }
    // draw brush
    if(designManager.getValue("drawPriority") == "brush") {
      self.drawBrush();
    }
  };
  /**
   * For draw axis X, Y
   * @method drawAxis
   * @memberOf ScatterPlot
   * @returns {undefined}
   */
  ScatterPlot.prototype.drawAxis = function (xcolumn, ycolumn) {
    let self = this;
    let designManager = self.io.designManager();
    let dataType = self.io.dataManager().getDataType();
    drawXAxis();
    drawYAxis();

    function drawXAxis(){
      /// 1.Tick
      let type = designManager.getValue("xaxisticktype");
      let digit = designManager.getValue("xaxisdigitnum");
      let format = self.axisUtils.getFormat(type, digit);
      let ticksnum = designManager.getValue("xaxisticknum");
      let fontsize = +designManager.getValue("xaxistickfont");
      let rotate = +designManager.getValue("xaxistickrotate");
      let xAxis = d3.svg.axis().scale(self.x).orient("bottom")
      if (dataType[xcolumn] != "string"){
        xAxis.ticks(ticksnum).tickFormat(format);
      }
      /// 2. Draw
       self.xSvg.append("g")
        .attr("class", "x axis")
        .call(xAxis)
        .selectAll("text")
        .style("text-anchor", "start")
        .style("font-size", fontsize)
        .attr("dx", "+.8em")
        .attr("dy", ".15em")
        .attr("transform", function() {
          return "rotate("+ rotate + ")";
        });
    }
    // Y AXIS
    function drawYAxis(){
      /// 1.Tick
      let type = designManager.getValue("yaxisticktype");
      let digit = designManager.getValue("yaxisdigitnum");
      let ticksnum = designManager.getValue("yaxisticknum");
      let format = self.axisUtils.getFormat(type, digit);
      let yAxis = d3.svg.axis().scale(self.y).orient("left");
      let fontsize = +designManager.getValue("yaxistickfont");
      if(dataType[ycolumn] != "string"){
        yAxis.ticks(ticksnum).tickFormat(format);
      }
      /// 2.Draw
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
      self.ySvg.selectAll("g.y.axis")
        .selectAll("g.tick")
        .selectAll("text")
        .style("font-size", fontsize);
      /// 3.Centerize
      self.ySvg.select("text.caption")
        .attr("x", function(){
          if(self.yConfig.caption.left === "auto" ||
             self.yConfig.caption.left === undefined){
            let left = (self.axisHeight - self.xConfig.label.height)/2 -
              self.ySvg.select("text").property("clientWidth")/2;
            return  -left;
          }
          return self.yConfig.caption.left;
        });
    }
  };

  /**
   * draw Brush
   * @method drawBrush
   * @memberOf ScatterPlot
   */
  ScatterPlot.prototype.drawBrush = function() {
    let self = this;
    let designManager = self.io.designManager();
    let dataManager = self.io.dataManager();
    let dataType = self.io.dataManager().getDataType();
    if(designManager.getValue("mouseActionMode") == "1D-BRUSH"){
      self.brush = d3.svg.brush()
        .x(self.x)
        .on("brushstart", function() {
          d3.event.sourceEvent.stopPropagation();
        })
        .on("brushend", function() {
          d3.event.sourceEvent.stopPropagation();
          self.brushAction = true;
          let filter = {};
          let xcol = dataManager.getMapper('xaxis');
          filter[xcol] = self.brush.empty() ? null : self.brush.extent();
          if(dataType[xcol] == "string"){
            filter[xcol] = self.invertDiscreteValues(filter[xcol], "x", xcol);
          }
          if(self.io.highlight() || self.io.fullrange()) {
            dataManager.setHighlightRefiner(filter, "x");
            self.updateColors();
          } else {
            dataManager.setRowRefiner(filter);
          }
        });
      self.svg.append("g")
        .attr("class", "x brush")
        .call(self.brush)
        .selectAll("rect")
        .attr("y", -10)
        .attr("height", self.axisHeight + 10 + self.xConfig.label.height);
    } else if(designManager.getValue("mouseActionMode") == "2D-BRUSH") {
      self.brush = d3.svg.brush()
        .x(self.x)
        .y(self.y)
        .on("brushstart", function(){
          if(d3.event.sourceEvent.button !== 0) return; //only permit left key
          d3.event.sourceEvent.stopPropagation();
        })
        .on("brushend", function(){
          if(d3.event.sourceEvent.button !== 0) return;
          d3.event.sourceEvent.stopPropagation();
          self.brushAction = true;
          let filter = {};
          // X AXIS
          let xcol = dataManager.getMapper('xaxis');
          let xDiff = self.brush.extent()[1][0] - self.brush.extent()[0][0];
          if(self.brush.extent() !== undefined && xDiff > 0){
            filter[xcol] = [self.brush.extent()[0][0], self.brush.extent()[1][0]];
            if(dataType[xcol] == "string"){
              filter[xcol] = self.invertDiscreteValues(filter[xcol], "x", xcol);
            }
          }else{
            filter[xcol] = null;
          }
          // Y AXIS
          let ycol = dataManager.getMapper('yaxis');
          let yDiff = self.brush.extent()[1][1] - self.brush.extent()[0][1];
          if(self.brush.extent() !== undefined && xDiff > 0){
            filter[ycol] = [self.brush.extent()[0][1], self.brush.extent()[1][1]];
            if(dataType[ycol] == "string"){
              filter[ycol] = self.invertDiscreteValues(filter[ycol], "y", ycol);
            }
          }else{
            filter[ycol] = null;
          }
          // FILTER
          let fullrange_color =  designManager.getValue('FULLRANGE_COLOR_MODE');
          if(self.io.highlight() || (self.io.fullrange() && fullrange_color == "dynamic")) {
            dataManager.setHighlightRefiner(filter);
            self.updateColors();
          } else if(self.io.fullrange() && fullrange_color == "static"){
            dataManager.setHighlightRefiner({});
            self.updateColors();
            dataManager.setHighlightRefiner(filter);
          } else {
            dataManager.setRowRefiner(filter);
          }
       });
     self.svg.append("g")
       .attr("class", "brush")
       .call(self.brush)
       .selectAll("rect");
   }else{
     self.brush = undefined;
   }
  };

  ScatterPlot.prototype.invertDiscreteValues = function(position, type, key) {

    let self = this;
    let value_ranges = self.io.dataManager().getDataRange(key);
    let ranges = [];
    if(position == null){
      return value_ranges;
    }
    if(type == "x"){
      ranges = value_ranges.filter(function(d){
        return self.x(d) >= position[0] && self.x(d) <= position[1];
      });
    }else if(type == "y"){
      ranges = value_ranges.filter(function(d){
        return self.y(d) >= position[0] && self.y(d) <= position[1];
      });
    }
    return ranges;
  }

  ScatterPlot.prototype.updateColors = function() {
    let self = this;
    let colorManager = self.io.colorManager();
    let dataManager = self.io.dataManager();
    let colorMap = colorManager.getColormap();
    let filter = self.io.dataManager().getRowRefiner();
    if(colorMap !== undefined){
      refineset = dataManager.getHighlightRefiner();
      if(refineset){
        this.svg.selectAll("circle")
          .classed("hideme", function (row) {
            return !dataManager.isActiveRow(row, refineset);
          });
        if(refineset = {}){
          this.svg.selectAll("circle")
            .style("fill", function(d){
              return colorManager.getColorOfRow(d);
            });
        }
      }
    }
  };

  return ScatterPlot;
});
