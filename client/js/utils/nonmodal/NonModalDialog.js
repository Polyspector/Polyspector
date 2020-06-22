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
  'text!./nonModalDialog.html',
  'css!./nonModalDialog',
], function (nonModelDialogTpl) {
  /**
   * @class NonModelDialog
   */
  var MyClass = Backbone.View.extend( {
    defaultClass: 'non-modal-dialog',
    title: 'Non-Modal Dialog',
    minWidth: 100,
    minHeight:100,
    resizeH: true,
    resizeV: true,
    timeToDelaied: 100,
    
    initialize: function() {
      var self = this;
      var template =_.template(nonModelDialogTpl);
      this.$el.addClass(this.defaultClass);
    
      this.$el.css({ 
              position:'absolute',
              'z-index': 99,
              width: '300px' 
      });
    
      this.$el.html(template({ title: this.title }));
    
      this.$('.btn-dialog-close').on('click', this.onCloseButtonCliked.bind(this));
      this.$('.btn-dialog-anchor').on('click', this.onSwitchAnchorCliked.bind(this));
      this.$('.dialog-header').on('mousedown', this.onMousedownHead.bind(this));
      this.$('.resize-dialog').on('mousedown', this.onMousedownResizeDialog.bind(this));
      
      this.$el.on('click', function(evt){ evt.stopPropagation(); } ); //limit clicking event to this view
    
    },
    
    /**
     * Handler of clicking to close button
     */
    onCloseButtonCliked: function (evt) {
      evt.stopPropagation();
      this.close();
    },
    
    onSwitchAnchorCliked: function(evt) {
      evt.stopPropagation();
    },
    
    positionMe: function() {
      var $ref = $(document.body);
      
      $ref.append(this.$el);
      
      this.$el.css('top', '0px');
      this.$el.css('left','0px');
    },
    
    /**
     * Show dialog
     */
    show: function (option) {
      var self = this;
      this.$el.fadeIn(this.timeToDelaied, function(){
        //please add DOM firestly
        if (typeof self.onOpen === 'function') {
          self.onOpen(option);
        }
        //please adjust position lastly
        if(typeof self.positionMe==='function') {
          self.positionMe();
        }
        //self._isOpened = true;
      });
    },
    /**
     * Hide dialog
     */
    close: function (option) {
      var self =this;
      this.$el.fadeOut(this.timeToDelaied, function(){
        if (typeof self.onClose === 'function') {
          self.onClose(option);
        }
        //self._isOpened = false;
      });
    },
    
    /**
     * Is this dialog opened
     */
    isOpened: function () {
      //return !!this._isOpened;
      return this.$el.is(":visible");
    },
    
    /**
     * Listen on mouse down on head to drag dialog
     * @param {jQueryEvent} evt - event of jquery
     */
    onMousedownHead: function (evt) {
      evt.preventDefault();
      evt.stopPropagation();
      var onMousemoveToDragBinded = this.onMousemoveToDrag.bind(this);
      var mouseX = evt.clientX,
          mouseY = evt.clientY;
      var dialogPosition = this.$el.position();
      var dialogX = dialogPosition.left,
          dialogY = dialogPosition.top;
      var leftOffset = mouseX - dialogX,
          topOffset = mouseY - dialogY;
      // add max left and max top of dialog compare with document size
      var $document = $(document);
      var maxLeft = $document.width() - this.$el.width();
      var maxTop = $document.height() - this.$el.height();
      // listen mouse move on body
      $(document.body).on('mousemove',
        {
          leftOffset: leftOffset,
          topOffset: topOffset,
          maxLeft: maxLeft,
          maxTop: maxTop
        }, onMousemoveToDragBinded);
      
      // cancel listening mouse move when mouse up
      $(document.body).one('mouseup', function (evt) {
        evt.preventDefault();
        evt.stopPropagation();
        $(document.body).off('mousemove', onMousemoveToDragBinded);
      });
    },
    /**
     * Handler of mouse move which change position of dialog when mouse move
     * @param {jQueryEvent} evt - event of mouse move
     */
    onMousemoveToDrag: function (evt) {
      var data = evt.data;
      var maxLeft = data.maxLeft,
          maxTop = data.maxTop;
      var leftOffset = data.leftOffset,
          topOffset = data.topOffset;

      evt.preventDefault();
      evt.stopPropagation();

      // calculate position of dialog
      var left = evt.clientX - leftOffset,
          top = evt.clientY - topOffset;

      if (maxLeft && (left > maxLeft)) {
        left = maxLeft;
      }
      if (maxTop && (top > maxTop)) {
        top = maxTop;
      }
      // css for dialog to posite dialog
      this.$el.css('left', left + 'px');
      this.$el.css('top', top + 'px');
    },
    /**
     * Handler of mouse down to resize button of dialog
     * @param {jQueryEvent} evt - event of mouse down
     */
    onMousedownResizeDialog: function (evt) {
      evt.preventDefault();
      evt.stopPropagation();
      var func = this.onMousemoveResizeDialog.bind(this);
      // listen mouse move on body
      $(document.body).on('mousemove', func);

      // cancel listening mouse move when mouse up
      $(document.body).one('mouseup', function (evt) {
        evt.preventDefault();
        evt.stopPropagation();
        $(document.body).off('mousemove', func);
      });
    },
    /**
     * Handler of mouse move to resize dialog
     * @param {jQueryEvent} evt - event of mouse move
     */
    onMousemoveResizeDialog: function (evt) {
      evt.preventDefault();
      evt.stopPropagation();

      // calculate position of dialog
      var dialogX = this.$el.offset().left,
          dialogY = this.$el.offset().top;
      // calculate position of mouse
      var left = evt.clientX,
          top  = evt.clientY;

      var width  = this.$el.width();
      var height = this.$el.height();
      if (this.resizeH) {
        width = left - dialogX;
        if (width < this.minWidth) {
          width = this.minWidth;
        }
        this.$el.width(width);
      }
      if (this.resizeV) {
        height = top - dialogY;
        if (height < this.minHeight) {
          height = this.minHeight;
        }
        this.$el.height(height);
      }
    }
    
  });

  return MyClass;
});

