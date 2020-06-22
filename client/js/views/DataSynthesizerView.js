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
 * Create DataSynthesizerView main function
 *
 * @class DataSynthesizerView
 * @param {type} _ - underscore.js
 * @param {type} dataSynthesizerTpl - dataSynthesizer html template
 * @returns {DataSynthesizerView}
 */
define([
  'js/app',
  'text!templates/data_synthesizer.html',
  'model/virtualTableModel',
  'view/VirtualTableView',
  'model/contextMenuModel'
], function (app, dataSynthesizerTpl, virtualTableModel, VirtualTableView, contextMenuModel) {
  // Show management page
  var DataSynthesizerView = Backbone.View.extend({
    events: {
      'mousedown': 'onMousedownVTItem',
      'click a.btn-execute': 'executeTestSql',
      'click a.btn-save': 'executeSaveSql'
    },

    /**
     * Constructor of DataSynthesizerView class
     */
    initialize: function () {
     this.template = _.template(dataSynthesizerTpl);
     this.deleteVirtualTables();
     this.render();
    },

    getNextTableId: function() {
      var nextTableIdCode = 'A'.charCodeAt(0);
      while(String.fromCharCode(nextTableIdCode) in alasql.tables) {
        nextTableIdCode +=1;
      }
      return String.fromCharCode(nextTableIdCode); 
    },

    /**
     * Render DataSynthesizerView
     */
    render: function () {
      var self = this;
      contextMenuModel.getDatalistOfKind('TABLE').done(function(menu){
         if(!_.isEmpty(menu.items)) {
             self.$el.html(self.template({vtlist: Object.keys(menu.items) }));
             self.$el.find('.second-column').on('drop', self.dropVirtualTable.bind(self));
             self.$el.find('.second-column').on('dragover', self.dragToVirtualTable.bind(self));
             self.$el.find('.vt').on('dragstart', self.dragFromVirtualTable.bind(self));
          }
      });
      return this;
    },

    /**
     * Handle onMouseDown event
     */
    onMousedownVTItem: function (evt) {
     /* var target = $(evt.target);
      target.addClass('pressed');
      $('body').one('mouseup', function () {
        target.removeClass('pressed');
      });*/
    },
    
    convertSql: function(sql) {
      var query = sql.replace(/[\n\r\t]/g, ' ').replace(/s(?=\s)/g,'').replace(/;\s*$/, ""),
          parameters = query.match(/\s\w*(\.)?\.?\#\w*(\s)?/g);
      if(!parameters) {
        return query.split(';');
      }

      //check table names anc columns? --TBD
      parameters.forEach(function(key) {
        query = query.replace(new RegExp(key, 'g'), '(true)');
      });
      return query.split(';');
    },

    executeTestSql: function(ev) {
      var noError = true;
      var self = this;
      try{
        var sql_string = this.$el.find('.sql-command-editor').val().trim();
        if(!_.isEmpty(sql_string)) {
              
          alasql.promise(this.convertSql(sql_string)).then(function(resultData){
            var resultTable= self.findResultTable(resultData);
            if(resultTable.length >0 ){
              if(ev) { //press button to show result
                 var wvtid = '', wvtname="don't use this table in SQL command";
                 self.$el.find('[view-wvtname="' + wvtname + '"]').remove();
                 var resultView = new VirtualTableView({wvtid: '', wvtname: wvtname, parent: self});
                 self.$el.find('.second-column').append(resultView.render(resultTable).$el);
              }
              if(self.hasExtraTables()) {
                self.$el.find('.sql-error-message').val('Please DROP intermediate table!');
                noError=false;
              } else { 
                self.$el.find('.sql-error-message').val('Success!');
                noError=true;
              }
            } else {
                self.$el.find('.sql-error-message').val('Empty result data!');
                noError=false;
            }
          }).catch(function(reason){
                self.$el.find('.sql-error-message').val(reason.toString());
                noError=false;
          });
        } else {
          this.$el.find('.sql-error-message').val('No SQL command!'); 
          noError=false;
        }
      } catch(error) {
          this.$el.find('.sql-error-message').val(error.toString());
          noError = false;
      }
      return noError;
    },

    executeSaveSql: function(ev) {
      var self = this, wvtname='__editor';

      var new_vt_name = this.$el.find('.vt-command-buttons #new-vt-name').val().trim();
      if(_.isEmpty(new_vt_name)) {
        this.$el.find('.sql-error-message').val('Please input virtual table name!');
        return;
      }
      if(this.executeTestSql()) {
        var tables = {}, id;
        $vtview = this.$el.find('[view-wvtname]');
        $vtview.each(function(){
          id = $(this).attr('view-wvtid');
          if(id !== '') {
            tables[id] = $(this).attr('view-wvtname');
          }
        });
        var options = {
            userId: app.session.user.get('id'),
            vtname: new_vt_name,
            tables: tables,
            sql: this.$el.find('.sql-command-editor').val().trim()
        };
        
        virtualTableModel.getTableFromServer(wvtname, options)
        .done(function(table) {
          //var resultTable = new VirtualTableView({wvtid: 'RESULT', wvtname: wvtname, parent: self});
          //self.$el.find('[view-wvtname="' + wvtname + '"]').remove();
          //resultTable.render(table);
          //self.$el.find('.second-column').append(resultTable.$el);
          self.$el.find('.sql-error-message').val('success!');
        })
        .fail(function(error){
          self.$el.find('.sql-error-message').val(error.toString());
        });
      }
    },

    /**
     * Handle onDropVritualTable event
     */
    dropVirtualTable: function (ev) {
      ev.preventDefault();

      var self = this;
      //get jquery data
      var wvtid = ev.originalEvent.dataTransfer.getData('wvtid');
      var wvtname = ev.originalEvent.dataTransfer.getData('wvtname');

      // check existence of vtid in this area
      if (this.$el.find('[view-wvtname="' + wvtname + '"]').length > 0) {
        windows.alert('View ' + wvtname + ' already existed');
        return;
      }

      virtualTableModel.getTableFromServer(wvtname)
      .done(function(table) {
        var dataTable = new VirtualTableView({wvtid: wvtid, wvtname: wvtname, parent: self});
        dataTable.render(table, 3);
        alasql.tables[wvtid]= {data: table};
        self.$el.find('.second-column').append(dataTable.$el);
        self.$el.find('.pressed').addClass('selected');
        self.$el.find('.pressed').removeClass('pressed');
      })
      .fail(function(error){
        self.$el.find('.sql-error-message').val(error.toString());
      });
    },

    /**
     * Handle onDropoverVritualTable event
     */
    dragToVirtualTable: function (ev) {
      ev.preventDefault();
    },
  
    /**
     * Handle onDragstartVritualTable event
     */
    dragFromVirtualTable: function (ev) {
      //set jquery data
      ev.originalEvent.dataTransfer.setData('wvtname', $(ev.target).attr('list-wvtname'));
      ev.originalEvent.dataTransfer.setData('wvtid', this.getNextTableId());
    },

    findResultTable: function(resultData) {
      var resultTable = {};
      if(resultData.constructor == Array) {
        for(var i=0; i< resultData.length; i++){
          if(resultData[i].constructor == Array) { //Array or Object
            resultTable = resultData[i];
            break;
          }
        }
      } else {
        resultTable = resultData;
      }
      return resultTable;
    },

    deleteVirtualTable: function(wvtid) {
      if(wvtid in alasql.tables) {
        delete alasql.tables[wvtid];      
      }
    },

    deleteVirtualTables: function() {
      Object.keys(alasql.tables).forEach(function(wvtid){
        delete alasql.tables[wvtid];
      });
    },

    hasExtraTables: function() {
      var ret = false;
      var $vtview = this.$el.find('[view-wvtname]');
      var id, ids = [];
      $vtview.each(function() {
        id = $(this).attr('view-wvtid');
        if(!_.isEmpty(id)){
          ids.push(id);
        }
      });

      if(ids.length >0 ){
        ret = Object.keys(alasql.tables).some(function(wvtid){
          return ids.indexOf(wvtid) < 0;
        });
      }
      return ret;
    },
    
    destroy: function () {
      this.$el.html('');
    }

  }); //class defination end

  return DataSynthesizerView;

});
