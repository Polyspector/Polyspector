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
 * @fileOverview implement for ScatterMatrixChart
 */

/**
 * Create ScatterMatrixChart main function
 * @class ScatterMatrixChart
 * @returns {ScatterMatrixChart}
 */
define(["text!./control.html", "css!./ScatterMatrixChart"], function (designTpl) {
  /**
   * Constructor
   * @class ScatterMatrixChart
   * @param {ChartModel} io - model of chart which extend from Backbone.Model
   * @returns {ScatterMatrixChart}
   */
  var ScatterMatrixChart = function (io) {
    this.io = io;
    
    //init interface variables for this chart
    this.io.designManager().setTemplate(designTpl);
    
    this.io.colorManager().setTypeOfColorColumn('number','string');
    this.io.dataManager().setMapperProps({
      parameters: { label: 'Parameters from',type: 'number', map2: []} 
    });
  };
  
  /**
   * update chart according with changed of interface variables
   * @method ScatterMatrixChart
   * @memberOf ScatterMatrixChart
   * @returns {ScatterMatrixChart}
   */
  ScatterMatrixChart.prototype.update = function (changed) {
    var self = this;
    if (changed.hasOwnProperty("COLOR_MANAGER")) {
      this.updateColors();
    }
    else if (changed.hasOwnProperty("DESIGN_MANAGER")) {
      this.redraw();
    }
    else if (changed.hasOwnProperty("DATA_MANAGER")) {
      this.redraw();
    } 
    else  {//MODE change
      this.redraw();
    }
  };
  
    /**
     * render Scatter Matrix Chart
     * @method render
     * @memberOf ScatterMatrixChart
     */
  ScatterMatrixChart.prototype.render = function (containerWidth, containerHeight) {
     // initialize
     this.initialize(containerWidth, containerHeight);
     // create chart header
     this.createChartHeader();
     // create scatter matrix chart
     this.drawScatterMatrixChart();
     
     return this.svg_dom;
  } ;
  
  ScatterMatrixChart.prototype.redraw = function() {
     this.deleteExistingElements();
     this.drawScatterMatrixChart();
  }; 

  /**
   * initialize
   * @method initialize
   * @memberOf ScatterMatrixChart
   */
  ScatterMatrixChart.prototype.initialize = function (containerWidth, containerHeight) {
    
    // define width and height of drawing area
    this.width = containerWidth;
    this.height = containerHeight;
    
    // init margin
    this.margin = {left: 40, top: 10, right: 20, bottom: 40 };
    this.padding = 8;
    
    // Scales
    this.x = d3.scale.linear();
    this.y = d3.scale.linear();
    this.xAxis = d3.svg.axis().scale(this.x).orient("bottom").ticks(5);
    this.yAxis = d3.svg.axis().scale(this.y).orient("left").ticks(5);
    
    this.brushCell = null;
    //this._mode = "fullrange"; //drilldown
  };

 
  /**
   * create header of chart
   * @method createChartHeader
   * @memberOf ScatterMatrixChart
   */
  ScatterMatrixChart.prototype.createChartHeader = function () {
    var self = this;
   
    if(self.svg_dom) {
        while (self.svg_dom.firstChild) {
            self.svg_dom.removeChild(self.svg_dom.firstChild);
        }
    } else {
        self.svg_dom = document.createElementNS(d3.ns.prefix.svg, 'svg');
    }
    
    self.svg =  d3.select(self.svg_dom)
      .attr('class', 'scattermatrixchart')
    .append("g")
      .attr("transform", "translate(" + self.margin.left + "," + self.margin.top + ")");
  };


 /**
   * For calculate size of cell depend on selection
   * @method calculateCellSize
   * @memberOf ScatterMatrixChart
   * @returns {undefined}
   */
  ScatterMatrixChart.prototype.calculateCellSize = function (filteredColumns) {
 
    // get size for each cell depend on number of selected parameters
    this.sizew = (this.width -this.margin.left -this.margin.right)  / filteredColumns.length;
    this.sizeh = (this.height -this.margin.bottom -this.margin.top) / filteredColumns.length;
    
    // set range for X, Y axis with calculated size, padding
    this.x.range([this.padding / 2, this.sizew - this.padding / 2]);
    this.y.range([this.sizeh - this.padding / 2, this.padding / 2]);
  };
    
  /**
   * draw scatter matrix chart depend on selected items by user
   * @method drawScatterMatrixChart
   * @memberOf ScatterMatrixChart
   */
  ScatterMatrixChart.prototype.drawScatterMatrixChart = function () {
    var self = this,
        dataManager = self.io.dataManager(),
        filteredColumns = dataManager.getFilteredColumns(),
        filteredRows = dataManager.getFilteredRows(),
        max_data_items = self.io.designManager().getValue('MAX_DATA_ITEMS');
    
    if( max_data_items !=undefined && filteredRows.length > +max_data_items ) {
      filteredRows = _.sample(filteredRows, +max_data_items);
    }
    
    if(filteredColumns.length<=0 || filteredRows.length <=0)  return;
    
     
    self.calculateCellSize(filteredColumns);
    self.drawAxis(filteredColumns);
    
    self.brush =d3.svg.brush()
      .x(self.x)
      .y(self.y)
      .on("brushstart", function (d) {
        self.brushstart(self, this, d);
      })
      .on("brush", function (d) {
        self.brushmove(self, d);
      })
      .on("brushend", function (d) {
        self.brushend(self, d);
      });
  
    // add cell of Matrix chart
    var cell = self.svg.selectAll(".cell")
      .data(cross(filteredColumns, filteredColumns))
      .enter()
    .append("g")
      .attr("class", 'cell')
      .attr("transform", function (d) {
        return "translate(" + d.i * self.sizew + "," + (filteredColumns.length - d.j - 1)  * self.sizeh + ")";
      })
      .each(function (d) {
        self.cellplot(d, this, filteredRows);
      });
    
    cell.call(self.brush).on("mousedown", function () {
      d3.event.stopPropagation();
    });
    
    //hide unfocused data for highligh mode
    var refineset =null;
    if(this.io.fullrange()) {
      refineset =  dataManager.getRowRefiner();
    }
    if(this.io.highlight()) {
      refineset =  dataManager.getHighlightRefiner();
    }
    if(refineset) {
      this.svg
        .selectAll("circle")
        .classed("hideme", function (row) {
           return !dataManager.isActiveRow(row, refineset);
        });
    }
  };

  
  /**
   * For draw axis X, Y
   * @method drawAxis
   * @memberOf ScatterMatrixChart
   * @returns {undefined}
   */
  ScatterMatrixChart.prototype.drawAxis = function (filteredColumns) {
    var self = this, dataManager = this.io.dataManager();
    
    // set ticksize
    self.xAxis.tickSize(self.sizeh * filteredColumns.length, 0);
    self.yAxis.tickSize(-self.sizew * filteredColumns.length, 0);
    
    // draw X axis
    self.svg.selectAll(".x.axis")
      .data(filteredColumns)
      .enter().append("g")
      .attr("class", "x axis")
      .attr("transform", function (d, i) {
        return "translate(" + i * self.sizew + ", 0)";
      })
      .each(function (d) {
        self.x.domain(dataManager.getDataRange(d));
        d3.select(this).call(self.xAxis);
      });

    // draw Y axis
    self.svg.selectAll(".y.axis")
      .data(filteredColumns)
      .enter().append("g")
      .attr("class", "y axis")
      .attr("transform", function (d, i) {
        return "translate(0," + (filteredColumns.length -i - 1) * self.sizeh + ")";
      })
      .each(function (d) {
        self.y.domain(dataManager.getDataRange(d));
        d3.select(this).call(self.yAxis);
      });

    // add title for X axis
    var xTitle = self.svg.append('g')
      .attr("class", "x title");
      
    xTitle.selectAll(".x title")
      .data(filteredColumns)
      .enter()
      .append("g")
        .attr("transform", function (d, i) {
            return "translate("+ ((i * self.sizew) + self.sizew / 2) + ',' +
               ( filteredColumns.length * self.sizeh + self.margin.bottom/2) +")";
        })
        .append("text")
            .attr("x", 0)
            .attr("y", 0)
            .attr("dy", ".71em")
            .text(function (d) {
                return d;
            });

    // add title for Y axis
    var yTitle = self.svg.append('g')
      .attr("class", "y title");
    yTitle.selectAll(".y title")
      .data(filteredColumns)
      .enter()
      .append("g")
        .attr("transform", function (d, i) {
            return "translate(" + (-self.margin.left) + "," + 
                ((filteredColumns.length -i - 1) * self.sizeh + self.padding/2 + self.sizeh/2) +")";
        })
        .append("text")
            .attr("x", 0)
            .attr("y", 0)
            .attr("dy", ".71em")
            .attr("transform", "rotate(-90)")
            .text(function (d) {
                return d;
            });
    };

  /**
   * Clear the previously-active brush, if any.
   * @method brushstart
   * @param {type} p
   * @memberOf ScatterMatrixChart
   */
  ScatterMatrixChart.prototype.brushstart = function (chart, item, p) {  
     if (chart.brushCell !== item) {
        d3.select(chart.brushCell).call(chart.brush.clear());
        chart.x.domain(chart.io.dataManager().getDataRange(p.x));
        chart.y.domain(chart.io.dataManager().getDataRange(p.y));
        chart.brushCell = item;
     }
   };

  /**
   * Highlight the selected circles.
   * @method brushmove
   * @param {type} p
   * @memberOf ScatterMatrixChart
   */
  ScatterMatrixChart.prototype.brushmove = function (chart, p) {
    //var e = chart.brush.extent();
    //chart.svg.selectAll("circle").classed("hideme", function (d) {
    //    return e[0][0] > +d[p.x] || +d[p.x] > e[1][0] || e[0][1] > +d[p.y] || +d[p.y] > e[1][1];
    //});
  };

  /**
   * If the brush is empty(no selection), show (restore) all circles.
   * @method brushend
   * @memberOf ScatterMatrixChart
   */
  ScatterMatrixChart.prototype.brushend = function (chart, p) {
    var filterset= {},
        mappedColumns = chart.io.dataManager().getMappedColumns();

    mappedColumns.forEach(function(column) {
        if(!_.has(filterset, column)){
           filterset[column] = null;
        }
    });

    if (chart.brush.empty()) {
       chart.io.dataManager().setRowRefiner(filterset); //clear refiner of all visible columns 
    }
    else {
        var e = chart.brush.extent(),
            selector = chart.io.dataManager().getColumnRefiner();
        if(p.x == p.y) {
            filterset[p.x]= [Math.max(e[0][0], e[0][1]), Math.min(e[1][0], e[1][1])];
        } else {
            filterset[p.x]= [e[0][0], e[1][0]];
            filterset[p.y]= [e[0][1], e[1][1]];
        }
        chart.io.dataManager().setRowRefiner(filterset);
        
        //if(!chart.io.fullrange()) {
            //set the current columns into selector
        //    chart.io.dataManager().setColumnRefiner([p.x, p.y]);
        //}
    }
  };

  /**
   * remove current svg and reset data to draw other type of chart
   * @method params
   * @memberOf ScatterMatrixChart
   */
  ScatterMatrixChart.prototype.deleteExistingElements = function () {
    var self = this;
    //clear brush
    self.brushCell = null;
    
    //clear all content
    while (self.svg_dom.firstChild) {
        self.svg_dom.removeChild(self.svg_dom.firstChild);
    }
    self.svg = d3.select(self.svg_dom);
    
  };

  /**
   * add plot to chart
   * @method plot
   * @param {type} p
   * @memberOf ScatterMatrixChart
   */
  ScatterMatrixChart.prototype.cellplot = function (p, current, filteredRows) {
    var self = this,
      colorManager = this.io.colorManager(),
      sizeh = self.sizeh,
      sizew = self.sizew,
      padding = self.padding,
      cell = d3.select(current);
   
    self.x.domain(this.io.dataManager().getDataRange(p.x));
    self.y.domain(this.io.dataManager().getDataRange(p.y));

    cell.append("rect")
      .attr("x", padding / 2)
      .attr("y", padding / 2)
      .attr("width",  sizew - padding)
      .attr("height", sizeh - padding);

    cell.selectAll("circle")
      .data(filteredRows)
      .enter().append("circle")
      .attr("cx", function (d) {
        return self.x(d[p.x]);
      })
      .attr("cy", function (d) {
        return self.y(d[p.y]);
      })
      .attr("r", 3)
      .style("fill", function (d) {
        return colorManager.getColorOfRow(d);
      });
  };
  
  ScatterMatrixChart.prototype.updateColors = function() {
     var colorManager = this.io.colorManager();
     this.svg.selectAll('.cell').selectAll("circle")
      .style("fill", function (d) {
        return colorManager.getColorOfRow(d);
      });
  }; 
 
  
  /**
   * calculate for grid line
   * @method cross
   * @param {type} a
   * @param {type} b
   * @memberOf ScatterMatrixChart
   * @private
   */
  function cross(a, b) {
    var c = [], n = a.length, m = b.length, i, j;
    for (i = -1; ++i < n; ) {
      for (j = -1; ++j < m; ) {
        c.push({
          x: a[i],
          i: i,
          y: b[j],
          j: j,
          name: a[i]+'.'+b[j]
        });
      }
    }
    return c;
  }
  return ScatterMatrixChart;
});
