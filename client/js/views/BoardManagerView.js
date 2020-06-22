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
 * Create BoardManagerView main function
 *
 * @class BoardManagerView
 * @param {type} app app.js
 * @param {type} BoardManagerModel BoardManagerModel class
 * @param {type} BoardCollectionView BoardCollectionView class
 * @param {type} DataMapingPanel DataMapingPanel class
 * @param {type} ControlPanel ControlPanel class
 * @param {type} contextMenuModel ContextMenuModel instance
 * @param {type} util library Undo.js
 * @param {type} util library Command.js
 * @returns {BoardManagerView}
 */

define(['js/app',
        'view/BoardCollectionView',
        'view/ControlPanel',
        'view/DataMappingPanel',
        'view/ColorMappingPanel',
        'model/contextMenuModel',
        'lib/dsmorse-gridster/dist/jquery.gridster.with-extras',
        'lib/jquery-contextmenu/dist/jquery.contextMenu',
        'css!lib/dsmorse-gridster/dist/jquery.gridster.min',
        'css!lib/jquery-contextmenu/dist/jquery.contextMenu.css'
       ],
       function ( app,
                  BoardCollectionView,
                  ControlPanel, 
                  DataMappingPanel,
                  ColorMappingPanel,
                  contextMenuModel
                ) {
  /**
     * Constructor create BoardManagerView
     * @method BoardManagerView
     * @memberOf BoardManagerView
    */
  var MyClass = Backbone.View.extend({
     
      initialize: function (options) {
         _.extend(this, _.pick(options, "parent"));// to use this.screenid if existed
         _.bindAll(this, 'render', 'drawMe', 'addBoard', 'afterSave');
       
        var self = this;
        this.$grid_ul = this.$el.append("<charts class='gridster'><ul></ul></charts>").find('.gridster > ul');
        this.boardsView = new BoardCollectionView({el: this.$grid_ul, parent: this });
        
        this.listenTo(framework.mediator, 'board:delete', this.deleteBoard);
        this.listenTo(framework.mediator, 'board:active', this.activeBoard);
        //this.listenTo(framework.mediator, 'boardmanager:undoredo', this.undoredoUpdate);
        this.listenTo(framework.mediator, 'boardmanager:fit2window', this.fit2window);
        this.listenTo(framework.mediator, 'boardmanager:tagscreen', this.tagScreen);
        this.listenTo(framework.mediator, 'boardmanager:sharescreen', this.shareScreen);
        this.listenTo(framework.mediator, 'boardmanager:undo', this.undoScreen);
        this.listenTo(framework.mediator, 'boardmanager:redo', this.redoScreen);
       
        this.activedView = null;
        this.clicked = {x: 0, y: 0};
        
        //context menu
        this.$el.contextMenu({
          selector: 'charts.gridster',
          className: 'context-menu-custom',
          callback: this.addBoard,
          trigger: 'none',
          zIndex: 100000, //show context menu on the top
          build: function($container, e) {
            e.preventDefault();
            e.stopPropagation();
            return $container.data('contextData');//
          }
        });
        
        var MyModel = Backbone.Model.extend({urlRoot: '/api/screen'});
        this.model = new MyModel({id: this.parent.screenid });
        this.model.on('change:id', function(){
          if(this.parent){
            this.parent.screenid = this.model.get('id');
          }
        }, this);

        /*this.model.on('sync', function() {
          self.updateUndoRedo();
        });*/

        this.undoManager = new Backbone.UndoManager({
          register: [this.model], // pass an object or an array of objects
        });

        //screen shift control buttons
        this.nextScreen = this.parent.findNextScreen();
        this.preScreen = this.parent.findPreScreen();
        
        //common panels
        this.controlPanel = new ControlPanel();
        this.dataMappingPanel = new DataMappingPanel();
        this.colorMappingPanel = new ColorMappingPanel();
        app.websocket && 
        app.websocket.on('screen:remotelink', function(sid){
          if(app.control.remotelink && self.parent.screenid == sid ) {
            self.render(); //update mainView
          }
        });
      },
      
      events: {
        "contextmenu charts.gridster": 'onRightClick'
        //'click charts.gridster': 'onLeftClick'
      },
      
      height: function() {return this.$grid_ul.parent().height(); },
      width: function()  {return this.$grid_ul.parent().width(); },

      afterSave: function(hasUndoRedo= True) {
        if(hasUndoRedo) {
          this.updateUndoRedo();
        }
        if(app.control.remotelink)  {
          app.sendByWebsocket('screen:remotelink', 
          {
            room: this.parent.screenid,
            data: this.parent.screenid
          });
        }
      },

      render: function() {
        var self = this;
        this.model.fetch({data:{user: app.session.user.get('id')}})
          .done(function() {
            self.drawMe(); //draw dashboard
            if(self.parent.sidebarView) {
              self.parent.sidebarView.update();
            }
            self.undoManager.startTracking();
          })
          .fail(function(status) {
              window.alert(status.responseText);
          });//only render at the first time?
      },
      
      onRightClick: function(e){
        var self = this;
        if( e.button == 2 ) {//right click
          e.preventDefault();
          /*contextMenuModel.getDatalistOfCharts().done(function(menu){
            var $me = self.$el.find('charts.gridster');
            $me.data('contextData', menu);
            $me.contextMenu({x: e.pageX, y: e.pageY});
            self.clicked.x = e.pageX;//e.offsetX;
            self.clicked.y = e.pageY; //e.offsetY;
          });*/
          var $me = self.$el.find('charts.gridster');
          $me.data('contextData', contextMenuModel.getDatalistOfCharts());
          $me.contextMenu({x: e.pageX, y: e.pageY});
          self.clicked.x = e.pageX;//e.offsetX;
          self.clicked.y = e.pageY; //e.offsetY;
          self.unactivateBoard();
        } 
      },

      undoScreen: function() {
        if(this.undoManager.isAvailable("undo")) {
            this.undoManager.undo();
            this.model.save(null, { success: this.afterSave });
            this.drawMe();
        }
      },

      redoScreen: function() {
        if(this.undoManager.isAvailable("redo")) {
            this.undoManager.redo();
            this.model.save(null, { success: this.afterSave });
            this.drawMe();
        }
      },

      // Remove one chart board 
      deleteBoard: function (view) {
        var self = this,
            id= view.model.get('id');
        this.gridster.remove_widget(
          this.$el.find('#'+id),
          function() {
            self.model.save('cells',  self.gridster.serialize(), { success: function(){ self.afterSave(false);} });
          }
        );//remove_widget end
        self.boardsView.removeBoard(view);
      },   
    
      unactivateBoard: function(event) {
        //event.stopPropagation();//add this line will invalid multiple selection
        this.$el.find(".gridster .board").each(function (index, domEle) {
            $(domEle).removeClass("selected");
          });
      },
    
      activeBoard: function (view) {
        var isSelected = view.$el.hasClass("selected");
        if (!isSelected) {
          //clear all
          this.$el.find(".gridster .board").each(function (index, domEle) {
            $(domEle).removeClass("selected");
          });
          //reset my view
          view.$el.addClass("selected");
          this.activedView = view;
        }
      },

      // Add new board --vttype is libpath
      addBoard: function (key, options) {
        var self = this;
        var vttype = key;//vttype
        var max_rows = this.model.get('maxRows'),
            max_cols = this.model.get('maxColumns'),
            init_width = ( (temp_width = Math.floor(max_cols/3)) > 0 )? temp_width: 1 ,
            init_height = (Math.floor(max_rows/5) >0)? max_rows/5 : 1 ;
        
        var clickedBoard = this.clickedPosition();
        
        // create BoardModel to get new id
        this.boardsView.createBoardModel({vttype: vttype, libtype: options.commands[key].libtype})
          .done(function (mymodel) {
            self.gridster.add_widget.apply(self.gridster,
              ["<li id=" + mymodel.get('id') + "></li>",
                  init_width , // block.size_x
                  init_height,
                  clickedBoard.col, //block.col
                  clickedBoard.row
              ]);
            self.model.save('cells', self.gridster.serialize(),  { success: self.afterSave });
            
            //draw boardview
            self.boardsView.createBoardView(mymodel.get('id')).done(function(boardview){
              if(!_.isEmpty(boardview)) {
                self.boardsView.updateViewsLinks();
              }
            });
          });
          //.fail(function(e) {
          //  console.log("Remove the failed chart DOM in layout with id = " + mymodel.get('id'));
          //});
        },
      
      clickedPosition: function(){
        var self = this;
        var rtn = {col:1, row: 1}, cord;
        $.each(self.gridster.faux_grid, function(i, board){
          cord = board.coords;
          if(cord.x1 < self.clicked.x && cord.x2 > self.clicked.x &&
             cord.y1 < self.clicked.y && cord.y2 > self.clicked.y)
          {
            rtn.col = board.data.col;
            rtn.row = board.data.row ;
            return false;
          }
        });
        return  rtn;
      },
      
      tagScreen: function() {
        if(+this.model.get('tag')){
          //window.alert('the SCREEN ['+ this.screenid + '] has been tagged!!');
          var shareme = confirm('Do you want to share the tagged SCREEN ['+ this.parent.screenid + ']?');
          if (shareme === true) {
            this.parent.shareScreen();
          }
        } else {
          this.parent.tagScreen();
        }
      },

      shareScreen: function() {
        if(+this.model.get('tag')){
          this.parent.shareScreen();
        } else {
          window.alert('Please tag SCREEN ['+ this.parent.screenid + '] before sharing it!!');
        }
      },
    
      // Render BoardManagerView
      drawMe: function () { //it is time-consuming to redraw each time
        var self = this;
        var cells =  this.model.get('cells');
        
        if(! (cells instanceof Object)){
          cells = JSON.parse(cells);
        }
        self.initializeLayout();//will empty chart contents and add chart frames
        console.log(this);
        if(cells.length >0 ) {
          var deferreds = [];
          _.each(cells, function (block) { //each block take a board data
              self.gridster.add_widget.apply(self.gridster,
                ["<li id=" + block.id + "></li>",
                  block.size_x,
                  block.size_y,
                  block.col,
                  block.row ]);
              //denote the BoardModel data have exited in server
              deferreds.push(self.boardsView.createBoardView(block.id));
          });
        }
        $.when.apply($, deferreds).always(function(){ 
          self.boardsView.updateViewsLinks();
        });

        //
        if(+self.model.get('tag')) {
          self.$el.addClass('tag');
        } else {
          self.$el.removeClass('tag');
        }

        return self;
      },
      
      // Define layout function
      initializeLayout: function () {
        var self = this;
        var max_cols = +this.model.get('maxColumns'),
            max_rows = +this.model.get('maxRows'),
            widgetMargin = +this.model.get('margin');

        var responsive = +this.model.get('responsive'),
            parentHeight = this.$grid_ul.parent().height(),
            savedHeight  = +this.model.get('height'),
            height =  (responsive || !savedHeight)?  parentHeight: savedHeight,
            cellHeight= Math.floor((height - widgetMargin -3) / max_rows - widgetMargin), // minus 3 to remove scroll
            parentWidth = this.$grid_ul.parent().width(),
            savedWidth = +this.model.get('width'),
            width = (savedWidth)? savedWidth: parentWidth,
            cellWidth = (responsive)?  'auto': Math.floor(((width- widgetMargin) / max_cols - widgetMargin));

        if (this.gridster) {
          this.boardsView.destroy2();//
          this.gridster.remove_all_widgets();//contents
          this.$grid_ul.empty(); //frame  
        }
        
        //define instance variable of gridster
        this.gridster = this.$grid_ul.gridster({
          //namespace: 'charts.gridster',
          max_cols: max_cols,
          max_rows: max_rows,
          widget_selector: "li", //defalut value
          widget_base_dimensions: [cellWidth, cellHeight], //cell's width is responsable 
          //autogrow_cols: true,
          //autogenerate_stylesheet: true,//automatically generating css for each cell
          widget_margins: [widgetMargin, widgetMargin],
          avoid_overlapped_widgets: true,
          helper: 'clone', //non-documented 
          min_cols: 1,
          min_rows: 1,
          resize: {
            enabled: true,
            stop: function (e, ui, $widget) {
              self.boardsView.resize(+$($widget).attr('id') );
              self.model.save('cells', self.gridster.serialize(), { success: self.afterSave });
            }
          },
          draggable: {
            stop: function (e, ui, $widget) {
              self.model.save('cells', self.gridster.serialize(),  { success: self.afterSave });
            }
          },
          
          serialize_params: function ($w, wgd) {
            var widget = (typeof wgd === 'undefined') ? $($w).data() : wgd;
                return {
                    id:     $($w).attr('id'),
                    col:    widget.col,
                    row:    widget.row,
                    size_x: widget.size_x,
                    size_y: widget.size_y,
                };
          }//function end
        }).data('gridster');
      },
      
      fit2window: function(index) {
          var self = this,
              $renderedArea = this.$grid_ul;
          
          var newHeight  = $renderedArea.parent().height(),
              newCellHeight = Math.floor( (newHeight - self.gridster.options.widget_margins[1]) / self.gridster.get_highest_occupied_cell().row - self.gridster.options.widget_margins[1]);
          
          self.gridster.options.max_rows = self.gridster.options.min_rows= self.gridster.get_highest_occupied_cell().row;
          self.gridster.options.widget_base_dimensions[1] = newCellHeight;
          self.gridster.recalculate_faux_grid();
      },
      
      destroy: function () {
        if(this.gridster) {
          this.gridster.destroy();
          this.gridster= null;
        }
        
        this.boardsView.destroy();
        this.controlPanel.remove();
        this.dataMappingPanel.remove();
        this.colorMappingPanel.remove();

        this.remove();
      },
      
      updateUndoRedo: function() {
        if(this.undoManager.isAvailable("undo")) {
            this.parent.sidebarView.activeUndo(true);
        } else {
            this.parent.sidebarView.activeUndo(false);
        }  
      
        if(this.undoManager.isAvailable("redo")) {
            this.parent.sidebarView.activeRedo(true);
        } else {
            this.parent.sidebarView.activeRedo(false);
        }
      }
    
    });//myclass define end

    return MyClass;
  });
