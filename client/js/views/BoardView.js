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
  "js/app",
  'text!templates/board.html',
  'ctrl/ChartCtrlExt',
  'view/popupDialog',
  'util/getFile',
  'util/unic/Wrapper',
  'model/contextMenuModel',
  'util/multiselect/bsmultiselect' //show the dropdown menu
], function (app, boardTpl,  ChartCtrl, popupDlg, getFile, Wrapper, contextMenuModel) {
  var BoardView = Backbone.View.extend({

    template: _.template(boardTpl),

    initialize: function (options) {
      var self = this;
      _.bindAll(this, 'render', 'switchData');
      _.extend(this, _.pick(options, "parent"));// to use this.screenid if existed
      this.$el.html( this.template());
      this.chartctrl  = new ChartCtrl(this.model, this.parent.parent.model);
      this.listenTo(this.chartctrl, 'change:_save_model_', function() {
        //update with screenId to check its read/write (tag) authority
        this.model.set({screenId: this.parent.parent.parent.screenid}, {silent: true});
        this.model.save(null, {patch: true});
        this.updateUndoRedo();
      });//will be called from render and update
      this.listenTo(this.chartctrl, 'change:_show_ctrl_', function(key, position, manager) {
        var $ctrl = manager.getControl(key);
        if($ctrl.length > 0 ) {
          Wrapper.show($ctrl, position, manager);
        }
      });
      this.listenTo(this.chartctrl, 'loading:start', function() {
        self.chartctrl.loading = true;
        if(self.chartctrl.dataManager().getTimerInterval() <= 0) { //not perioidically updating
          self.$el.find('.loading').css("display", "block");
        }
      });
      this.listenTo(this.chartctrl, 'loading:end', function(statusCode) {
         self.chartctrl.loading = false;
         self.$el.find('.loading').css("display", "none");
         this.chartctrl.statusCode(statusCode);
         self.$el.find('.caption').css("background-color", this.chartctrl.statusColor());
      });
      this.listenTo(this.chartctrl, 'current:status', function() {
         this.$el.find('.caption').css("background-color", this.chartctrl.statusColor());
      });

      //caption update is outside chart
      this.model.bind('change:caption', function () {
        self.setCaption();
      }, this);
      this.listenTo(framework.mediator, 'board:toggle-caption', this.toggleCaption);
      this.listenTo(framework.mediator, 'board:clear-filter', this.clearFilter);
      this.linkViews = {};//(id: view) pairs
      this.$el.find('.chart-buttons select').multiselect( {
        numberDisplayed: 1,
        buttonWidth: '105px',
        onChange: function(option, checked) {
          var mid = option.val();
          if (checked) {
           self.linkViews[mid] = option.html();//add the view to linking list
          } else {
           if(self.linkViews[mid]) delete self.linkViews[mid]; //delete view from linking list
          }
          self.model.setValue('linkids', _.keys(self.linkViews));//save the new attribute
        },
        onDropdownShow: self.updateLinkMenu.bind(self)
      });
      self.$el.find('.chart-buttons .btn-group').hover(
        null,
        function(){
          self.$el.find('.chart-buttons .btn-group').removeClass('open');
        }
      );

      //initialize contextMenu with callback
      this.$el.contextMenu({
          selector: '.caption > .name',
          trigger: 'none',
          callback: this.switchData,
          build: function($container, evt) {
            evt.preventDefault();
            evt.stopPropagation();
            return $container.data('local_context');
          }
      });
    },

    events: {
      'mouseover button.event-others': 'toggleOthersList',
      'mouseout  button.event-others': 'toggleOthersList',

      'click div.event-download' : 'saveData',
      'click div.event-image': 'onImagingMe',
      'click div.event-analysis': 'toggleAnalysisPanel',
      'click div.event-delete': 'onDeleteMe',
      "click div.event-timer": 'onTimerSetup',
      'click button.event-zoom': 'onZoomMe',
      'click button.event-chart-undo': 'undoChart',
      'click button.event-chart-redo': 'redoChart',
      'click button.event-board-help': 'onHelp',
      'click .chart-buttons i.trigger ': 'onToggleButtons',

      'click button.event-data-mapping-panel': 'toggleDataMappingPanel',
      'click button.event-color-map': 'toggleColorMappingPanel',
      'click button.event-design-panel': 'toggleDesignPanel',
      'click button.event-link-panel': 'toggleControlPanel',

      'mouseover button.event-toggle-mode': 'toggleModeList',
      'mouseout  button.event-toggle-mode': 'toggleModeList',

      'click div.event-fullrange' : 'toggleMode',
      'click div.event-drilldown' : 'toggleMode',
      'click div.event-highlight': 'toggleMode',

      'click button.event-clear-filter': 'clearFilter',
      'dblclick .caption > div.name' : 'onDblCaption',
      'dblclick .chart': 'checkAndLoadData',
      'click .chart-buttons select': 'updateLinkMenu',
      "contextmenu .caption > .name ": 'onContextMenu',//contextmenu trigger
      "contextmenu .chart, .caption": 'stopHere',
      'click .caption :not(.chart-buttons), .chart': 'activeMe',
      'click div.loading' : 'abortDataload',
      'click div.alert_text' : 'showContextMenu'
    },

    /***update contextnume with newest data */
    onContextMenu: function(evt){
        if( evt.button == 2 /*&& self.$el.has(evt.target).length>0*/ ) {//right click
          evt.preventDefault();
          evt.stopPropagation();
          this.showContextMenu(evt);
        }
    },

    showContextMenu: function(evt){
        let self = this;
        contextMenuModel.getDatalistOfChart(this.model.get('libtype') || this.model.get('vttype')).done(function(menu){
          if(!_.isEmpty(menu.items)) {
            self.$el.find(".caption > .name").data('local_context', menu).trigger($.Event('contextmenu', {pageX: evt.pageX, pageY: evt.pageY}));
          }
        });
    },

    onToggleButtons: function(evt) {
       let isVisible = this.$el.find(".chart-buttons > button").is(':visible');
       if(isVisible) {
         this.$el.find(".chart-buttons > button").hide();
         this.$el.find(".chart-buttons > i.trigger").text('<<');
       } else {
         this.$el.find(".chart-buttons > button").show();
         this.$el.find(".chart-buttons > i.trigger").text('>>');
       }
    },


    //stop event trigger
    stopHere(evt) {
      evt.stopPropagation(); //stop propagation to parent element 
      evt.preventDefault();
    },

    switchData: function(key, options) {

      var self = this;
      
      this.chartctrl.colorManager().clearAll();
      this.chartctrl.dataManager().clearAll();
      this.chartctrl.analysisManager().clearAll();
      this.chartctrl.clearAll();
      
      this.model.set({'vtname': key} /*, {silent: true}*/);
      
      this.chartctrl.dataManager().getDataAsyn(key, this.parent.parent.context)
      .done( function (isfull) {
         /*!isfull &&*/ self.renderSimple();
         self.setCaption();
      })
      .fail(function(e) {
        console.log(e);
      });
      
      return this;
    },
    
    resize: function (containerWidth, containerHeight){
       var width, height, $chart = this.$el.find(".chart");
       
       if($chart.children(':not(.alert_text)').length<=0) return;

       if(containerWidth && containerHeight) {
         width  = containerWidth;
         height = containerHeight - this.$el.find('.caption').height();
       } else {
         width = $chart.width();
         height= $chart.height();
       }
     
      this.chartctrl.resize(width, height); 
    },
    
    onZoomMe: function (evt) {
      var self = this;
      var $cell = this.$el.parents('li'),
          $ul = $cell.parents('ul'),
          $gridster = $ul.parents('charts.gridster'),
          $contents = $gridster.parents('contents');
          
      // Find zoom button to set class
      var $btnZoom = this.$el.find('.event-zoom i.fa'); //the zoom button
      this.$el.removeClass("selected");

      if ($btnZoom.hasClass('fa-expand')) { //expended: to restore
        $btnZoom.removeClass('fa-expand').addClass('fa-compress');

        // Save old data for restore state after expanding
        var org_position = $cell.position(); //position of 'li' element
        $cell.attr({
          'data-width':  $cell.width(),
          'data-height': $cell.height(),
          'data-left': org_position.left,
          'data-top': org_position.top
        });
        // Get scroll if existed
        var top = $contents.scrollTop() + 3,
            left = 3 - parseInt($ul.css('margin-left')),
            width = $gridster.width()-6,
            height = $gridster.height()-6;
        // Hidden scrollbar after expanding
        $gridster.parent().css('overflow', 'hidden');
        // Set new style for expanding
        $cell.css({
          'position': 'absolute',
          'top':top + 'px',
          'left': left + 'px',
          'width': width + 'px',
          'height': height + 'px',
          'z-index': '99'
        });
        self.resize(width, height);

      } else { //normal: to enlarge
        $btnZoom.removeClass('fa-compress').addClass('fa-expand');
        // Restore style before expanding
        $cell.css({'position': 'absolute',
          'top': $cell.attr('data-top') + 'px',
          'left': $cell.attr('data-left') + 'px',
          'width': $cell.attr('data-width') + 'px',
          'height': $cell.attr('data-height') + 'px',
          'z-index': '0'});
        
        // Restore scrollbar
        $gridster.parent().css('overflow', 'auto');
        
        // don't save the size to database
        self.resize(parseInt($cell.attr('data-width')), parseInt($cell.attr('data-height'))); 
      } //if-else-end
    },

    onTimerSetup: function() {
       popupDlg.timerSetup(this.chartctrl.dataManager());
    },

    // Active chart when click mouse on chart or click tab of this chart in control panel
    activeMe: function (evt) {
      if(evt && (evt instanceof $.Event)) {
        //evt.stopPropagation(); //stop propagation to parent element 
        //evt.preventDefault();
        framework.mediator.trigger('board:active', this);//to udate control panel
      }
    },

    abortDataload: function(evt) {
      var dataManager = this.chartctrl.dataManager();
      if(dataManager._ajax) {
        dataManager._ajax.abort();
      }
    },
   
    onImagingMe: function (evt) {
      var self = this;
      var chart_el = self.$el.find('.chart');
      getFile.convertSVGToCanvas(chart_el);
      html2canvas(self.$el, {
        onrendered: function (canvas) {
          var img = canvas.toDataURL("image/jpeg");
          getFile.download(img, self.model.id + ".jpg", "image/jpeg");
          // Remove canvas and display SVG chart after capture current chart
          getFile.revertSVGFromCanvas(chart_el);
        } //onrendered end
      });
    },
    
    onHelp: function(e) {
      let root = window.location.origin? window.location.origin:
                window.location.protocol+'/'+window.location.host
                +(window.location.port)? ':'+window.location.port :'';
      let path = require.s.contexts._.config.paths['vis'] +'/'+ this.model.get('vttype') + '/help';
      window.open(root+'/'+path, '_blank');
    },
    
    //Delete chart on window screen
    onDeleteMe: function (ev) {
      //tigger delete board event
      var del = confirm("Are you sure for deleting this chart?");
      if (del === true) {
            this.stopListening();//stop listening to all events
            //triggier event to gridster for deleting dom
            framework.mediator.trigger('board:delete', this);
      }
    },
    
    toggleOthersList: function(ev) {
      var $me = $(ev.currentTarget).find(".dropdown-content");
      if($me.is(":visible")){
        $me.hide();
      } else {
        $me.show();//.css("display", "block");
      }
      ev.stopPropagation();
      ev.preventDefault();
    },
     
    toggleModeList: function(ev) {
      var $me = $(ev.currentTarget).find(".dropdown-content");
      if($me.is(":visible")){
        $me.hide();
      } else {
        $me.show();//.css("display", "block");
      }
      ev.stopPropagation();
      ev.preventDefault();
    },
    
    //check the dataManager's family to get candidate linkviews
    getCandidateLinkViews: function(currentViews) {
      var self = this;
      var otherViews = _.values(_.omit(currentViews, self.model.id));
      var candidateLinkViews = otherViews.filter(function(candidateView) {
        return self.chartctrl.dataManager().isCandidateLinkView(candidateView.chartctrl.dataManager());
      });
      return candidateLinkViews;
    },

    //update the menu each time of access
    updateLinkMenu: function() {
      var self = this;
      var currentViews = self.parent._Views;
      var currentSelects = self.model.get('linkids');
      var $dropdown = self.$el.find('.chart-buttons select');
      
      if(!currentSelects){
        currentSelects = [];
      } else if(!Array.isArray(currentSelects)){
        currentSelects = JSON.parse(currentSelects);
      }
      
      var viewsList =　self.getCandidateLinkViews(currentViews);

      var optionItems = d3.select($dropdown.get(0)).selectAll('option')
           .data(viewsList, function(view){return view.model.id;});
      
      optionItems.enter().append('option')
       .attr('value', function(view){return view.model.id;})
       .property('selected', function(view){
         let mid = view.model.id + '',
             ret = currentSelects.includes(mid);
         if(ret) {
           self.linkViews[mid] = true;
         } else {
           ret = null;
         }
         return ret;
      });
                    
      optionItems.text(function(d){return d.getCaption();});
      
      optionItems.exit().remove();
      
      $dropdown.multiselect('rebuild');
    }, 
    
    getCaption: function() {
      const self = this;
      let caption_text = self.model.get('caption');
      if(caption_text !== undefined) {
        caption_text= caption_text.trim(); //the ' ' char will be cleared out
      }
      
      if(_.isEmpty(caption_text)) {
        if(self.chartctrl.caption) {
          caption_text = self.chartctrl.caption;
        } else {
          caption_text = (self.model.get('vtname'))? 
            self.model.get('vttype') +' : ' +self.model.get('vtname') :
            self.model.get('vttype');
        } 
      }
      return caption_text;
    },
    
    setCaption: function() {
      var $caption = this.$el.find('.caption');
      //show caption
      $caption.find('.name').text(this.getCaption());
      //show additional message in tooltip
      $caption.attr('title', (this.model.get('vtname'))? 
            this.model.get('vttype') +' : ' +this.model.get('vtname') :
            this.model.get('vttype')
          );
    },
    
    //clear filter conditions for this chart
    clearFilter: function (evt) {
      if (evt instanceof $.Event) {
        //evt.stopPropagation();
        //this.activeMe(evt); //update datamapping panel 
      }
      this.chartctrl.dataManager().clearFilter();
    },

    checkAndLoadData: function(evt) {
      var self = this;
      if(this.chartctrl.hasNewDataLoadError()){
        var $chart = this.$el.find(".chart"),
            width  = $chart.width(),
            height = $chart.height();
        
        this.chartctrl.dataManager().getDataAsyn(
            self.model.get('vtname'), self.parent.parent.context,{ width: width, height:height } 
          ).done(function(isfull) {
            !isfull && self.renderSimple($chart, width, height); //rerender after being got data
          });
      }
    },

    _switchButtons: function() {
      var $analysisButton = this.$el.find('.event-analysis');
      if(this.chartctrl.analysisManager().isEmptyTemplate()) {
        $analysisButton.hide();
      } else {
        $analysisButton.show();
      }
    },

    render: function ($mychart, mywidth, myheight) {
      var self = this,
          deferred = $.Deferred();
      //if(this.model.has('vtname')){  //fetch virtual table successful
      var $chart = ($mychart)? $mychart: this.$el.find(".chart"),
             width  = (mywidth)? mywidth: $chart.width(),
             height = (myheight)? myheight: $chart.height();

      if(self.chartctrl.chartInstance() === undefined) { //have not got chart library
          self.chartctrl.getChartLib(self.model.get('vttype')).done(function(){

            //have chart library, so i show caption
             self.setCaption();

            if(!self.chartctrl.dataManager().hasData()) {
              self.chartctrl.dataManager().getDataAsyn(
                self.model.get('vtname'), self.parent.parent.context, {width: width, height:height }
              ).done(function(isnull) {
                if(isnull){
                  $alert = $("<div class='alert_text'><h3>Click to select data!</h3></div>");
                  $chart.empty().append($alert);
                } else {
                  $chart.empty();
                  self.renderSimple($chart, width, height); //may trigger a event to asyn renderSImple
                }
                deferred.resolve(self);
              }).fail(function(e) {
                deferred.reject(e);
              });
            } else {
              self.renderSimple($chart, width, height);
              deferred.resolve(self);
            }
          }).fail(function(e) {
              deferred.reject(e);
          });//;
      } else {
          self.renderSimple($chart, width, height);
          deferred.resolve(self);
      }
      //} else {
      //   deferred.reject('no virtual table is set!');
      //}

      return deferred.promise();
    },

    // draw chart with attained library and data
    renderSimple: function ($mychart, mywidth, myheight) {
      
      var self=this,
          $chart = ($mychart)? $mychart: this.$el.find(".chart"),
          width  = (mywidth)? mywidth: $chart.width(),
          height = (myheight)? myheight: $chart.height();

      this.updateModeIcon();

      this.chartctrl.render(width, height, $chart);    

      return this;
    },
    
    //popup menu in fixed position
    toggleDataMappingPanel: function (evt) {
      if (evt instanceof $.Event) { 
        //evt.stopPropagation(); 
      }
      if( !_.isEmpty(this.chartctrl.dataManager().getMapperProps())) {
        framework.mediator.trigger('board:datamapping', this);
      }
    },
    toggleColorMappingPanel: function (evt) {
      //if( !_.isEmpty(this.chartctrl.dataManager().getMapperProps())) {
        framework.mediator.trigger('board:colormapping', this);
      //}
    },
    // add this to control panel
    toggleDesignPanel: function (evt) {
      if (evt instanceof $.Event) { 
        //evt.stopPropagation(); 
      }
      framework.mediator.trigger('board:toggle_operation_panel', this, 'design');
    },
    
    toggleAnalysisPanel: function (ev) {
      //set all values into analysisManager
      framework.mediator.trigger('board:toggle_operation_panel', this, 'analysis');
      
    },

    // add this to control panel
    toggleControlPanel: function (evt) {
      if (evt instanceof $.Event) { 
        //evt.stopPropagation(); 
      }
      framework.mediator.trigger('board:toggle_operation_panel', this, 'control'); //link control flag
    },
    
    onDblCaption: function(evt) {
      if (evt instanceof $.Event) { 
        var $control = $("<div/>", {id: 'caption'})
                .data('type', 'text')
                .data('value', this.model.get('caption'));
        Wrapper.show($control, evt.originalEvent, this.model);
      }
    },
    
    initializeUndoRedo : function() {
       //undo/redo
       this.undoManager = new Backbone.UndoManager({
        register: [this.model], // pass an object or an array of objects
        track: true // changes will be tracked right away
      });
    },

    updateUndoRedo: function() {
      if(this.undoManager) {
        var $undoButton = this.$el.find('.chart-buttons .event-chart-undo');
        if(this.undoManager.isAvailable("undo")) {
          $undoButton.prop("disabled", false);
          //$undoButton.show();
        } else {
          $undoButton.prop("disabled", true);
          //$undoButton.hide();
        }
        
        var $redoButton = this.$el.find('.chart-buttons .event-chart-redo');
        if(this.undoManager.isAvailable("redo")) {
          $redoButton.prop("disabled", false);
          //$redoButton.show();
        } else {
          $redoButton.prop("disabled", true);
          //$redoButton.hide();
        }
      }
    },

    undoChart: function() {
      if(this.undoManager.isAvailable("undo") ) {
        this.undoManager.undo();
        //this.chartctrl.dataManager().execUpdate({MODE: this.chartctrl.mode()});
        this.chartctrl.dataManager().undoRedo(true);
      }
    },

    redoChart: function() {
      if(this.undoManager.isAvailable("redo") ) {
        this.undoManager.redo();
        this.chartctrl.dataManager().undoRedo(false);
        //this.chartctrl.dataManager().execUpdate({MODE: this.chartctrl.mode()});
      }
    },
    
    toggleCaption: function() {
      var $caption = this.$el.find('.chart-buttons');
      if($caption.is(':visible')) {
        $caption.hide();
      } else {
        $caption.show();
      }
    },
    
    updateModeIcon: function() {
      let $modebutton = this.$el.find(".event-toggle-mode");
      this._switchButtons();
      if(this.chartctrl.fullrange()){
          $modebutton.find('div.switchme').removeClass('fa-filter fa-sun-o');
          $modebutton.find('div.switchme').addClass('fa-arrows');
          //$modebutton.show();
      } else if(this.chartctrl.highlight()) {
          $modebutton.find('div.switchme').removeClass('fa-arrows fa-filter');
          $modebutton.find('div.switchme').addClass('fa-sun-o');
          //$modebutton.show(); 
      }
      else if(this.chartctrl.drilldown()) {
          $modebutton.find('div.switchme').removeClass('fa-arrows-alt fa-sun-o');
          $modebutton.find('div.switchme').addClass('fa-filter');
          //$modebutton.show(); 
      } else {
          $modebutton.hide();
      }
    },
    
    //mode change will update chart itself and icon(outside chart)
    toggleMode: function(ev) {
      
      ev.stopPropagation();
      ev.preventDefault();

      var $me = $(ev.currentTarget);
      if($me.hasClass('event-fullrange')) {
        this.chartctrl.fullrange(true);
      } 

      if($me.hasClass('event-drilldown')) {
        this.chartctrl.drilldown(true);
      } 

      if($me.hasClass('event-highlight')) {
        this.chartctrl.highlight(true);
      } 

      //change the icon appearance
      this.updateModeIcon();

      //check where ot not the data and chart will be updated
      this.chartctrl.dataManager().execUpdate({MODE: this.chartctrl.mode()});
    },


    saveData: function() {

      var jsondata = this.chartctrl.dataManager().getData();
      if(_.isEmpty(jsondata)) {
        windows.alert('No data to be exported');
        return;
      }

      var outputFile = window.prompt("What do you want to name your output file");
      
      if(outputFile) {
        outputFile = outputFile.replace('.csv','') + '.csv';       
         
        var fields = Object.keys(jsondata[0])
        var replacer = function(key, value) { return value === null ? '' : value } 
        var csvbody = jsondata.map(function(row){
          return fields.map(function(fieldName) {
            return JSON.stringify(row[fieldName], replacer);
          }).join(','); //from  row to string
        }).join('\r\n');
       
        var csvcontents = fields.join(',') +'\r\n' + csvbody; // add header column

        var blob = new Blob([csvcontents] , {type: "text/csv;charset=utf-16;"});

        var downloadLink = $('<a></a>');
        downloadLink.attr('href', window.URL.createObjectURL(blob));
        downloadLink.attr('download', outputFile);
        downloadLink.attr('target', '_blank');

        $('body').append(downloadLink);
        downloadLink[0].click();
        downloadLink.remove();
      }
  }

  });
  return BoardView;
});
