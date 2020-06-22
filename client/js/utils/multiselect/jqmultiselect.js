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
/*
 * Depends:
 * ui.core.js
 * ui.sortable.js
 * Optional:
 *  localization (http://plugins.jquery.com/project/localisation)
 *  scrollTo (http://plugins.jquery.com/project/ScrollTo)
 */

define(['css!./jqmultiselect.css',
        'lib/jquery-ui/jquery-ui',
        'css!lib/jquery-ui/jquery-ui.css'], function() {
  $.widget("custom.jqmultiselect", {
    options: {
      sortable: true,
      searchable: true,
      doubleClickable: true,
      animated: 'fast',
      show: 'slideDown',
      hide: 'slideUp',
      availableFirst: true,
      nodeComparator: function(node1,node2) {
        var text1 = node1.text(),
            text2 = node2.text();
        return text1 == text2 ? 0 : (text1 < text2 ? -1 : 1);
      }
    },
    _create: function() {
      this.isarray = (this.element.attr('isarray') =='true');
      this.element.hide();
      this.id = this.element.attr("id");
      this.container = $('<div class="ui-multiselect ui-helper-clearfix ui-widget"></div>').insertAfter(this.element);
      this.count = 0; // number of currently selected options
      this.selectedContainer = $('<div class="selected"></div>').appendTo(this.container);
      this.availableContainer = $('<div class="available"></div>')[this.options.availableFirst?'prependTo': 'appendTo'](this.container);
      this.selectedActions = $('<div class="actions widget-header ui-helper-clearfix"><span class="count">0 '+$.custom.jqmultiselect.locale.itemsCount+'</span><a href="#" class="remove-all">'+$.custom.jqmultiselect.locale.removeAll+'</a></div>').appendTo(this.selectedContainer);
      this.availableActions = $('<div class="actions widget-header ui-helper-clearfix"><input type="text" class="search empty ui-widget-content ui-corner-all"/><a href="#" class="add-all">'+$.custom.jqmultiselect.locale.addAll+'</a></div>').appendTo(this.availableContainer);
      this.selectedList = $('<ul class="selected connected-list"><li class="ui-helper-hidden-accessible"></li></ul>').bind('selectstart', function(){return false;}).appendTo(this.selectedContainer);
      this.availableList = $('<ul class="available connected-list"><li class="ui-helper-hidden-accessible"></li></ul>').bind('selectstart', function(){return false;}).appendTo(this.availableContainer);
      
      var that = this;
      // set dimensions
      this.container.css('width','100%');
      this.selectedContainer.css({width: '49%', float: 'right'});
      this.availableContainer.css({width: '50%', float: 'left'});

      if ( !this.options.animated ) {
        this.options.show = 'show';
        this.options.hide = 'hide';
      }
      
      // init lists
      this._populateLists(this.element.find('option'));
      
      // make selection sortable
      if (this.options.sortable) {
        this.selectedList.sortable({
          placeholder: 'ui-state-highlight',
          axis: 'y',
          update: function(event, ui) {
            // apply the new sort order to the original selectbox
            that.selectedList.find('li').each(function() {
              if ($(this).data('optionLink'))
              $(this).data('optionLink').remove().appendTo(that.element);
            });
            that._informCustomSelected();
          },
          receive: function(event, ui) {
            ui.item.data('optionLink').attr('selected', true);
            // increment count
            that.count += 1;
            that._updateCount();
            // workaround, because there's no way to reference 
            // the new element, see http://dev.jqueryui.com/ticket/4303
            that.selectedList.children('.ui-draggable').each(function() {
              $(this).removeClass('ui-draggable');
              $(this).data('optionLink', ui.item.data('optionLink'));
              $(this).data('idx', ui.item.data('idx'));
              that._applyItemState($(this), true);
            });
          
            // workaround according to http://dev.jqueryui.com/ticket/4088
            setTimeout(function() { ui.item.remove(); }, 1);
          },

          //sort: function(event) {
          //  that._informCustomSelected();
          //}
        });
      }
      
      // set up livesearch
      if (this.options.searchable) {
        this._registerSearchEvents(this.availableContainer.find('input.search'));
      } else {
        $('.search').hide();
      }
      
      // batch actions
      this.container.find(".remove-all").click(function() {
        that._populateLists(that.element.find('option').removeAttr('selected'));
        that._informCustomSelected();
        return false;
      });
      
      this.container.find(".add-all").click(function() {
        var options = that.element.find('option').not(":selected");
        if (that.availableList.children('li:hidden').length > 1) {
          that.availableList.children('li').each(function(i) {
            if ($(this).is(":visible")) {
              $(options[i-1]).attr('selected', 'selected');
              return that.isarray; //break(false) for one selection data mapping
            } 
          });
        } else {
          options.attr('selected', 'selected');
        }
        that._populateLists(that.element.find('option'));
        that._informCustomSelected();
        return false;
      });
    },
    destroy: function() {
      this.element.show();
      this.container.remove();
      $.Widget.prototype.destroy.apply(this, arguments);
    },

    _populateLists: function(options) {
      this.selectedList.children('.ui-element').remove();
      this.availableList.children('.ui-element').remove();
      this.count = 0;

      var that = this;
      var items = $(options.map(function(i) {
        var isselected = this.hasAttribute("selected");
            item = that._getOptionNode(this).appendTo(isselected ? that.selectedList : that.availableList).show();

        if (isselected) that.count += 1;
        that._applyItemState(item, isselected);
        item.data('idx', i);
        return item[0];
      }));
      
      // update count
      this._updateCount();
      that._filter.apply(this.availableContainer.find('input.search'), [that.availableList]);
    },

    _updateCount: function() {
      this.element.trigger('change');
      this.selectedContainer.find('span.count').text(this.count+" "+$.custom.jqmultiselect.locale.itemsCount);
    },
    _getOptionNode: function(option) {
      option = $(option);
      //lxx: 2018/11/1 use option.attr('value') instead of options.val() for the later trim spaec automatically
      var node = $('<li class="state-default ui-element" title="'+option.text()+'" data-selected-value="'+ option.attr('value') +'"><span class="ui-icon"/>'+option.attr('value')+'<a href="#" class="action"><span class="ui-corner-all ui-icon"/></a></li>').hide();
      node.data('optionLink', option);
      return node;
    },
    // clones an item with associated data
    // didn't find a smarter away around this
    _cloneWithData: function(clonee) {
      var clone = clonee.clone(false,false);
      clone.data('optionLink', clonee.data('optionLink'));
      clone.data('idx', clonee.data('idx'));
      return clone;
    },
    _setSelected: function(item, selected) {
      item.data('optionLink').attr('selected', selected);

      if (selected) { //click to add
        if(!this.isarray && this.selectedList.find('.ui-element').length > 0) {
          return null;
        }
        var selectedItem = this._cloneWithData(item);
        item[this.options.hide](this.options.animated, function() { $(this).remove(); });
        selectedItem.appendTo(this.selectedList).hide()[this.options.show](this.options.animated);
        this._applyItemState(selectedItem, true);

        return selectedItem;
      } else {
      
        // look for successor based on initial option index
        var items = this.availableList.find('li'), comparator = this.options.nodeComparator;
        var succ = null, i = item.data('idx'), direction = comparator(item, $(items[i]));

        // TODO: test needed for dynamic list populating
        if ( direction ) {
          while (i>=0 && i<items.length) {
            direction > 0 ? i++ : i--;
            if ( direction != comparator(item, $(items[i])) ) {
              // going up, go back one item down, otherwise leave as is
              succ = items[direction > 0 ? i : i+1];
              break;
            }
          }
        } else {
          succ = items[i];
        }
        
        var availableItem = this._cloneWithData(item);
        succ ? availableItem.insertBefore($(succ)) : availableItem.appendTo(this.availableList);
        /*item[this.options.hide](this.options.animated, function() { 
          $(this).remove(); 
        });*///replace with below line in order to get selected list immadiately 
        item.remove();
        availableItem.hide()[this.options.show](this.options.animated);
        this._applyItemState(availableItem, false);

        return availableItem;
      }
    },
    _applyItemState: function(item, selected) {
      if (selected) {
        if (this.options.sortable)
          item.children('span').addClass('ui-icon-arrowthick-2-n-s').removeClass('ui-helper-hidden').addClass('ui-icon');
        else
          item.children('span').removeClass('ui-icon-arrowthick-2-n-s').addClass('ui-helper-hidden').removeClass('ui-icon');
        item.find('a.action span').addClass('ui-icon-minus').removeClass('ui-icon-plus');
        this._registerRemoveEvents(item.find('a.action'));
      } else {
        item.children('span').removeClass('ui-icon-arrowthick-2-n-s').addClass('ui-helper-hidden').removeClass('ui-icon');
        item.find('a.action span').addClass('ui-icon-plus').removeClass('ui-icon-minus');
        this._registerAddEvents(item.find('a.action'));
      }
      
      this._registerDoubleClickEvents(item);
      this._registerHoverEvents(item);
    },
    // taken from John Resig's liveUpdate script
    _filter: function(list) {
      var input = $(this);
      var rows = list.children('li'),
      cache = rows.map(function(){
        return $(this).text().toLowerCase();
      });
      
      var term = $.trim(input.val().toLowerCase()), scores = [];
      
      if (!term) {
        rows.show();
      } else {
        rows.hide();

        cache.each(function(i) {
          if (this.indexOf(term)>-1) { scores.push(i); }
        });

        $.each(scores, function() {
          $(rows[this]).show();
        });
      }
    },
    _registerDoubleClickEvents: function(elements) {
      if (!this.options.doubleClickable) return;
      elements.dblclick(function(ev) {
        if ($(ev.target).closest('.action').length === 0) {
          // This may be triggered with rapid clicks on actions as well. In that
          // case don't trigger an additional click.
          elements.find('a.action').click();
        }
      });
    },
    _registerHoverEvents: function(elements) {
      elements.removeClass('ui-state-hover');
      elements.mouseover(function() {
        $(this).addClass('ui-state-hover');
      });
      elements.mouseout(function() {
        $(this).removeClass('ui-state-hover');
      });
    },

    _informCustomSelected: function() {
      var list =[];
      this.selectedList.find('.ui-element').each(function(index, elm){
        return list.push($(elm).data('selected-value'));
      });
      this.element.trigger('multiselect:list', [list]);
    },

    _registerAddEvents: function(elements) {
      var that = this;
      elements.click(function() {
        var item = that._setSelected($(this).parent(), true);
        if(item) {
          that.count += 1;
          that._updateCount();
          that._informCustomSelected();
        }
        return false;
      });
      
      // make draggable
      if (this.options.sortable) {
        elements.each(function() {
          $(this).parent().draggable({
              connectToSortable: that.selectedList,
              helper: function() {
                var selectedItem = that._cloneWithData($(this)).width($(this).width() - 50);
                selectedItem.width($(this).width());
                return selectedItem;
              },
              appendTo: that.container,
              containment: that.container,
              revert: 'invalid'
            });
        });    
      }
    },
    _registerRemoveEvents: function(elements) {
      var that = this;
      elements.click(function() {
        that._setSelected($(this).parent(), false);
        that.count -= 1;
        that._updateCount();
        that._informCustomSelected();
        return false;
      });
    },
    _registerSearchEvents: function(input) {
      var that = this;

      input.focus(function() {
      $(this).addClass('ui-state-active');
      })
      .blur(function() {
      $(this).removeClass('ui-state-active');
      })
      .keypress(function(e) {
      if (e.keyCode == 13)
        return false;
      })
      .keyup(function() {
      that._filter.apply(this, [that.availableList]);
      });
    }
  });

  $.extend($.custom.jqmultiselect,  {
    locale: {
      addAll:'全選択',
      removeAll:'全削除',
      itemsCount:'個選択'
    }
  });

});
