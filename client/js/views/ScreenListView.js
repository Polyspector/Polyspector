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
define(["js/app",
        "text!templates/screen_list.html",
        //'model/ScreenListModel',
        'view/GraphEditorView',
	      'lib/jquery-ui/jquery-ui',
	      'css!lib/jquery-ui/jquery-ui.css'
       ], function (
         app, 
         toolEditorTpl,
         //ScreenListModel,
         GraphEditorView) {
  /**
   * Constructor create ToolEditorView
   * @method ToolEditorView
   * @memberOf ToolEditorView
  */
  var MyClass = Backbone.View.extend({
      template: _.template(toolEditorTpl),
      initialize: function (options) {
        var self = this;
  
        _.bindAll(this, 'drawMe');
        
        this.$el.html(
          this.template({ user: app.session.user.toJSON()})
        );
        
        var ScreenListModel = Backbone.Model.extend({urlRoot: 'api/screen/ctrl/list'});
        this.model = new ScreenListModel();

        this.$el.find('.editor').hide();

        this.editor_params = $.extend({el: this.$el.find('.editor') }, _.pick(options, "format", 'toolid') );
        
      },
    
      events: {
        'click .screens .imglist img'  : 'showScreen',
        'click .screens .imglist button.event-del'  : 'onDeleteScreen',
        'click .splitter'  : 'toggleEditor',
      },

      toggleEditor: function() {
        var $editor = this.$el.find('.editor'); 
        if($editor.is(":visible") ) {
          $editor.hide();
        } else {
          if(!this.graphView) {
            this.graphView = new GraphEditorView(this.editor_params);
            this.$el.find('figure img').on('dragstart', this.graphView.onDragSnapshotItem);
          }
          $editor.show();
        }
      },


      render: function(){
        var self = this;
        this.model.fetch(
        {
          data: {user: app.session.user.get('id')},
          success: function (model, response, options){
            self.drawMe(response.data);
          },
          error: function(model, xhr, options) {
            console.log(xhr.responseText);
          }
        }); //only render af the first time
        return this;
      },
      
      drawMe: function(rows){
        var self = this;
        var myname = app.session.user.get('id');
        
        this.$el.resizable({
          handleSelector: ".splitter",
          handles: 'w',
          resizeHeight: false,
          resizeWidth: true
        });

        var $list = this.$el.find('.imglist');

        rows.sort(function(a, b){
          if (a.time < b.time) {
            return 1;
          }
          if (a.time > b.time) {
            return -1;
          }
          return 0;

        });

        _.each(rows, function(item) {
          var titleTitle ='SCREEN: ' + item.id +
                          '\nCreated by: ' + item.user +
                          '\nLast modified: ' + item.time + 
                          '\nMemo: '+ item.description;
          var figure = $('<figure/>')
                .css({
                  "background-color": "#222",
                  "border-style": "groove"
                }).attr('title', titleTitle);

          var titleText = item.id + ' ('+item.user+')',
              titleElement  = $('<div>' + titleText + '</div>').css({'position':'relative', 'white-space': 'nowrap'});
          
          var imgElement = $("<img>")
                .attr('src', 'api/snapshot/'+item.imgurl+'.jpg?'+ Math.random()* 1000000)
                .attr('alt', item.id)
                .attr('id', item.id)
                .attr('draggable', 'true')
                .css('cursor', '-webkit-grab');
          
          if(myname === item.user) {
              $('<button>' + 'X' + '</button>').addClass('event-del').appendTo(titleElement);
          }
      
          titleElement.css('background-color', (item.tag)?'#556b2f':'#333');

          figure.append(titleElement).append(imgElement);
         
          $list.append(figure);
        });
      },
    
      showScreen: function(e){
        e.preventDefault();
        framework.mediator.trigger('middleview:selectedScreen', $(e.currentTarget).attr('alt') );
      },

      onDeleteScreen: function(ev) {
        ev.preventDefault();
        var $clickedButtonElement = $(ev.currentTarget);
        var $img = $clickedButtonElement.parent().siblings('img');
        
        var del = confirm("Are you sure for deleting this screen?");
        if (del === true) {

          var params  = "id="+ encodeURIComponent( $img.attr('id') );
          //params += "&format="+ $img.attr('data-format');
          params += "&user="+ encodeURIComponent( app.session.user.get('id') );

          //delete data in database
          $.ajax({ //query databases worker
           url: app.API + '/screen?' + params,
           //data: data, //delete can not use the params
           type: 'DELETE', //or GET if no options' data
           timeout: 10000, //ms
          }).done(function(response, textStatus, jqXHR) {
             $img.parent().remove();
          }).fail(function(jqXHR, textStatus, errorThrown) {
            console.log('error when deleting screen!');
          });
        }
      }, //function end
  });

  return MyClass;
});
