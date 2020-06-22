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
 * AxisSelectable class to create,display selectable area 
 * by two dimension coordinates
 * @param {object} options Some parameters for this function
 */
 
define(function() {
  var AxisSelectable= function(options) {
      // Create local Chart
      var _this = this;
      
      // Width and Height of Selectable Chart
      this.width   = options.width;
      this.height  = options.height;
      this.posX = options.posX;
      this.posY = options.posY;
      
      // Some bound value from data
      this.startX = options.startX;
      this.endX   = options.endX;
      this.startY = options.startY;
      this.endY   = options.endY;
      
      this.from = options.from;
      this.to   = options.to;
      
      this.format = options.format;
      this.oriented = options.axisOriented;
      
      // Main Chart is effected when control in Seclectable Chart
      this.charts = options.charts;
      
      // Data after standardizing
      this.data = options.data;
      
      // Space to draw
      this.svg = options.svg;

      // Create a overlay brush to control MainChart
      this.brush = d3.svg.brush()
          .on("brush", $.proxy(_this.onBrush, _this));

      this.context = this.svg.append("g")
                             .attr("class", "context");
  };

  /**
   * Update new value of axis selectable
   * @param {object} options Some parameters for this function
   */
  AxisSelectable.prototype.update = function(options) {
      if (options.width !== undefined) { this.width = options.width; }
      if (options.height !== undefined) { this.height = options.height; }
      if (options.posX !== undefined) { this.posX = options.posX; }
      if (options.posY !== undefined) { this.posY = options.posY; }
      
      if (options.startX !== undefined) { this.startX = options.startX; }
      if (options.endX !== undefined) { this.endX = options.endX; }
      if (options.startY !== undefined) { this.startY = options.startY; }
      if (options.endY !== undefined) { this.endY = options.endY; }

      if (options.from !== undefined) { this.from = options.from; }
      if (options.to !== undefined) { this.to = options.to; }

      if (options.format !== undefined) { this.format = options.format; }
      if (options.oriented !== undefined) { this.oriented = options.axisOriented; }
      if (options.charts !== undefined) { this.charts = options.charts; }
      
      if (options.data !== undefined) { this.data = options.data; }
      
      if (this.startX === this.endX) {
          this.isVertical = true;
      } else if (this.startY === this.endY) {
          this.isVertical = false;
      }
      
      // Create range and domain scale for x axis
      this.contextXScale = d3.scale.linear()
          .range([0, this.width])
          .domain([this.startX, this.endX]);

      // Create range and domain scale for y axis
      this.contextYScale = d3.scale.linear()
          .range([this.height, 0])
          .domain([this.startY, this.endY]);
      if (!this.from) { this.from = 0; }
      if (!this.to) { this.to = 0; }
  };

  /**
   * Map axis to svg and draw this axis
   */
  AxisSelectable.prototype.render = function() {
      this.context.remove();
      this.context = this.svg.append("g")
                             .attr("class", "context")
                             .attr("transform", "translate(" + this.posX + "," + this.posY + ")")
                             .on("mousedown" , function () {
                                  d3.event.stopPropagation();
                              });
      this.drawAxis();
      var extent = this.brush.extent();
      if (!extent) {
          extent = [this.from, this.to];
      }
      // Add g tag to draw chart
      if (this.isVertical) {
          this.context.append("g")
              .attr("class", "y brush")
              .call(this.brush.y(this.contextYScale).extent(extent))
              .selectAll("rect")
              .attr("x", 0)
              .attr("width", this.width);
      } else {
          this.context.append("g")
              .attr("class", "x brush")
              .call(this.brush.x(this.contextXScale).extent(extent))
              .selectAll("rect")
              .attr("y", 0)
              .attr("height", this.height);
      }
  };

  /**
   * Draw axis in svg area outside of main chart
   */
  AxisSelectable.prototype.drawAxis = function() {
      var axis = d3.svg.axis();
      if (this.format !== undefined) {
          axis.tickFormat(d3.format(this.format));
      }
      if (this.isVertical) {
          switch (this.oriented) {
              case "left":
                  axis.scale(this.contextYScale).orient("right");
                  this.context.append("g").call(axis);
                  break;
              case "right":
                  axis.scale(this.contextYScale).orient("left");
                  this.context.append("g").call(axis).attr("transform", "translate(" + this.width + ", 0)");
                  break;
              default:
                  this.oriented = "non";
                  break;
          }
      } else {
          switch (this.oriented) {
              case "top":
                  axis.scale(this.contextXScale).orient("bottom");
                  this.context.append("g").call(axis);
                  break;
              case "bottom":
                  axis.scale(this.contextXScale).orient("top");
                  this.context.append("g").call(axis).attr("transform", "translate(0, " + this.height + ")");
                  break;
              default:
                  this.oriented = "non";
                  break;
          }
      }
  };

  /**
   * Listener when user select a range in this axis and change scale to display 
   * main charts correct
   */
  AxisSelectable.prototype.onBrush = function () {
      var _this = this;
      
      var b;// = _this.brush.empty() ? this.isVertical ? this.contextYScale.domain() : this.contextXScale.domain() : _this.brush.extent();

      this.context.select("g").call(this.brush.extent(this.brush.extent()));
      if (_this.brush.empty()) {
          b = this.isVertical ? this.contextYScale.domain() : this.contextXScale.domain();
      } else {
          b = _this.brush.extent();
      }
      
      _this.charts.forEach(function(d) {
          if(_this.isVertical){
               d.scaleYAxis(b);
          } else {
                    d.scaleXAxis(b);
          }
      });
  };

  AxisSelectable.prototype.moveToRight = function (interval) {
      var domain = this.contextXScale.domain();
      var extent = this.brush.extent();
      if (extent[1] + interval < domain[1]) {
          extent[0] += interval;
          extent[1] += interval;
      } else {
          extent[0] += domain[1] - extent[1];
          extent[1] = domain[1];
      }
      this.context.select("g").call(this.brush.extent(extent));
      this.onBrush();
  };

  AxisSelectable.prototype.moveToLeft = function (interval) {
      var domain = this.contextXScale.domain();
      var extent = this.brush.extent();
      if (extent[0] - interval > domain[0]) {
          extent[0] -= interval;
          extent[1] -= interval;
      } else {
          extent[1] -= (extent[0] - domain[0]);
          extent[0] = domain[0];
      }
      this.context.select("g").call(this.brush.extent(extent));
      this.onBrush();
  };
  return AxisSelectable;

});
