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
 * Create ScreenView main function
 * @class ScreenView
 * @param {type} app
 * @param {type} ScreenCtrl
 * @param {type} SidebarView
 * @param {type} BoardManagerView
 * @returns {ScreenView}
 */
define([
  'js/app',
  'ctrl/ScreenCtrl',
  'view/popupDialog',
  'view/SidebarView',
  'view/BoardManagerView',
  'model/ToolModel'
], function (
	app,
  ScreenCtrl,
  popupDlg,
	SidebarView,
	BoardManagerView,
  ToolModel
) {
  /**
   * Constructor create ScreenView
   * @method ScreenView
   * @memberOf ScreenView
  */

  var ScreenView = Backbone.View.extend({
      
      initialize: function (options) {
        _.extend(this, _.pick(options, "screenid", "status", 'parent'));//input params if existed
        _.bindAll(this, 'drawWithScreenId', 'drawWithoutScreenId', 'drawWithTool', 'render');
        
        this.context = {};
        this.screenCtrl = new ScreenCtrl();
        this.listenTo(framework.mediator, 'screenview:breadcrumb', this.showBreadcrumb);
        this.listenTo(framework.mediator, 'screenview:screenid', this.shiftToScreen);
        this.listenTo(framework.mediator, 'screenview:timer-setup', this.timerSetup);
        this.listenTo(framework.mediator, 'screenview:remoteOperation', this.setRemoteOperation);
      },
 
     /**
     * Render called from ScreenView
     */
      render: function () {
        //save status
        window.framework.context = {_format_: this.status.get('data').format, _database_: {name: this.status.get('data').id} };

        // first draw the sidebarview
        if (!this.sidebarView) {
          this.sidebarView = new SidebarView({el: $('<aside/>').appendTo(this.$el), parent: this});
          this.sidebarView.render();
        }

        //then draw the main screen after login
        if(!this.screenid) { //get unique screenid of the user
          if(!this.status ||  _.isEmpty(this.status.get('tool'))){
            this.drawWithoutScreenId();
          } else {
            this.drawWithTool(); //have first screen
          }
        } else {
          this.drawWithScreenId();
        } //if-else-end
        
        //finally, update headerview related to mainView
        framework.mediator.trigger( 'headerview:dataentrance', this.status.get('data').id);

        return this;
      },
      
      drawWithTool: function() {
        var self = this;
        var toolid  = this.status.get('tool').id;
        var toolModel = new ToolModel({id: toolid});
        
        toolModel.fetch({
            data: { 
                user: app.session.user.get('id'),
                format: this.status.get('data').format
            },
            success: function(model, response, options) {
              //update screenid in header
              framework.mediator.trigger('headerview:toolid', toolid); 
              //draw screen
              var graph = model.get('graph');
              self.graph = (typeof graph=='object')? graph: JSON.parse(graph);
              var screenid = self.findFirstScreen();
              if(screenid) {
                self.screenid = screenid;
                self.drawWithScreenId(toolid);
              } else {
                self.drawWithoutScreenId();
              }
            },
            error: function(model, xhr, options){
              console.log('can not get tool data!');
              //re-render
              //self.status.unset('tool');
              self.drawWithoutScreenId();
            }
          });
        return this;
      },
      
      findFirstScreen: function() {
        var screenid = null;
        if(this.graph) {
          if(this.graph.start && !_.isEmpty(this.graph.start)){
            screenid = this.graph.start;
          }
          else if(this.graph.edges && !_.isEmpty(this.graph.edges)){
            var id = this.graph.edges[0].source;
            var nodes = this.graph.nodes.find(function(node){
              if(id == node.id) return true;
              return false;
            });
            screenid = nodes.id;
          }
          else if(this.graph.nodes && !_.isEmpty(this.graph.nodes)){
            screenid = this.graph.nodes[0].id;
          }
        }
        return screenid;
      },
      
      findNextScreen: function() {
        var self=this, nextNodes=[];
        if(this.screenid && this.graph) {
          if(!_.isEmpty(this.graph.edges)){
            nextNodes =  this.graph.edges.filter(function(edge){
              return (self.screenid == edge.source);
            });
            //if(node.length) { nextid = node[0].target; }
          }
        }
        return nextNodes.map(function(node){
            return node.target;
        });
      },
    
      findPreScreen: function() {
        var preid= null, self=this;
        if(this.screenid && this.graph) {
          if(!_.isEmpty(this.graph.edges)) {
            var node =  this.graph.edges.find(function(edge){
              if(self.screenid == edge.target) return true;
              return false;
            });
            if(node) { preid = node.source; }
          }
        }
        return preid;
      },
        
      drawWithoutScreenId: function() {
        var self = this;

        this.screenCtrl.getLastestScreenOrDefaultScreen()
            .done(function(screen){
              if(screen && screen.id) {
                self.screenid = screen.id;
                self.drawWithScreenId();
              } else {
                popupDlg.createNewScreen()
                .done(function(id){
                   self.screenid = id;
                   self.drawWithScreenId();
                 })
                .fail(function(err){
                   console.log(err);
                 });   
              }
            })
            .fail(function(err) {
              console.log(err);
            });
        return this;
      },
    
      drawWithScreenId: function(toolid) { //parameter is tool id
        if(!this.mainView) {
          this.mainView = new BoardManagerView(
            {el: $('<contents/>').appendTo(this.$el), parent: this});
          this.mainView.render(toolid);
        }

        //update screen label in header
        var host = window.location.protocol + '//'+ window.location.host,
        link = host  + '?data=' + this.status.get('data').id + '&sid='+ this.screenid;
        framework.mediator.trigger('headerview:screenid', this.screenid, link);
        return this;
      },

      shiftToScreen: function (id){    
        if(id && id != this.screenid) {
          this.mainView.destroy();
          this.mainView= null;
          this.screenid = id;
        }
        this.render();
      },
    
      newScreen: function(){
        var self = this;
        popupDlg.createNewScreen(/*this.URL.new_screen, */this.mainView.width(), this.mainView.height())
         .done(function(id){
          //save the current image
          //self.updateImage(); //it is time-consuming to do, so I delete it --lxx: 2016/12/09
          //clear the current screen 
          if(self.mainView) {
             self.mainView.destroy();
             self.mainView = null;
          }
           //draw new screen
           self.screenid = id;
           self.drawWithScreenId();
         })
         .fail(function(err){
           console.log("Failed  to add Screen !");
         });
      },
      
      
      updateScreen: function(attrObject){
        var self=this;
        if(this.mainView) {
          this.mainView.model.save(attrObject).done(function() {
            //clear the current screen 
            if(self.mainView) {
              self.mainView.destroy();
              self.mainView = null;
            }
            //update screen
            self.drawWithScreenId();
          }).fail(function(err) {
            console.err(err);
          });
        }
      },

      responsiveDesign: function(curr_flag) {
        var self = this;
        if(this.mainView) {
          var pre_flag =  this.mainView.model.get('responsive');
          if(curr_flag !== pre_flag) {
            this.mainView.model.save({responsive: curr_flag});
            //clear the current screen 
            if(self.mainView) {
              self.mainView.destroy();
              self.mainView = null;
            }
            //update screen
            self.drawWithScreenId();
          }
        }
      },
      
      setupScreen: function() {
        var self = this;
        if(this.mainView) {
          popupDlg.customizeScreen(this.mainView.model, this.mainView.width(), this.mainView.height())
          .done(function(attrObject) {
            if(+self.mainView.model.get('tag')) {
              //
            } else {
              self.updateScreen(attrObject);
            }
          })
          .fail(function(err){
            console.warn(err);
          });
        }
      },

      captureImage: function() {
        var self = this;
        if(this.mainView){
          var chart_el  = this.mainView.$el.find('charts'), 
              localname = this.mainView.model.get('id'),
              tag = +this.mainView.model.get('tag');
          popupDlg.captureScreenSetup(localname).done(function(data) {
            if(data.toSaveLocal) {
              self.screenCtrl.saveImg2LocalStorage(chart_el, data.fileName);
            } else {
              if(tag) {
                window.alert('Screen ['+ localname +'] is read only!!');
              } else {
                var imageurl = (app.session.user.get('id')+'.' + localname).replace(/\/|\\/g, '_');
                self.screenCtrl.saveImg2Server(chart_el, imageurl, 300, 200).done(function(){
                  self.mainView.model.save({imgurl: imageurl});
                });
              }
              //update the imageurl?
            }
          });
        }
      }, //imageMe end
    
      shiftToPreScreen: function() {
         if(this.mainView && this.mainView.preScreen) {
           this.shiftToScreen(this.mainView.preScreen);
         }
      },
    
      shiftToNextScreen: function(evt) {
        var self = this,
            nextScreens = this.findNextScreen();
        
        if(nextScreens.length > 1) {
            require(['view/SelectionView'], function(SelectionView) {
                (new SelectionView())
                .show(nextScreens, evt.originalEvent, 'Please select The next SCREEN...')
                .done(function(selected){
                    //suppose that this context have been updated 
                    self.shiftToScreen(selected);
                });
            });
        } else if(nextScreens.length == 1) {
            this.shiftToScreen(nextScreens[0]);
        } else {
            //skip
        }
      },
      
      shiftToFirstScreen: function() {
        var firstScreen = this.findFirstScreen();
         if(this.mainView && this.screenid && firstScreen && firstScreen !== this.screenid) {
           this.shiftToScreen(firstScreen);
         }
      },
      
      cloneScreen: function() {
        var self = this;
        popupDlg.cloneScreen(
          this.screenid,
        ).done(function(data) {
          if(data && data.shift) {
            self.shiftToScreen(data.screenid);
          }
        });
      },
      
      tagScreen: function(screenid) {
        var self = this;

            self.screenCtrl.getSharableUsers().done(function(sharable_users) {
              popupDlg.tagScreen(
                  sharable_users,
                  (screenid)? screenid: self.screenid,
                  self.status.get('data').id
              ).done(function(data) {
                  
                  //snapshot
                  self.screenCtrl.saveImg2Server(
                    self.mainView.$el.find('charts'), 
                    data.imgurl, 
                    300, 200);

                  //shift to tagged screen
                  if(data && data.shift) {
                    self.shiftToScreen(data.screenid);
                  }
                  
              });
            });
      },

      shareScreen: function() {
        var self = this;

        if(this.status.get('user') !== this.mainView.model.get('user')) {
          window.alert('Only SCREEN created byself can be shared!!');
        } else {
          this.screenCtrl.getSharableUsers().done(function(sharable_users) {
                popupDlg.shareScreen(
                  sharable_users,
                  self.screenid,
                  app.session.user.get('id') ==='admin');
          }).fail(function() { //getUsers failed
                //some unkonwn error!
          });
        }
      },

      setRemoteOperation: function(permited) {
        if(permited) {
          app.sendByWebsocket('init:remotelink',  {room:this.screenid});
        } else {
          app.sendByWebsocket('close:remotelink', {room:this.screenid});
        }
        app.control.remotelink = permited; //local control
      },

      
      showBreadcrumb: function($target) {
        if(!this.status) { //not a screen of the current tool
          return this;
        }
        
        var self = this;
        var toolid  = this.status.get('tool').id;
        if(this.graph && toolid) {
          require(['util/breadcrumb/breadcrumbView'], function(breadcrumbView){
            if(breadcrumbView.dialog && breadcrumbView.dialog.opened) {
                console.log('skip reopen a new dialog!');
            } else {
                breadcrumbView.$el.empty();
                breadcrumbView.render(self.graph, toolid, self.screenid);
            }
          });
        }
      },
     
      //rewrite remove to keep root element
      remove: function(err) {

        //save the last shown screen
        this.parent.predef_screenid = this.screenid;

        if (this.sidebarView) {
          this.sidebarView.remove();
        }

        if(this.mainView){
          this.mainView.destroy();
        }

        this.$el.remove();
        this.stopListening();
        
        if(err) {
          windows.alert(err.toString()); 
        }
        return this;
      }
      
  });
  
  return ScreenView;
});
