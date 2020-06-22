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


define(['jquery', 'd3', 'ControlPanel', 'jsColor', 'css!css/ScatterMatrixChart', 'css!css/CommonCss'], function($, d3, ControlPanel, jsColor) {

    /**
     * Constructor
     * @class ScatterMatrixChartControl
     * @param {number} width - width of view
     * @param {string} id - id of chart
     * @param {Object} pie - ScatterMatrixChart object
     * @returns {ScatterMatrixChartControl}
     */
    function ScatterMatrixChartControl(width, id, scatter_matrix) {
        ControlPanel.call(this, width, id);
        this.scatter_matrix = scatter_matrix;
    }

    // indicate this class is inherited from ControlPanel class
    ScatterMatrixChartControl.prototype = Object.create(ControlPanel.prototype);

    /**
     * for render control panel
     * @memberOf ScatterMatrixChartControl
     * @returns {undefined}
     */
    ScatterMatrixChartControl.prototype.render = function() {
        // append div to bound entire control panel
        d3.select('#' + this.id).append('div')
                .attr({
                    "id": "control_panel_scatter_matrix_chart",
                    "height": "100%",
                    "width": "100px",
                    "class": "hidden"
                });

        var _this = this;
        var div_control_panel = d3.select('#control_panel_scatter_matrix_chart');

        // append div to contain header of control pannel
        div_control_panel.append('div')
                .attr({
                    "id": "trigger_scatter_matrix_chart",
                    "class": "trigger_panel"
                });
        // append text for div header which name for control panel
        d3.select('#trigger_scatter_matrix_chart').append('text')
                .text('Control ScatterMatrix ');
        // append text for div header to set icon for trigger
        d3.select('#trigger_scatter_matrix_chart').append('text')
                .attr('id', 'icon_trigger_scatter_matrix_chart')
                .text('>>');

        // append selectbox which contain all legend of chart
        div_control_panel.append('select')
                .attr({
                    "id": "category_scatter_matrix_chart",
                    "multiple": "true"
                })
                .on('change', function() {
                    _this.scatter_matrix.checkSelection();
                    addOption(_this.scatter_matrix.categorySelect);
                    controlElement(_this.scatter_matrix.categorySelect, _this.scatter_matrix.paramSelect);
                    initializeColorForInputTag();
                })
                ;
        // append selectbox which contain all category of chart
        div_control_panel.append('select')
                .attr({
                    "id": "param_scatter_matrix_chart",
                    "multiple": "true"
                })
                .on('change', function() {
                    _this.scatter_matrix.checkSelection();
                    controlElement(_this.scatter_matrix.categorySelect, _this.scatter_matrix.paramSelect);
                    initializeColorForInputTag();
                })
                ;
        // add option for selectbox
        d3.select('#category_scatter_matrix_chart').selectAll('option').data(_this.scatter_matrix.allCategory)
            .enter()
            .append("option")
            .text(function(d) { return d;});

        d3.select('#param_scatter_matrix_chart').selectAll('option').data(_this.scatter_matrix.allParameter)
            .enter()
            .append("option")
            .text(function(d) { return d;});

        // append selectbox to change color for scatter_matrix chart
        div_control_panel.append('select')
                .attr({
                    "id": "change_color_scatter_matrix_chart"
                })
                .property('disabled', 'disabled')
                .on('change', function() {
                    var selected = $('#change_color_scatter_matrix_chart').find(":selected").text();
                    setColorForInputTag(selected);
                })
                ;
        // add option for selectbox
        d3.select('#change_color_scatter_matrix_chart').selectAll('option').data(_this.scatter_matrix.allCategory)
            .enter()
            .append("option")
            .text(function(d) { return d;});
        // append input tag to select color
        div_control_panel.append('input')
                .attr({
                    "id": "pick_color_scatter_matrix_chart",
                    "class": "color {required:false}",
                    "value": ""
                })
                .property('disabled', 'disabled')
                .on("change", jQuery.proxy(this, 'changeColor'));

        // set click event for trigger
        $('#trigger_scatter_matrix_chart').click(function() {
            if ($('#control_panel_scatter_matrix_chart').hasClass('hidden')) {
                $('#control_panel_scatter_matrix_chart').removeClass('hidden');
                $('#control_panel_scatter_matrix_chart').animate({left: '-48px'}, 'slow', function() {
                    $('#icon_trigger_scatter_matrix_chart').html('<<');
                });
            } else {
                $('#control_panel_scatter_matrix_chart').addClass('hidden');
                $('#control_panel_scatter_matrix_chart').animate({left: '-12%'}, 'slow', function() {
                    $('#icon_trigger_scatter_matrix_chart').html('>>');
                });
            }
        });

    };

    /**
     * for change color of chart and legend
     * @memberOf ScatterMatrixChartControl
     * @returns {undefined}
     */
    ScatterMatrixChartControl.prototype.changeColor = function() {
        // get selected option
        var selection = d3.select('#change_color_scatter_matrix_chart')[0][0].selectedOptions;
        // convert string of selected option
        var options = "scatter_matrix_chart_" + selection[0].text.replace(/ /g, "_");
        // change color for chart
        d3.selectAll('.' + options).style('fill', $('#pick_color_scatter_matrix_chart').css('background-color'));
        // change color for legend
        d3.selectAll('.legend_' + options).style('fill', $('#pick_color_scatter_matrix_chart').css('background-color'));

    };

    /**
     * for adding option for selectbox which contains all legends
     * @memberOf ScatterMatrixChartControl
     * @param {type} options
     * @returns {undefined}
     */
    function addOption(options) {
        // remove all current options of selectbox
        $('#change_color_scatter_matrix_chart').empty();
        // add new option for selectbox
        d3.select('#change_color_scatter_matrix_chart').selectAll('option').data(options)
            .enter()
            .append("option")
            .text(function(d) { return d;});
    }

    /**
     * for setting color for input tag which pick color for chart and legend
     * @memberOf ScatterMatrixChartControl
     * @param {type} scatter_matrix
     * @returns {undefined}
     */
    function setColorForInputTag(scatter_matrix) {
        var element = 'scatter_matrix_chart_' + scatter_matrix.replace(/ /g, '_');
        // get color of selected legend
        var color = d3.select('.' + element).style('fill');
        // set color and value for input tag
        d3.select('#pick_color_scatter_matrix_chart').style('background-color', color)
                .property('value', colorToHex(color));
    }

    /**
     * for initializing color for input tag (display color of first legend in selectbox)
     * @memberOf ScatterMatrixChartControl
     * @returns {undefined}
     */
    function initializeColorForInputTag() {
        var select = d3.select('#change_color_scatter_matrix_chart')[0][0];
        if (select !== undefined)
            setColorForInputTag(select[0].__data__);
        else
            return false;
    }

    /**
     * for setting enable or disable selectbox and input which support changing color
     * @param {type} categorySelect
     * @param {type} paramSelect
     * @returns {undefined}
     */
    function controlElement(categorySelect, paramSelect) {
        if (categorySelect.length > 0 && paramSelect.length > 0) {
            enableElement();
        } else {
            disableElement();
        }
    }

    /**
     * for enable selectbox and input tag
     * @memberOf ScatterMatrixChartControl
     * @returns {undefined}
     */
    function enableElement() {
        d3.select('#change_color_scatter_matrix_chart').property('disabled', false);
        d3.select('#pick_color_scatter_matrix_chart').property('disabled', false);
    }

    /**
     * for disable selectbox and input tag
     * @memberOf ScatterMatrixChartControl
     * @returns {undefined}
     */
    function disableElement() {
        d3.select('#change_color_scatter_matrix_chart').property('disabled', 'disabled');
        d3.select('#pick_color_scatter_matrix_chart').property('disabled', 'disabled');
    }

    /**
     * for converting color form rgb to hex code
     * @memberOf ScatterMatrixChartControl
     * @param {type} color
     * @returns {String|_L8.colorToHex.digits|RegExp}
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

    return ScatterMatrixChartControl;
});
