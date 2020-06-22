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
define(['js/app', 'view/BoardView'], function (app,BoardView) {
  var BoardViewExt = BoardView.extend({
      initialize: function() {
        
        var self = this;
        
        BoardView.prototype.initialize.apply(this, arguments);

        //propagate to linking chart views 
        this.listenTo(this.chartctrl, 'change:_data_link_', function(changed, wvname, mode){
          //send to server
          app.control.remotelink && 
          app.sendByWebsocket('board:remotelink',
          { room: self.parent.parent.parent.screenid,
            data:{
              params: [changed, wvname, mode],//Object.values(arguments), 
              sid: self.parent.parent.parent.screenid,
              mid: this.model.id,
              wvname: wvname
            }
          });
          self.onLinkingEvent(changed, wvname, mode);//.apply(self, arguments);
        });
      },
    
      onRemoteLink: function(changed, wvname, mode) {
        const dataManager = this.chartctrl.dataManager();

        //update chart with the same screenid+chartid, no propagating further
        let opts =  {silent : false, stoplink: true};
        switch (mode) {
          case 'rowRefiner':
            dataManager._writeRowRefiner(changed, opts); 
            break;
          case 'columnRefiner':
            dataManager._writeColumnRefiner(changed, opts); 
            break;
          case 'clear':
            dataManager.clearFilter(opts); 
            break;
          case 'hybridRefiner':
            dataManager._writeHighlightRefiner(changed, opts); 
            break;
          case 'groupby':
          default:
            break;
        }

         //propagate to linked charts
         this.onLinkingEvent(changed, wvname, mode);//.apply(this, arguments);

      },

      //update linked charts
    onLinkingEvent: function(changed, wvname, mode) { 
      var self = this;//, params = arguments;
      if( _.isEmpty(this.linkViews)) return;
      
      //local link
      Object.keys(this.linkViews).forEach(function(mid){
           var view = self.parent._Views[mid],
               dataManager = view.chartctrl.dataManager();
           dataManager.linkages(changed, wvname, mode);//.apply(dataManager, params);
      });
    },
   
    //deepUpdate: renew chart with server query
    deepUpdate: function (options) {
        var self = this;
      if (this.chartctrl.widget.renew && 
           (!this.isDeepUpdating || options._remove_)) {//request only if chart can process
        this.isDeepUpdating = true;
        
        //get new data and process it
        this.chartctrl.getData(this.model.get('vtname'), options)
          .done(function (myChartModel) {
            console.log('Hi, i recevied new data!');
            self.isDeepUpdating = false;
            //is a renew function is necessary in chart?
            var $chart_el = self.$el.find('.chart');
            var renderd_dom = myChartModel.widget.renew(options._remove_);
            if(!!renderd_dom) {
              $chart_el.append(renderd_dom);
            }
          });
      } /*else {
        console.log('Hi, i skiped renewing !');
      }*/
    },
    
    showVirtualTables: function() {
      var options = {type: this.model.get('vttype').split('/')[0]}; //TBChange
      
      $.ajax({type: 'get', data: options, cache: false, url: 'api/vts'})
      .done(function(list){
        console.log(list);
        //show list
      })
      .fail(function(){
        console.log('failed to get virtual list');
      });
    }
    
  }); //BoardViewExt defination end
  
  return BoardViewExt;
});
