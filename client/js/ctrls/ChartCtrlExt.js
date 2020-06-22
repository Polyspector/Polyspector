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
//extend the chart control class for color manager

define(['js/app','ctrl/COMMON','ctrl/ChartCtrl'], function (app, COMMON,ChartCtrl) {
  
  ChartCtrl.prototype.manualMapping = function(mapping) {
    //selection is the columns(legend) and y-axises to be shown
    var self = this,
        mapperProps = this.dataManager().getMapperProps(),
        colorDomainName = this.colorManager().getDomainName();

    for(let prop in mapping) {
      
        var map2Columns = mapping[prop];
        
        //update chart with new mapping
        self.dataManager().setMapper(prop, map2Columns);//update chart    

        var isSelectedColumnColoring = Array.isArray(mapperProps[prop].map2)?
                            (map2Columns.indexOf(colorDomainName) >= 0) :
                            (colorDomainName ==map2Columns);
        
        if(isSelectedColumnColoring || colorDomainName == mapperProps[prop].label ) { //update current color mapping with new mapped columns
            //TBD: check and get data of map2Columns if nonexisted in BIG data cases        
            //update current domain in colormanager
            var isUpdateColorMapping = self.colorManager().setDomain(colorDomainName, map2Columns);
            if(isUpdateColorMapping) { //to update color selectlist and color pads
              framework.mediator.trigger('data_mapping:update_with_new_dataset', true);
            } else { //only to update color selectlist
              framework.mediator.trigger('data_mapping:update_with_new_dataset');
            }
        } else {
          //clear colorColumnName
          self.colorManager().setDomain();//clear domain
          //to update color selectlist and color pads
          framework.mediator.trigger('data_mapping:update_with_new_dataset', true); 
        }

        if(prop === 'groupby') { //linking with groupby options 
          self.dataManager().triggerLink4Groupby(map2Columns, {stoplink: true});
        } 
    }
  };

  ChartCtrl.prototype.requestStream = function(callback) {
    let vtname = this.board_model.get('vtname');
    app.sendByWebsocket('init:streame', {room:vtname}); //add me into websocket observer in server
    app.websocket.on(vtname, function(data) { //comming data
      if(data.vtname == self.vtname) {
        callback(data.data);
      }
    });
  };

  return ChartCtrl;
});
