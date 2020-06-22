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
 * @fileOverview implement for HeatMap
 */

/**
 * Create HeatMap main function
 * @class HeatMap
 * @param {type} AxisSelectable AxisSelectable class
 * @param {type} CustomTooltip CustomTooltip class
 * @returns {HeatMap}
 */
define(["util/AxisSelectable",
        "util/tooltip/OldTooltip",
        "text!./control.html",
        "css!./HeatMap"], function (AxisSelectable, CustomTooltip, designTpl) {
  /**
   * Constructor create HeatMap
   * @class HeatMap
   * @param {ChartModel} io - model of chart which extend from Backbone.Model
   * @returns {HeatMap}
   */
  var HeatMap = function (io) {
    this.io = io;

    //higher priority for set initial io variable values from template
    this.io.designManager().setTemplate(designTpl);
    this.io.colorManager().setTypeOfColorColumn('number');
    this.io.dataManager().setMapperProps({
      xaxis: {type: 'number', label: 'X axis', map2: '', spk: 'width' },
      yaxis: {type: 'number', label: 'Y axis', map2: '', spk: 'height' }
    });

  };

  /**
   * update chart according with changed of interface variables
   * @method HeatMap
   * @memberOf HeatMap
   * @returns {HeatMap}
   */
  HeatMap.prototype.update = function (changed) {
    var self = this;
    // // if _CHART_ changed
    // if(changed.hasOwnProperty("DATA_MANAGER")   ||
    //    changed.hasOwnProperty("DESIGN_MANAGER") ||
    //    changed.hasOwnProperty("COLOR_MANAGER")
    //   ) {
    //   this.redraw();
    // } else  {//MODE change
    //   this.redraw();
    // }

      if (changed.hasOwnProperty("COLOR_MANAGER")) {
		  self.updateColors();
      } else if (changed.hasOwnProperty("DESIGN_MANAGER")) {
		  self.redraw();
      } else if (changed.hasOwnProperty("DATA_MANAGER") || changed.hasOwnProperty("MODE")) {
		  if(self.brushAction === true){
			  self.brushAction = false;
			  if(self.io.drilldown()) {
				  self.redraw();
			  }
		  } else {
			  self.redraw();
		  }
      }
  };

   HeatMap.prototype.redraw = function() {
     this.deleteExistingElements();
     this.drawHeatMap();
  };

  /**
   * render heatmap
   * @method render
   * @memberOf HeatMap
   */
  HeatMap.prototype.render = function (containerWidth, containerHeight) {

    // initialize
    this.initialize(containerWidth, containerHeight);

    // create heatmap
    this.drawHeatMap();

    return this.svg_dom;

  };
  /**
   * initialize
   * @method initialize
   * @memberOf HeatMap
   */
  HeatMap.prototype.initialize = function (containerWidth, containerHeight) {
    // set default value for checkbox
    this.defaultCheckbox = false;
    // define width and height of drawing area
	this.margin = {top: 20, right: 40, bottom: 40, left: 40};

    // set width, height
    this.width  = containerWidth - this.margin.right - this.margin.left;
    this.height = containerHeight - this.margin.top - this.margin.bottom;
    // set for legend
    this.legendSize = 290;

    // init for others
    this.maxXValue = 0;
    this.minXValue = 0;
    this.maxYValue = 0;
    this.minYValue = 0;

	// grid size
	this.gridSizeX = 10; // dummy value
	this.gridSizeY = 10; // dummy value

    this.line = null;

    this.svg_g = null;
    this.svg = null;
    this.tooltip = new CustomTooltip("tooltip", 200);

    // set for scales
    this.x = d3.scale.linear().range([0, this.width]);
    this.y = d3.scale.linear().range([this.height, 0]);
    this.xAxis = d3.svg.axis().scale(this.x).orient("bottom");
    this.yAxis = d3.svg.axis().scale(this.y).orient("left");

    // region selection
    this.select_start = null;
    this.brushAction  = false;

    this.createChartHeader();
  };


  /**
   * Convert received data to understandable data format for this chart
   * @method transformData
   * @memberOf HeatMap
   */
  HeatMap.prototype.transformData = function () {
    var self = this;

    var ycol = self.io.dataManager().getMapper('yaxis'),
        xcol = self.io.dataManager().getMapper('xaxis'),
        data = self.io.dataManager().getData();

    if(_.isEmpty(ycol) || _.isEmpty(xcol) || _.isEmpty(data)) return data;

    //filtered data
    if(self.io.drilldown() || self.io.highlight()) {
        data = self.io.dataManager().getFilteredRows();
    }

    // filter max x value
    self.maxXValue = d3.max(data.map(function (d) {
      return +(d[xcol]);
    }));
    // filter min x value
    self.minXValue = d3.min(data.map(function (d) {
      return +(d[xcol]);
    }));

    // filter max y value
    self.maxYValue = d3.max(data.map(function (d) {
      return +(d[ycol]);
    }));
    // filter min y value
    self.minYValue = d3.min(data.map(function (d) {
      return +(d[ycol]);
    }));

	self.gridSizeX = self.width / (self.maxXValue - self.minXValue + 1);
	self.gridSizeY = self.height / (self.maxYValue - self.minYValue + 1);

    self.setAxisesDomain(data);

    return data;
  };


    /**
     * create header of chart
     * @method createChartHeader
     * @memberOf HeatMap
     */
   HeatMap.prototype.createChartHeader = function () {
      var self = this;

      self.svg_dom = document.createElementNS(d3.ns.prefix.svg, 'svg');
      // create svg
      self.svg =  d3.select(self.svg_dom)
        .attr('class', 'heatmap')
        .attr("width", self.width)
        .attr("height", self.height);

      self.svg_g = self.svg
        .append("g")
        .attr("transform", "translate(" + self.margin.left + "," + self.margin.top + ")");

   };

	HeatMap.prototype.heatMapChart = function(data) {
		var self = this;

		var dataManager = self.io.dataManager();
		var ycol = dataManager.getMapper('yaxis'),
			xcol = dataManager.getMapper('xaxis');
        var colorManager = this.io.colorManager();

		var cards = self.svg_g.selectAll("rect")
		    .data(data)
		cards.enter().append("rect")
			.attr("x", function(d) { return  ((+d[xcol]) - self.minXValue) * self.gridSizeX; })
			.attr("y", function(d) { return  (self.maxYValue - (+d[ycol])) * self.gridSizeY; })
			.attr("class", "map element")
			.attr("width", self.gridSizeX)
			.attr("height", self.gridSizeY)
		    .style("fill", function(d) {
				return colorManager.getColorOfRow(d);
			})
			.on("mouseover", function(d){
				d3.select(this).style("fill", "yellow");
				if(self.select_start != null) {
					var select_cur = {x: +d[xcol], y: +d[ycol]};
					if(select_cur.x != self.select_start.x){
						return; // selection is permitted only for same X (should be controlled by design manager in future)
					}
					var xrange = (self.select_start.x < select_cur.x)?
						[self.select_start.x, select_cur.x] : [select_cur.x, self.select_start.x];
					var yrange = (self.select_start.y < select_cur.y)?
						[self.select_start.y, select_cur.y] : [select_cur.y, self.select_start.y];
					highlightSelectedRegion(xrange, yrange);
				}
			})
			.on("mouseout", function(){
				d3.select(this).style("fill", function(d){
					return colorManager.getColorOfRow(d);
				});
			})
			.on("click", function(d){
				if(self.select_start != null){
					var select_end = {x: +d[xcol], y: +d[ycol]};
					if(self.select_start.x == select_end.x) {
						self.brushAction = true;
						// set FILTER
						var filter = {};
						filter[xcol] = (self.select_start.x < select_end.x)?
							[self.select_start.x, select_end.x] : [select_end.x, self.select_start.x];
						filter[ycol] = (self.select_start.y < select_end.y)?
							[self.select_start.y, select_end.y] : [select_end.y, self.select_start.y];
						self.io.dataManager().setRowRefiner(filter);
						
					} else {
						clearSelectedRegion();
					}
					self.select_start = null;
				} else {
					self.select_start = {x: +d[xcol], y: +d[ycol]};
				}
			})
			.on("dblclick", function(){
					self.select_start = null;
					clearSelectedRegion();
			});

		cards.exit().remove();

		function highlightSelectedRegion(xrange, yrange) {
			self.svg_g.selectAll("rect")
				.style("opacity", function(d){
					if (+d[xcol] >= xrange[0] && +d[xcol] <= xrange[1]
						&& +d[ycol] >= yrange[0] && +d[ycol] <= yrange[1]){
						return 0.7;
					} else {
						return 1;
					}
				});
		}
		function clearSelectedRegion() {
			self.svg_g.selectAll("rect")
				.style("opacity", 1);
		}

		// var legend = self.svg_g.selectAll(".legend")
		// 	.data([0].concat(colorScale.quantiles()), function(d) { return d; });

		// legend.enter().append("g")
		// 	.attr("class", "legend");

		// legend.append("rect")
		// 	.attr("x", function(d, i) { return legendElementWidth * i; })
		// 	.attr("y", height)
		// 	.attr("width", legendElementWidth)
		// 	.attr("height", gridSize / 2)
		// 	.style("fill", function(d, i) { return colors[i]; });

		// legend.append("text")
		// 	.attr("class", "mono")
		// 	.text(function(d) { return "≥ " + Math.round(d); })
		// 	.attr("x", function(d, i) { return legendElementWidth * i; })
		// 	.attr("y", height + gridSize);

		// legend.exit().remove();
	};

  /**
   * draw heatmap
   * @method params
   * @memberOf HeatMap
   */
   HeatMap.prototype.drawHeatMap = function () {
    var self = this;

    var data = this.transformData();

    // create chart
    this.heatMapChart(data);

    // labels.append("path")
    //   .attr("id", function (d) {
    //     return "line_" + d.name.replace(/ /g, "_");
    //   })
    //   .attr("class", "line")
    //   .attr("d", function (d) {
    //     return self.line(d.values);
    //   })
    //   .style("stroke", function (d) {
    //     return colorManager.getColorOfColumn(d.name);
    //   });

	// create axises
    self.drawAxises();

    //self.drawTooltips();
    //self.drawBrush();
    //self.drawLegend();
  };

  HeatMap.prototype.updateColors = function() {
      var self = this;
      var colorManager = self.io.colorManager();

      self.svg_g.selectAll("rect")
		  .style("fill", function(d) {
			  return colorManager.getColorOfRow(d);
		  });
  };

  HeatMap.prototype.drawBrush = function(){
    var self = this;
    self.brush = d3.svg.brush()
          .x(self.x)
          .y(self.y)
          .on("brushstart", function(){
			  if(d3.event.sourceEvent.button !== 0) return; //only permit left key
			  d3.event.sourceEvent.stopPropagation();
          })
          .on("brushend", function(){
			  if(d3.event.sourceEvent.button !== 0) return; //only permit left key
			  d3.event.sourceEvent.stopPropagation();
			  self.brushAction = true;
			  var filter = {};
			  // X AXIS
			  var xcol = self.io.dataManager().getMapper('xaxis');
			  var xDiff = self.brush.extent()[1][0] - self.brush.extent()[0][0];
			  if(self.brush.extent() !== undefined && xDiff > 0){
				  filter[xcol] = [Math.floor(self.brush.extent()[0][0]), Math.floor(self.brush.extent()[1][0])];
			  }else{
				  filter[xcol] = null;
			  }
			  // Y AXIS
			  var ycol = self.io.dataManager().getMapper('yaxis');
			  var yDiff = self.brush.extent()[1][1] - self.brush.extent()[0][1];
			  if(self.brush.extent() !== undefined && xDiff > 0){
				  filter[ycol] = [Math.floor(self.brush.extent()[0][1]), Math.floor(self.brush.extent()[1][1])];
			  }else{
				  filter[ycol] = null;
			  }
			  // FILTER
			  //if( self.io.highlight() ) {
				//  self.io.dataManager().setHighlightRefiner(filter);
			  //} else {
				  self.io.dataManager().setRowRefiner(filter);
			  //}
		  });

      self.svg_g.append("g")
	  	  .attr("class", "brush")
	  	  .call(self.brush)
	   	  .selectAll("rect");
  };

  /**
   * draw X axis, Y axis for chart
   * @method params
   * @memberOf HeatMap
   */
  HeatMap.prototype.drawAxises = function () {
    var self = this;

    // init for X axis
    var  xAxis = d3.svg.axis()
      .scale(self.x)
      .orient("bottom").ticks(5).tickSize(4);

    // init for Y axis
    var  yAxis = d3.svg.axis()
      .scale(self.y)
      .orient("left").ticks(5).tickSize(4);

    // create X axis
    self.svg_g.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + self.height + ")")
      .call(xAxis)
     .append('text')
       .attr('class', 'xlabel')
       .attr('x', self.width)
       .attr('y', -6)
       .style('text-anchor', 'end')
       .text(self.io.dataManager().getMapper('xaxis'));

    // create Y axis
    self.svg_g.append("g")
      .attr("class", "y axis")
      .call(yAxis)
    .append('text')
      .attr('class', 'ylabel')
      .attr("transform", "rotate(-90)")
      .attr('y', 6)
      .attr("dy", ".71em")
      .style('text-anchor', 'end')
      .text(self.io.dataManager().getMapper('yaxis'));
  };


  /**
   * get domain value for X, Y axis
   * @method setAxisesDomain
   * @memberOf HeatMap
   */
  HeatMap.prototype.setAxisesDomain = function (data) {
    var self = this,
        ret  = {};

    // set domain for X axis
    var xcol = this.io.dataManager().getMapper('xaxis'),
    xDomain = d3.extent(data, function (d) {
            return +d[xcol];
    });
    this.x.domain(xDomain);

    // set domain for Y axis
    var ycol = this.io.dataManager().getMapper('yaxis'),
    yDomain = d3.extent(data, function (d) {
            return +d[ycol];
    });
    this.y.domain(yDomain);
  };


  /**
   * Show tooltip when mouseover
   * @param {string} name - name of element which on mouseover
   * @param {string} value - value of element which on mouseover
   * @method showTooltip
   * @memberOf HeatMap
   */
  HeatMap.prototype.showTooltip = function (name, value) {
    var content = "<span class=\"name\">Name: </span>" + name + "<br/><span class=\"value\"> Value: </span>" + value;
    return this.tooltip.showTooltip(content, d3.event.sourceEvent);
  };
  /**
   * Hide tooltip when mouseout
   * @method hideTooltip
   * @memberOf HeatMap
   */
  HeatMap.prototype.hideTooltip = function () {
    return this.tooltip.hideTooltip();
  };
  /**
   * Display context menu for Line chart
   * @method rightclick
   * @memberOf HeatMap
   */
  HeatMap.prototype.rightclick = function () {
    var self = this,
      // Declare variable to hold position x and y when right click
      x, y;
    if (d3.event.pageX || d3.event.pageY) {
      x = d3.event.pageX;
      y = d3.event.pageY;
    } else if (d3.event.clientX || d3.event.clientY) {
      x = d3.event.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
      y = d3.event.clientY + document.body.scrollTop + document.documentElement.scrollTop;
    }

    // Show context menu
    d3.select("#heatmap-menu").style('position', 'absolute')
      .style('top', y + 'px')
      .style('left', x + 'px')
      .style('display', 'block');
    // Prevent default right click
    d3.event.preventDefault();
    // Hide context menu when click out side
    $(document).bind("click keyup", function (event) {
      d3.select("#heatmap-menu").style('display', 'none');
    });
    // Set event listener for item of context menu
    d3.select("#heatmap-menu")
      .selectAll("li")
      .on("click", function (d, i) {
        if (i === 0) {
          // do nothing
        } else if (i === 1) {
          // do nothing
        } else {
          // do nothing
        }
      });
  };

  /**
   * remove current svg and reset data to draw other type of chart
   * @method params
   * @memberOf HeatMap
   */
  HeatMap.prototype.deleteExistingElements = function () {
    var self = this;
    // delete existing elements of svg before redraw
    if(self.svg_g) {
      self.svg_g.remove();
    }
    // reset svg
    self.svg_g = self.svg.append("g")
      .attr("transform", "translate(" + self.margin.left + "," + self.margin.top + ")");
  };

  return HeatMap;
});
