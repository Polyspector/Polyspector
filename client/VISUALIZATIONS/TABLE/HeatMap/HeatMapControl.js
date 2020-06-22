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


define(['jquery', 'd3', 'ControlPanel', 'jsColor', 'jQueryUI' , 'RangeSlider', 'css!css/LineChart', 'css!css/CommonCss' ,'css!range_slider_css/ion.rangeSlider', 'css!range_slider_css/ion.rangeSlider.skinFlat'], function($, d3, ControlPanel, jsColor, jQueryUI, RangeSlider) {
    /**
     * Constructor create LineChartControl
     * @class LineChartControl
     * @param {number} width - width of view
     * @param {string} id - id of chart
     * @param {Object} line - LineChart object
     * @returns {LineChartControl}
     */
    function LineChartControl(width, id, line) {
        ControlPanel.call(this, width, id);
        this.line = line;
    }

    /**
     * Indicate this class is inherited from ControlPanel class
     * @memberOf LineChartControl
     */
    LineChartControl.prototype = Object.create(ControlPanel.prototype);


    /**
     * for render control panel
     * @memberOf LineChartControl
     * @returns {undefined}
     */
    LineChartControl.prototype.render = function() {
        // append div to bound entire control panel
        d3.select('#' + this.id).append('div')
                .attr({
                    "id": "control_panel_line_chart",
                    "height": "100%",
                    "width": "100px",
                    "class": "hidden"
                });

        var _this = this;
        var div_control_panel = d3.select('#control_panel_line_chart');
        // append div to contain header of control pannel
        div_control_panel.append('div')
                .attr({
                    "id": "trigger_line_chart",
                    "class": "trigger_panel"
                })                ;
        // append text for div header which name for control panel
        d3.select('#trigger_line_chart').append('text')
                .text('Control LineChart ');
        // append text for div header to set icon for trigger
        d3.select('#trigger_line_chart').append('text')
                .attr('id', 'icon_trigger_line_chart')
                .text('>>');

        // append selectbox which contain all legend of chart
        div_control_panel.append('select')
                .attr({
                    "id": "legend_line_chart",
                    "multiple": "true"
                })
                .on('change', function() {
                    _this.line.checkSelection();
                    addOption(_this.line.select);
                    controlElement(_this.line.select);
                    initializeColorForInputTag();
                    // reset range slider
                    $("#slider_line").ionRangeSlider("update", {from : 0, to: 0});
                })
                ;
        // add option for selectbox
        d3.select('#legend_line_chart').selectAll('option').data(_this.line.allLegend)
            .enter()
            .append("option")
            .text(function(d) { return d;});

        // create checkbox to display by Multi Series
        var changeAxis = div_control_panel.append("span").attr("id", "multi_series_line_chart");

        changeAxis.append("input")
            .attr({
                type: "checkbox",
                id: "checkbox_line_chart"
            })
            .property({
                "checked": _this.line.defaultCheckbox,
                "disabled": "disabled"
            })
            .on("change", function() {
                _this.line.changeDisplayType();
                addOption(_this.line.select);
                initializeColorForInputTag();
                // reset range slider
                $("#slider_line").ionRangeSlider("update", {from : 0, to: 0});
            });

        changeAxis.append("label").text("Multi Series");


        // append selectbox to change color for line chart
        div_control_panel.append('select')
                .attr({
                    "id": "change_color_line_chart"
                })
                .property('disabled', 'disabled')
                .on('change', function() {
                    var selected = $('#change_color_line_chart').find(":selected").text();
                    setColorForInputTag(selected);
                })
                ;
        // add option for selectbox
        d3.select('#change_color_line_chart').selectAll('option').data(_this.line.allLegend)
            .enter()
            .append("option")
            .text(function(d) { return d;});
        // append input tag to select color
        div_control_panel.append('input')
                .attr({
                    "id": "pick_color_line_chart",
                    "class": "color {required:false}",
                    "value": ""
                })
                .property('disabled', 'disabled')
                .on("change", jQuery.proxy(this, 'changeColor'));
        // append range slider
        div_control_panel.append('div').attr('id', 'slider_line_chart');
        d3.select('#slider_line_chart').append('input').attr({
            type: 'text',
            id  : 'slider_line'
        });
        // set property and set event for range slider
        $("#slider_line").ionRangeSlider({
            min: _this.line.minXValue,
            max: _this.line.maxXValue,
            from: 0,// overwrite default FROM setting
            to: 0,
            type: 'double',
            prefix: "",
            maxPostfix: "",
            prettify: false,
            hasGrid: true,
            onChange: function(obj) {
                if (obj.fromNumber === obj.toNumber) {
                    // display entire of chart
                    _this.line.scaleXAxis([0, _this.line.maxXValue]);
                } else {
                    // display selected range of chart
                    _this.line.scaleXAxis([obj.fromNumber, obj.toNumber]);
                }
            }
        });

        // set click event for trigger
        $('#trigger_line_chart').click(function() {
            if ($('#control_panel_line_chart').hasClass('hidden')) {
                $('#control_panel_line_chart').removeClass('hidden');
                $('#control_panel_line_chart').animate({left: '-48px'}, 'slow', function() {
                    $('#icon_trigger_line_chart').html('<<');
                });
            } else {
                $('#control_panel_line_chart').addClass('hidden');
                $('#control_panel_line_chart').animate({left: '-12%'}, 'slow', function() {
                    $('#icon_trigger_line_chart').html('>>');
                });
            }
        });

    };

    /**
     * for change color of chart and legend
     * @memberOf LineChartControl
     * @returns {undefined}
     */
    LineChartControl.prototype.changeColor = function() {
        // get selected option
        var selection = d3.select('#change_color_line_chart')[0][0].selectedOptions;
        // convert string of selected option
        var options = "line_chart_" + selection[0].text.replace(/ /g, "_");
        // change color for chart
        d3.selectAll('.' + options).style('stroke', $('#pick_color_line_chart').css('background-color'));
        // change color for legend
        d3.selectAll('.legend_' + options).style('fill', $('#pick_color_line_chart').css('background-color'));

    };

    /**
     * for adding option for selectbox which contains all legends
     * @memberOf LineChartControl
     * @param {type} options
     * @returns {undefined}
     */
    function addOption(options) {
        // remove all current options of selectbox
        $('#change_color_line_chart').empty();
        // add new option for selectbox
        d3.select('#change_color_line_chart').selectAll('option').data(options)
            .enter()
            .append("option")
            .text(function(d) { return d;});
    }

    /**
     * for setting color for input tag which pick color for chart and legend
     * @memberOf LineChartControl
     * @private
     * @param {type} line
     * @returns {undefined}
     */
    function setColorForInputTag(line) {
        var element = 'line_chart_' + line.replace(/ /g, '_');
        // get color of selected legend
        var color = d3.select('.' + element).style('stroke');
        // set color and value for input tag
        d3.select('#pick_color_line_chart').style('background-color', color)
                .property('value', colorToHex(color));
    }

    /**
     * for initializing color for input tag (display color of first legend in selectbox)
     * @memberOf LineChartControl
     * @private
     * @returns {undefined}
     */
    function initializeColorForInputTag() {
        var select = d3.select('#change_color_line_chart')[0][0];
        setColorForInputTag(select[0].__data__);
    }

    /**
     * for setting enable or disable selectbox and input which support changing color
     * @param {type} select
     * @returns {undefined}
     * @memberOf LineChartControl
     * @private
     */
    function controlElement(select) {
        if (select.length > 0) {
            enableElement();
        } else {
            disableElement();
        }
    }

    /**
     * for enable selectbox and input tag
     * @memberOf LineChartControl
     * @private
     * @returns {undefined}
     */
    function enableElement() {
        d3.select('#change_color_line_chart').property('disabled', false);
        d3.select('#pick_color_line_chart').property('disabled', false);
    }

    /**
     * for disable selectbox and input tag
     * @memberOf LineChartControl
     * @private
     * @returns {undefined}
     */
    function disableElement() {
        d3.select('#change_color_line_chart').property('disabled', 'disabled');
        d3.select('#pick_color_line_chart').property('disabled', 'disabled');
    }

    /**
     * for converting color form rgb to hex code
     * @memberOf LineChartControl
     * @private
     * @param {type} color
     * @returns {string}
     */
    function colorToHex(color) {
        if (color.substr(0, 1) === '#') {
            return color;
        }

        var digits = /(.*?)rgb\((\d+), (\d+), (\d+)\)/.exec(color);

        var red = parseInt(digits[2]);
        var green = parseInt(digits[3]);
        var blue = parseInt(digits[4]);

        var rgb = blue | (green << 8) | (red << 16);
        return (digits[1] + rgb.toString(16)).toUpperCase();
    }

    return LineChartControl;
});
