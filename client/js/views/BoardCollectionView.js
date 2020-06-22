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
define(['js/app','model/BoardCollection','view/BoardViewExt'], function (app, BoardCollection, BoardView) {

  var myclass = Backbone.View.extend({
    
    initialize: function (options) {
      
      var self = this;
      _.extend(this, _.pick(options, "parent"));// to use this.screenid if existed
      
      this.collection = new BoardCollection();
      this._Views = {};
      this.linkFromChartId = null; // initial value

      this.undoManager = new Backbone.UndoManager({
        register: [this.collection], // pass an object or an array of objects
        //track: true // changes will be tracked right away
      });

      //receive  borad remotelink from server (access _Views)
      app.websocket && 
      app.websocket.on('board:remotelink', function(data) {
        if(app.control.remotelink) {
          for (var mid in self._Views) {
            let view = self._Views[mid];
            if(self.parent.parent.screenid == data.sid) {
              if(mid == data.mid ) {
                view.onRemoteLink.apply(view, data.params);
                break;
              } //else skip
            }
            else if(view.model.get('screenlink') && view.model.get('vtname') == data.wvname ) { //
              view.onRemoteLink.apply(view, data.params);
              break;
            } //else skip
          }
        }
      });
    },
  
    //first create model, then draw  board
    createBoardModel: function(attrs, opts) {
      return this.collection.createAndsaveModel(attrs, opts); //null id
    },
    
    //the dom elements of board have been deleted with gridster manager
    removeBoard: function(view){
      var self = this, 
          mid = view.model.get('id');
      
      //delete view in viewlist
      delete self._Views[mid];

      //delete all linking message in the other view
      _.forEach(self._Views, function(otherview) {
          if(mid in otherview.linkViews) {
            delete otherview.linkViews[mid];
            otherview.model.setValue('linkids', _.keys(otherview.linkViews));
          }
      });
      //delete model message in database
      this.collection.removeModel(view.model)
        .fail(function(err){
          console.log(err);
        });
      this.updateViewsLinks();
    },

    createBoardView: function(id) {
      var self =this, deferred =$.Deferred();
      //the board_element have been add with gridster manager
      var $board_element = this.$el.find("li[id='" + id + "']");
      if($board_element && !self._Views[id]) {
          this.collection.queryServerWithModelId(id)
          .done( function (model) {
              var boardView = new BoardView(
                {model: model, el: $("<div class='board'/>"), parent: self });
              $board_element.append(boardView.$el);
              boardView.render().done(function(){ //this is asyn process
                // cache this view for later reference
                self._Views[id] = boardView;
                boardView.initializeUndoRedo();
                deferred.resolve(boardView);
              }).fail(function(err) {
                console.log(err);
                deferred.resolve({});
              });
          })
          .fail(function() {
              //add new model
              self.collection.createAndsaveModel({screenId: self.parent.parent.screenid, recommend_id: id  })
              .done(function(savedModel) { //save model 
                 deferred.resolve({});
              });
          });
      } else {
         console.log('skip (adding) the chart with id=' +id);
         deferred.resolve({});
       }
       return deferred.promise();
    },
    updateViewsLinks: function() {
      _.forEach(this._Views, function(boardview) {
          if(!_.isEmpty(boardview)) {
            boardview.updateLinkMenu();
          }
      });
    },

    resize: function(id, width, height) {
      if(id && this._Views[id]) {
        this._Views[id].resize(width, height);
      }
    },
    getView: function(id) {
      if(id && this._Views[id]) {
        return this._Views[id];
      }
      return null;
    },

    destroy: function() {
      var self = this;
      var $boards = this.$el.find("li[id]");
      _.each($boards, function(board) {
        var id = $(board).attr('id');
        var view = self._Views[id];
        if(view) {
            view.remove();
        }
      });
      this.remove();
    },

    destroy2: function() {
      var self = this;
      var $boards = this.$el.find("li[id]");
      _.each($boards, function(board) {
        var id = $(board).attr('id');
        var view = self._Views[id];
        if(view) {
            view.remove();
        }
        delete self._Views[id];
      });
      //this.remove(); why it can not be deleted?
    }
  });
  return myclass;

});
