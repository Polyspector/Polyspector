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
define([
  'js/app',
  'util/dialog/bsdialog',
  './dagre-d3.min',
  "css!./breadcrumb"
], function (
  app,
  BootstrapDialog, 
  dagreD3
  ) {

  /**
   * @class BreadcrumbView
   */
  var MyClass = Backbone.View.extend({
    
    /**
     * Init function
     * @param {undefined}
     * @returns {undefined}
     */
    initialize: function () {
       this.$el.addClass("breadcrumb-container");
    },
    
    /*
    events: {
       "click div.active"       : 'onNodeClicked',
       "click div.inactive"     : 'onNodeClicked'
    },*/
    
    render: function (graph, toolid, screenid) {
     
      var self = this,
          host = "http://"+window.location.host;
      
      this.drawDialog().done(function(osize){
          var $graph = self.drawGraph(graph, toolid, screenid);
          self.$el.append($graph);
      
        graph.nodes.forEach(function(node){
            self.getScreen(node.id)
            .done(function(data, textStatus, jqXHR) {
                var $mynode = self.$el.find("div[screenid="+ data.id +"]");
                $mynode.css("background-image", "url("+host + "/api/snapshot/"+ data.imgurl +".jpg)");
                $mynode.attr('title', data.description + ' '+ data.time);
                })
            .fail(function(jqXHR, textStatus, errorThrown) {
                self.$el.find("div[screenid="+ data.id +"]")
                    .css("background-image", "url("+host + "/api/snapshot/null.jpg)");
                });   
        });
      });
              
      return this;
     },
     
     getScreen: function(screenid){
       var ajaxOptions = {
         url: '/api/screen/'+ screenid,
         type: 'GET',
         dataType: "json",
         timeout: 10000, //ms
         data: {user: app.session.user.get('id') },
       };
       return $.ajax(ajaxOptions);
     },
       
    drawDialog: function() {     
      var self = this,  deferred = $.Deferred();
       
      this.dialog = new BootstrapDialog({
        message: this.$el,
        draggable: true,
        cssClass: 'breadcrumb-dialog',
        onshow: function(dialog) {
          //dialog.getModalContent().css({'background-color': '#333'});
        },
        onshown: function(dialogRef) {
          var $tmp = $('.breadcrumb-dialog .modal-dialog'); 
          var width = parseInt($tmp.css('width'), 10);
          var height = parseInt($tmp.css('height'), 10);
          deferred.resolve( {width: width, height: height});
        },
        onhidden: function(dialogRef) {
          dialogRef.close();          
        }
      });
      
      this.dialog.realize();
      this.dialog.getModalHeader().hide();
      this.dialog.getModalFooter().hide();
      this.dialog.open();
      
      return deferred.promise();
    },
    
    drawGraph: function(graph, toolid, screenid) {
       var self= this;
       
       var node_width = 80, 
           node_height =60;
       var g = new dagreD3.graphlib.Graph().setGraph({
            nodesep: 100,
            ranksep: 180,
            rankdir: "LR",
            marginx: 10,
            marginy: 10
        });
      
       graph.nodes.forEach(function(node) {
         
          var $node = $('<div/>').attr('screenid', node.id).text(node.title);
          if(screenid == node.id) {
              $node.removeClass('inactive');    
              $node.addClass('active');    
          } else {
              $node.removeClass('active');
              $node.addClass('inactive'); 
          }
          
          $node.css({
              width: node_width+'px', 
              height: node_height+'px',
              "line-height": node_height+'px',
              "background-size": node_width+'px '+ node_height+'px'
           });
                    
          g.setNode(node.id, {
            labelType: "html",
            label: $('<div>').append($node).html(),
            class: "nodeclass",
            padding: 2, 
            rx: 0,
            ry: 0,
          });
       });
       
      // Add edges
      graph.edges.forEach(function(edge) {
          g.setEdge(edge.source, edge.target, {
            //label: edge.source+'>'+edge.target,
            //width: 40,
            arrowhead:"vee",
            arrowheadStyle: "fill: #fff",
            class: "edgeclass",
            lineInterpolate: 'bundle' 
          });
       });
       
       return this.updateGraph(g, node_width, node_height); 
     },  
     
    updateGraph: function(g, nodew, nodeh) {
        // Set graph height and init zoom
        var svg_dom = document.createElementNS(d3.ns.prefix.svg, 'svg');
        var svg = d3.select(svg_dom)
            .attr('width', '100%')
            .attr('height', '100%');
            //.attr("preserveAspectRatio", 'none');
        
        var svgGroup = svg.append("g"),
            inner = svg.select('g');
        
       /* var zoom = d3.behavior.zoom().on("zoom", function() {
            inner.attr("transform", "translate(" + d3.event.translate + ")" +
                                  "scale(" + d3.event.scale + ")");
        });
        svg.call(zoom);
        */
        var dagreD3_render = new dagreD3.render();
        dagreD3_render(inner, g);
        
        svg.attr("viewBox", "0"  + "," + "0"  + "," + (g.graph().width + nodew) + "," + (g.graph().height+ nodeh));
        
        $(svg_dom).find('g foreignobject').width(nodew).height(nodeh);
        return svg_dom;
    },
    
    onNodeClicked: function(evt) {
        var $node = $(evt.target);
        var screenid = $node.attr('screenid');
        if($node.hasClass('inactive')) {
            framework.mediator.trigger('screenview:screenid', screenid);
        }
        this.dialog.close();   
    }
    
  });
  
  return new MyClass();
});
