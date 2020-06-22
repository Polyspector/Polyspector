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
define(['text!vis/config.json'], function(cts){

  function MyClass() {
      this.url = 'api/vts';
      this.libconfig();
  }

  MyClass.prototype.libconfig = function() {
    var jsonstr= cts.replace(/\/\*.+?\*\/|\/\/.*(?=[\n\r])/g, '') //remove comment
                    .replace(/'/g, '"') //change single quote to double quotes
                    .replace(/(['"])?([\a-z0-9A-Z_]+)(['"])?:/g, '"$2": ');//add double quote surrounding KEYs.
    this.modules = JSON.parse(jsonstr);
  };

  MyClass.prototype.getDatalistOfKind = function(kind) {
    var deferred = $.Deferred()
    $.ajax({type: 'get', cache: false, url: this.url, timeout:10000, data: {kind: kind}}).then(function (wks) {
      var items = {};
      _.each(wks, function(vts, wkname){
        if(vts.length > 1 ) {
          var obj= {};
          vts.forEach(function(vtname) {
            obj[wkname+'.'+vtname] = {name: vtname};
          });
          items[wkname] = {name: wkname, items: obj };
        } else if(vts.length ==1 && wkname != vts[0]) {
          items[wkname+'.'+vts[0]] = {name: wkname+'.'+vts[0]};
        } else {
          items[wkname] = {name: wkname};
        }
      });
      console.log(items);
      return deferred.resolve({items: items});
    });
    return deferred.promise();
  };

  MyClass.prototype.getDatalistOfChart = function(libtype) {
    const self = this;
    let kind = 'TABLE', type= libtype.split('/').slice(-1)[0]; //default value
    Object.keys(self.modules).some(function(ctg){
      if (self.modules[ctg].length>0) {
        self.modules[ctg].some(function(lib){
          if(lib.type == type) {
            kind = (ctg=="ADVANCED")? lib.type: ctg;
            return true;
          };
        });
      }
    });
    return self.getDatalistOfKind(kind);
  };
  
  MyClass.prototype.addChartLibs = function(ctg){
    var tempKey, tempName, tempType, items ={};
    if(this.modules[ctg]) {
       this.modules[ctg].forEach(function(me) {
         if(me.constructor == Object) { //customized path
            tempKey  = me.path;
            tempName = me.name || me.type;
            tempType = me.type;
         } else { //default path (chart's type == chart's path)
            tempKey = ctg+ '/'+ me ;
            tempName = me;
            tempType = me;
         }
         items[tempKey] = {name: tempName, libtype: tempType};
      });
    }
    return items;
  };

  MyClass.prototype.getDatalistOfCharts = function(){
    var self=this, contextMenu={};
    var addItems ={
          TABLE: { name: 'Basic charts for table data'  },
          STREAM:{ name: 'Basic chart for stream data'  },
          TREE:  { name: 'Basic charts for tree data' },
          ADVANCED: { name: 'Advanced charts'}
      };
    Object.keys(addItems).forEach(function(ctg) {
      addItems[ctg].items = self.addChartLibs(ctg);
      addItems[ctg].disabled = _.isEmpty(addItems[ctg].items);
    });
    contextMenu.items = addItems;
    return contextMenu;
  };

  return new MyClass();
});
