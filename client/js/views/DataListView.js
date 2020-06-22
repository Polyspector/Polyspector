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
define([ "js/app",
         'text!templates/data_list.html',
        'msgpack'], function (app, myTpl, msgpack) {

  var MyClass = Backbone.View.extend({
    template: _.template(myTpl),
    initialize: function (options) {
      _.extend(this, _.pick(options, "dataid"));//input params if existed in order to skip the view
      _.bindAll(this, 'render', 'lateRender');
      this.$el.html( this.template());
      this.render();
    },

    // Events
    events: {
      "click table tr.clickable_row": 'selectRow'
    },

    
    render: function() {
      let self = this;

      let data = { user: app.session.user.get('id'), format: this.model.get('tool').format };
      data = this.model.get('tool')? $.extend(data, { format: this.model.get('tool').format }): data;
      $.ajax({ //query databases worker
        url: app.API + '/data/datalist',
        type: 'POST', //or GET if no options' data
        cache: false,
        processData: false,//convert sending data object to query string or not, default: true
        dataType: "binary",//type of sening data??
        async: true,
        timeout: 30000, //10s
        contentType: 'application/octet-stream', //type of data to send
        data: msgpack.encode(data)
      })
      .done(function(response) {
          let fileReader = new FileReader();
          fileReader.onload = function(event) {
            let jsondata = msgpack.decode(new Uint8Array(event.target.result));
            self.lateRender(jsondata);
          }
          fileReader.readAsArrayBuffer(response);
        })
      .fail(function(jqXHR, textStatus, errorThrown) {
          window.alert( "データリスト取得にエラーが発生しました! " + errorThrown  ) ;
        });
    },

    // Render FooterView
    lateRender: function (response) {
      
      if(response && response.format.toLowerCase() ==="json" && response.filled) {
        //drawchart with response.filled.chart
         var dlist = (response.filled.list)? response.filled.list : response.filled,
             $lheader = this.$el.find('#datalist_header'),
             $lbody = this.$el.find('#datalist_body');
         var predef_dataid = this.dataid, 
             has_predef_dataid = this.dataid && this.dataid.length >0,
             predef_format = null;

         for(var key in dlist[0]) {  //add header
           $lheader.append("<th>"+ key + "</th>");
         }

         dlist.forEach(function(dline) { //add body
           var $line = $("<tr class='clickable_row'>").appendTo($lbody);
           for(var key in dline) {
              $line.append("<td>"+ dline[key] + "</td>");
           }
           var currentid = (dline.id)? dline.id: dline.name,
               currentformat =  (dline.format)?dline.format: 'default';
           $line.data('row_id', currentid); //name or id is necessary for each data 
           $line.data('row_format',currentformat);
           
           if(has_predef_dataid && currentid === predef_dataid ) {
              predef_format = currentformat;
           }
         });
         
         if(has_predef_dataid && predef_format) {
            this.model.set('data', {id: predef_dataid, format: predef_format});
            this.shiftView(predef_dataid, predef_format);
         } 
      } //if end
        
      return this;
    },

    selectRow: function(ev) {
      var row_id     = $(ev.currentTarget).data("row_id");
      var row_format = $(ev.currentTarget).data("row_format");
      this.shiftView(row_id, row_format);
    },

    shiftView: function(row_id, row_format) {
      framework.mediator.trigger("headerview:datalistid", row_id);
      framework.mediator.trigger("middleview:selectedData", { id: row_id, format: row_format } );
    }    

  });
  return MyClass;
});
