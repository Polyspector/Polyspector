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
  'text!templates/virtual_table.html'
], function (VirtualTableViewTpl) {

/**
   * Constructor create VitualTable
   * @method VitualTable
   * @memberOf VitualTable
  */
  var MyClass = Backbone.View.extend({
    events: {
      'click .close-button': 'onCloseBtnClicked'
    },

    className: 'management-vt-view',
    /**
     * Template for vitual table
     */
    template: _.template(VirtualTableViewTpl),
    
    /**
     * Constructor of this class
     */
    initialize: function (options) {
      _.extend(this, _.pick(options, 'wvtid','wvtname', 'parent'));
    },
    /**
     * Render HTML of this view
     */
    render: function (table, limit) {
      
      var columns = (table.length>0)? Object.keys(table[0]):[];
      this.$el.html(this.template({table: table, columns: columns, wvtid: this.wvtid, wvtname:this.wvtname, limit:limit}));
      this.$el.attr({'view-wvtname': this.wvtname, 'view-wvtid': this.wvtid});
      this.table = table;
      
      return this;
    },

    onCloseBtnClicked: function () {
      var self = this;
      var wvtid = this.$el.attr('view-wvtid');
      this.$el.fadeOut(function () {
        self.$el.remove();
      });
      this.parent.deleteVirtualTable(wvtid);
      // remove selected class of vt item in vt list
      //$('[data-wvtname=\"' + this.vtid + '\"]').removeClass('selected');
    }
  });

  return MyClass;
});
