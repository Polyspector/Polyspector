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
define(['ctrl/COMMON', 'msgpack'], function (COMMON, msgpack) {

 //the data flag comes from server
 var BIG = {
        NONE: 0,
        ROW: 1,
        COLUMN: 2,
        BOTH: 3
    };

 //the flag computed in client
 var DEEPLINK = {
      NONE: 0,
      LOCAL: 1,
      WORKER: 2,
      GLOBAL: 3
 };

 var DataManager = function(ctrl){
      this._ctrl  = ctrl;
      this._model = ctrl.board_model;
      this._screen = ctrl.screen_model;
      this._data = {_default_table_key_: '_table_', '_$mapper_props_':{}, _infer_: {}, _ext_:{} };
      this._dataset_url_root = 'api/data/';//the root of virtual table
 };

 DataManager.prototype._readRowRefiner= function() {
    return COMMON.makeObject(this._model.get('dataRefiner'), {});//convert to object
 };

 DataManager.prototype._writeRowRefiner =  function(changedAttrs, opts) {
     var options = ( opts ) ? opts : {silent : false} ;
         orgAttrs = this._readRowRefiner();
     if(_.isEqual(changedAttrs, orgAttrs)) return;

     // if(_.isEmpty(changedAttrs)) { //case: undo all condition
     //    this._model.set({'dataRefiner': {} }, options);
     // } else
     {
       let myRowRefiner = _.extend(orgAttrs, changedAttrs), //overwrite each filter if existed, else copy it
          dataRanges   = this.getDataRange();
       myRowRefiner = _.pick(myRowRefiner, function(range, column) { //delete null range before save
          return !_.isEmpty(range);
       });
       this._model.set({'dataRefiner': myRowRefiner}, options);
     }
     if(!options.silent) {
       this.updateChart('REFINER', changedAttrs);
     }
     if(!options.stoplink) {
       this._ctrl.trigger("change:_data_link_", changedAttrs, this._model.get('vtname'), 'rowRefiner');
     }
 };

 DataManager.prototype._readExtraRowRefiner= function() {
    return COMMON.makeObject(this._model.get('dataExtraRefiner'), {});//convert to object
 };

 //extra row refiner will require deep link, so there is no update in this function
 DataManager.prototype._writeExtraRowRefiner =  function(changedExtraRefinerObj) {

     var extraRefiner = this._readExtraRowRefiner(),
         extraValues  = _.values(extraRefiner);
     var orgAttrs = extraRefiner;
     /*
     if(!_.isEmpty(extraRefiner) &&  !_.isEmpty(extraValues[0]) && (extraValues[0]).constructor === Object ){
       orgAttrs = _.union.apply(null, extraValues); //transform conditions from old version
     } else {
       orgAttrs = extraRefiner;
     }
     */
     if(_.isEqual(changedExtraRefinerObj, orgAttrs)) {
       return;
     }

     var myExtraRowRefiner = _.extend(orgAttrs, changedExtraRefinerObj); //overwrite each filter if existed, else copy it
     myExtraRowRefiner = _.pick(myExtraRowRefiner, function(range, column) { //delete null range before save
                                                     return !_.isEmpty(range);
                                                   });

     this._model.set({'dataExtraRefiner': myExtraRowRefiner}, {silent : true});
 };

 DataManager.prototype._readExtraColumnRefiner= function() {
    return COMMON.makeObject(this._model.get('dataExtraSelector'), {});//convert to object
 };

 DataManager.prototype._writeExtraColumnRefiner =  function(changedExtraRefinerObj) { 
     //overwrite each filter
     var myExtraColumnRefinerObj = _.extend(this._readExtraRowRefiner(), changedExtraRefinerObj);
     this._model.set({'dataExtraSelector': myExtraColumnRefinerObj }, {silent: true});
 };

 DataManager.prototype._readColumnRefiner = function() {
   var selector = COMMON.makeObject(this._model.get('dataSelector'), []);
   return (!selector)? selector: selector.slice(0); //clone
 };

 DataManager.prototype._writeColumnRefiner =  function(selector, opts) {
    var options = ( opts ) ? opts : {silent : false };
    if(selector.constructor == Array ) {
      var dataTypes = this.getDataType(),
          numbericColumns = Object.keys(dataTypes).filter(function(column){ return dataTypes[column] == 'number'; });

      if(COMMON.isEqualArray(selector, numbericColumns) ) {
        this._model.set( {'dataSelector': []}, options);
      } else {
        this._model.set( {'dataSelector': selector.slice(0)}, options);
      }

      if(!options.silent) {
         this.updateChart('SELECTOR', selector);
      }
      if(!options.stoplink) {
        this._ctrl.trigger("change:_data_link_", selector, this._model.get('vtname'), 'columnRefiner');
      }
    }
 };

 DataManager.prototype.getVTName = function(){
   return this._model.get('vtname');
 };

 DataManager.prototype._initMapper = function(prop, value) {
  let mappedObjects= COMMON.makeObject(this._model.get('dataMapper'), {});
  if(prop in mappedObjects) return;  //if exist, do not overwrite
   this._model.set('dataMapper',_.extend(mappedObjects, {[prop]: value}), {silent: true});
 }

 DataManager.prototype._readMapper = function() {
    let mappedObjects= COMMON.makeObject(this._model.get('dataMapper'), {});//convert to array
    for(let prop in mappedObjects) {
      if(mappedObjects.__reverse__ && prop !=='__reverse__' && mappedObjects.__reverse__.indexOf(prop)>=0 ) {
        mappedObjects[prop] =  _.difference(Object.keys(this.getDataType()), mappedObjects[prop]);
      }
    }
    return mappedObjects;
 };

 DataManager.prototype._writeMapper =  function(prop, value, options={silent: false}) {
   let mappedObjects= COMMON.makeObject(this._model.get('dataMapper'), {});//convert to array

    //clear old value
    if(prop in mappedObjects) {
      delete mappedObjects[prop];
    }
    if(mappedObjects.__reverse__) {
      let index = mappedObjects.__reverse__.indexOf(prop);
      if (index > -1) {
        mappedObjects.__reverse__.splice(index, 1);
        if(mappedObjects.__reverse__.length<=0) {
          delete mappedObjects.__reverse__;
        }
      }
    }

    if(value === null ) { //null: all column, undefined: not selected(signle), []: not selected(multi)
      mappedObjects[prop] = [];
      if(mappedObjects.__reverse__) {
        mappedObjects.__reverse__.push(prop);
      }else{
        mappedObjects.__reverse__= [prop];
      }
    } else {
      let columns = Object.keys(this.getDataType());
      if(Array.isArray(value) && value.length >50 && value.length > columns.length/2) {
        mappedObjects[prop] = _.difference(columns,value);
        if(mappedObjects.__reverse__) {
          mappedObjects.__reverse__.push(prop);
        }else{
          mappedObjects.__reverse__= [prop];
        }
      } else {
        mappedObjects[prop] = value;
      }
    }
   this._model.set('dataMapper',mappedObjects, options);
    if(options && !options.silent ) {
      this.updateChart('MAPPER', {[prop]: value});
    }
 };

 DataManager.prototype._readHighlightRefiner = function() {
    return  COMMON.makeObject(this._model.get('hybridRefiner'), {});//convert to array
 };

 DataManager.prototype._writeHighlightRefiner =  function(changedAttrs, opts) {
   var options = ( opts ) ? opts : {silent : false} ;
   this._model.set('hybridRefiner',  changedAttrs, {silent: (options && options.silent!==undefined)? options.silent: true});
   this._model.save(null, {patch: true});  //bug: do not save set values because the chart is not updated !
   if(!options || !options.stoplink) {
      //trigger other charts to update
      this._ctrl.trigger("change:_data_link_", changedAttrs, this._model.get('vtname'), 'hybridRefiner');
   }
 };

 DataManager.prototype.setHighlightRefiner =  function(changedAttrs, options) {

  if(changedAttrs ) {
    this._writeHighlightRefiner(changedAttrs, options);

    //delete this following lines because this display mode wont update itself --lxx : 2018/03/15
    /*if(this._isDeepUpdate()){ //self update
      this.execDeepUpdate(changedAttrs);
    }*/
  }
};

 DataManager.prototype.getHighlightRefiner =  function(column) {
   var ret = null, hrefiner = this._readHighlightRefiner();
   if(hrefiner.constructor == Object) {
     if(column) {
      ret = hrefiner[column];
      /* the range will be outside rowrefiner? --lxx: 2018/03/23
       var rrefiner = this.getRowRefiner(column);  
       if(!_.isEmpty(rrefiner)) {
          if(rrefiner[0] >ret[1] || ret[0] > rrefiner[1]  ) {
            ret = null;
          } else {
            ret[0] =  Math.max(ret[0],rrefiner[0]);
            ret[1] =  Math.min(ret[1], rrefiner[1]);
            if(ret[0]>=ret[1]) {
              ret = null;
            }
          }
       }*/
     } else {
       ret = hrefiner;
     }
    } else { //selector
      var selector = this.getColumnRefiner(column);
      if(!_.isEmpty(selector)) {
        ret = _.intersection(hrefiner, selector);
      }
    }
    return ret;
 }

DataManager.prototype.getDataType = function(key) {
    let types = this._getInferData('_dataTypes_', {}),
        table = this.getData();
    /*if (!table || table.length <=0) {
      return {};
    }*/ //delete this in 2018/11/29 by lxx
    if(Array.isArray(table) && table.length >0 && Object.keys(table[0]).length> Object.keys(types).length ) { //no types inside
      this._autoSetDataTypes(table, types);
    }

    return (key)? types[key]: types;
 };

DataManager.prototype.setDataType = function(typesObj, clearOld) {
    if(typesObj) {
      if(clearOld) {
        this._setInferData('_dataTypes_', typesObj);
      } else {
        let types = this.getDataType();
        this._setInferData('_dataTypes_',$.extend(true, {}, types, typesObj));
      }
    }
 };

//not good for performance
DataManager.prototype.getDataRangeWith = function(key, data) {
  let types = this.getDataType();
  if(key in types) {
    if(types[key]=='number') {
      return d3.extent(data.filter(row=> $.isNumeric(row[key])), row=> +row[key]);
    } else {
      return d3.extent(data, row=> row[key]);
    }
  } else {
    return null; //no implementation
  }
};

DataManager.prototype.getDataRange = function(key) {
  let ranges = this._getInferData('_dataRanges_', {});
  if(key) {
    if (key in ranges) {
      return ranges[key];
    } else {
      let table = this.getData();
      if(key in table[0]) {
        ranges = this._autoSetDataRanges(table, ranges);
        return ranges[key];
      } else {
        let types = this.getDataType();
        return (types[key]=='number')?[0, 0]: [];
      }
    }
  } else {
    let table = this.getData();
    if(Array.isArray(table) && table.length >0 && Object.keys(table[0]).length> Object.keys(ranges).length ) {
      ranges = this._autoSetDataRanges(table, ranges);
    }
  }
  return ranges;
};

DataManager.prototype.getDataDiscreteRange = function(key) {
  let ranges = this._getInferData('_dataDiscreteRanges_', {});
  if(key) {
    if (key in ranges) {
      return ranges[key];
    } else {
      let table = this.getData();
      if(key in table[0]) {
        ranges = this._autoSetDataRanges(table, ranges);
        return ranges[key];
      } else {
          let types = this.getDataType();
          return (types[key]=='number' || types[key]=='datetime')?[0, 0]: [];
        }
      }
  } else {
    let table = this.getData();
    if(Array.isArray(table) && table.length >0 && Object.keys(table[0]).length> Object.keys(ranges).length ) {
      ranges = this._autoSetDataRanges(table, ranges);
    }
  }
  return ranges;
};



DataManager.prototype.getDataDatetimeRange = function(key) {
  let ranges = this._getInferData('_dataDatetimeRanges_', {});
  if(key) {
    if (key in ranges) {
      return ranges[key];
    } else {
      let table = this.getData();
      if(key in table[0]) {
        ranges = this._autoSetDataRanges(table, ranges);
        return ranges[key];
      } else {
          let types = this.getDataType();
          return (types[key]!='datetime')?[0, 0]: [];
        }
      }
  } else {
    let table = this.getData();
    if(Array.isArray(table) && table.length >0 && Object.keys(table[0]).length> Object.keys(ranges).length ) {
      ranges = this._autoSetDataRanges(table, ranges);
    }
  }
  return ranges;
};

////

DataManager.prototype.setDataRange = function(rangesNew, clearOldRange) {
  var ranges = rangesNew;
  if(clearOldRange) {
      this._setInferData('_dataRanges_', rangesNew);
    } else {
      var rangesOld = this.getDataRange();
      //do not merge the data ranges?
      this._setInferData('_dataRanges_', $.extend( {}, rangesOld, rangesNew));
    }
    //change coloring domain to new data range
    this._ctrl.colorManager().updateDomain();
};

//need to consider the screen model setup
DataManager.prototype.getTimerTimeout = function() {
  var timeout = this.getTimer('_timeout_');
  if(timeout == undefined || timeout <=0) {
    var timeout_default = this._screen.get('timeout');
    if(timeout_default !== undefined) {
      timeout = timeout_default;
    }
  }
  return (timeout_default == undefined)? 0: timeout;
}

DataManager.prototype.getTimerInterval = function() {
  var interval = this.getTimer('_interval_');
  if(interval == undefined || interval <=0) {
    var interval_default = this._screen.get('interval');
    if(interval_default !== undefined) {
      interval = interval_default;
    }
  }
  return (interval == undefined )? 0: interval;
}

DataManager.prototype.getTimer = function(key) {
    var timer = COMMON.makeObject(this._model.get('timer'), {});
    if(key) {
      return (timer.hasOwnProperty(key))? timer[key] : 0;
    }
    return timer;
};

DataManager.prototype.setTimer = function(timerObj) {
    if(timerObj) {
      this._model.save('timer',$.extend(true, {}, this.getTimer(), timerObj)); //save immediately
    }
};

/*initialize data mappering properties*/
DataManager.prototype.setMapperProps = function() {
      var self = this, mapper_id = '_$mapper_props_';
      if(arguments.length ==1  && arguments[0].constructor== Object) {
        this.setExtData(mapper_id, arguments[0]); //reference
        _.each(arguments[0], function(item, key) {
          if(item.map2 !== undefined && _.isEmpty(self.getMapper(key))) {
            self._initMapper(key, item.map2);
          }
        });
      }
      else if(arguments.length >=2 && arguments[0].constructor== String) {
        var obj ={};
        obj[arguments[0]] = arguments[1];
        this.setExtData(mapper_id, obj); //reference values

        var item  = arguments[1];
        if(item.map2 !== undefined && _.isEmpty(self.getMapper(arguments[0]))) {
          self._initMapper(arguments[0], item.map2);
        }
      }
 };

DataManager.prototype.getMapperProps = function(prop) {
      var self = this,
          mapper_id = '_$mapper_props_',
          value,
          dataMapper = $.extend(true, {}, this.getExtData(mapper_id));//deep clone
      if(prop) {
        value = self.getMapper(prop);
        if(value !== undefined) { //!important: null value is acceptable
          dataMapper[prop].map2 = value;
        }
        return dataMapper[prop];
      } else {
        _.each(dataMapper, function(item, iprop){
            value = self.getMapper(iprop);
            if(value !== undefined) { //!important: null value is acceptable
                item.map2 = value;
            }
        });
        return dataMapper;
      }
 };

/* change row refiner with conditions from server (worker) */
DataManager.prototype.setRowRefinerFromServer = function(refiner) {
  //var dataTypes = this.getDataType();
  if(!_.isEmpty(refiner)) {
    if(refiner.constructor !== Object) {
      refiner = JSON.parse(refiner)
    }
    if(refiner.constructor == Object) {
        this._writeRowRefiner(refiner, { silent: true } );
    }
  }
};

DataManager.prototype.setRowRefiner = function() {

      var dataTypes = this.getDataType(),
          hasRendered = this._ctrl.hasRendered();

      if(arguments.length <=0) return;

      if(arguments[0].constructor == Object) {
        var toBeAdded = _.pick(arguments[0],  _.keys(dataTypes));
        //only set existed attributes
        if(!_.isEmpty(toBeAdded)) {
          if(this._ctrl.highlight()) {
             this.setHighlightRefiner(toBeAdded, { silent: !hasRendered } );
           } else {
             this._writeRowRefiner(toBeAdded, { silent: !hasRendered } ); //the general 'change' event is triggered
           }
        }
      } else if( _.has(dataTypes, arguments[0]) && arguments.length >1 ) { //(column, range)
           var obj = {};
           obj[arguments[0]] = arguments[1];
           if(this._ctrl.highlight()) {
              this.setHighlightRefiner(obj, { silent: !hasRendered } );
           } else {
              this._writeRowRefiner(obj, { silent: !hasRendered });// general 'change' event isn't triggered
           }
      }
  };

DataManager.prototype.getRowRefiner = function(column) {
    var ret = [], refiner = this._readRowRefiner();
    if(column) {
      if (_.has(refiner, column)){
            ret = refiner[column];
      }
    } else {
        ret = refiner;
    }
    return ret;
};

//set design attributes or control attributes
DataManager.prototype.setColumnRefiner = function() {
    if(arguments.length >0 && arguments[0].constructor == Array) {
       var selector = [],
         dataTypes = this.getDataType(),
         hasRendered = this._ctrl.hasRendered();
        selector = _.intersection(arguments[0], this.getMappedColumns()); //this.getMappedArrayColumns());
        if(!_.isEmpty(selector)) {
          this._writeColumnRefiner(selector, {silent: !hasRendered} );
        }
    }
};

DataManager.prototype.getColumnRefiner = function() {
      var retColumns = this._readColumnRefiner();
      if(_.isEmpty(retColumns)) { //return all mapped columns
        retColumns = this.getMappedColumns(); //this.getMappedArrayColumns();
      } else {
        retColumns= _.intersection(retColumns, this.getMappedColumns()) || [];
      }
      return retColumns;
};

DataManager.prototype.setValue = function (){
     if(arguments.length <=0) return;

     if(arguments[0].constructor !== Array) {
        this.setRowRefiner.apply(this, arguments);
     } else {
        this.setColumnRefiner.apply(this, arguments);
     }
};

DataManager.prototype.getValue = function (key){
     if(key) {
         this.getRowRefiner(key);
     } else {
         this.getColumnRefiner();
     }
};

 DataManager.prototype.getMapper = function(key) {
    var ret =null, mapper = this._readMapper();//convert to array
    if(key) {
        ret = mapper[key];
    } else {
        ret = mapper;
    }
    return ret;
 };

 DataManager.prototype.setMapper = function() {

   var mapperProps = this.getMapperProps(),
       hasRendered = this._ctrl.hasRendered();
   if(arguments.length <=0) return;
   if(arguments[0].constructor == Object) {
      toBeAdded = _.pick(arguments[0],  _.keys(mapperProps));
      if(!_.isEmpty(toBeAdded)) {
        let key = _.keys(toBeAdded)[0];
        this._writeMapper(key, toBeAdded[key], { silent: !hasRendered } ); //the general 'change' event is triggered
      }
   } else
   if( _.has(mapperProps, arguments[0]) ) { //(column, range)
      this._writeMapper(arguments[0], arguments[1], { silent: !hasRendered });// general 'change' event isn't triggered
   }
 };

 DataManager.prototype.getPrimaryKeyColumns = function(chartSize) {
   var self=this,
       pksObj = {},
       sizeObj = chartSize,
       mapperProps = this.getMapperProps();

   for (let key in mapperProps) {
     var nameOfSize = mapperProps[key].spk;
     if( nameOfSize ) {
       var columns = self.getMapper(key),
           scale = +self._ctrl.designManager().getValue('scale');
        if(Array.isArray(columns)) {
          for(let column of columns) {  
            if((!isNaN(+nameOfSize) && isFinite(nameOfSize) )) {
              pksObj[column] = +nameOfSize;
              if(scale && scale > 0.0001) {
                pksObj[column] = Math.round(pksObj[column]/scale);
              }
            } else if(sizeObj[nameOfSize]) {
              pksObj[column] = sizeObj[nameOfSize]; 
              if(scale && scale > 0.0001) {
                pksObj[column] = Math.round(pksObj[column]/scale);
              }
            }
          }//for end
       }
       else { //single column mapping
         if((!isNaN(+nameOfSize) && isFinite(nameOfSize) )) { //
           pksObj[columns] = +nameOfSize;
          
           if(scale && scale > 0.0001) {
             pksObj[columns] = Math.round(pksObj[columns]/scale);
           }
           
         } else if(sizeObj[nameOfSize]) {
           pksObj[columns] = sizeObj[nameOfSize];
           if(scale && scale > 0.0001) {
             pksObj[columns] = Math.round(pksObj[columns]/scale);
           }
         }
       }
     } //else >> hasn't spk parameter
   }//for end
   return pksObj;
 };

DataManager.prototype.getGroupByColumns = function() {
   var columns = this.getMapper('groupby'); //get map2 property value of groupby
   if(columns) { //have group props
      if(Array.isArray(columns)) {
        return columns;
      } else {
        return [columns];
      }
    } //else >> hasn't groupby parameter
   return null;
};

//get data-mapped or color-mapped columns if not-existed in client
DataManager.prototype.getRenderingColumns = function() {
   var columns = [];
       colorManager= this._ctrl.colorManager(),
       colorDomainName= colorManager.getDomainName();
    //first is the color domain column
    if(colorManager.isColumnDomain(colorDomainName) ){
        columns= [colorDomainName];
    }
    columns = _.union(columns, _.keys(this._readRowRefiner()), this._readColumnRefiner(), this.getMappedColumns() ); //coloring column + mapper columns + refinedColumns

   return columns;
};

DataManager.prototype.getRequestColumns = function() {
  if(_.isEmpty(this.getMapperProps()) ){
    return '*'; //select all data columns
  }
  return this.getRenderingColumns();
};
//when option in data-mapping or color-mapping
DataManager.prototype.isCachedColumn = function(column) {
  var data = this.getData();
  
  if(data === undefined) {
      return false;
   }
  var row0 = data[0];
  return row0.hasOwnProperty(column);
};

DataManager.prototype.clearAll = function() { 
     this.clearData();
     this._model.set({'dataRefiner': {},
                      'dataSelector': [],  //select all mapped array columns
                      'dataExtraRefiner': {},
                      'dataExtraSelector': {},
                      'hybridRefiner': {},
                      'dataMapper': {},
                      'timer': {}
                      });
 };

DataManager.prototype.clearFilter = function(opts) {
  var options = ( opts ) ? opts : {silent : false, stoplink: false} ;
  this._model.set({ 'dataRefiner': {},
                    'dataSelector': [], //select all mapped array columns
                    'dataExtraRefiner': {},
                    'dataExtraSelector': {},
                    'hybridRefiner': {}
                  }, opts);
  if(!options.silent) {
    this.updateChart('REFINER', {});
  }
  if(!options.stoplink ) {
    this._ctrl.trigger("change:_data_link_", {}, this._model.get('vtname'), 'clear');
  }
};

DataManager.prototype.undoRedo = function(isUndo) {
  let statusObj = this._model.changedAttributes();//target status
  
  if('dataRefiner' in statusObj) {
    let currentAttrs = statusObj['dataRefiner'];
    if(currentAttrs.constructor == String) { currentAttrs = JSON.parse(currentAttrs);}

    let preAttrs = this._model._previousAttributes['dataRefiner']; //previous status
    if(preAttrs.constructor == String) { preAttrs = JSON.parse(preAttrs);}
    for(k in preAttrs) {
      if(!(k in currentAttrs)){
        currentAttrs[k] = [];
      }
    }
    this.updateChart('REFINER', currentAttrs);
    this._ctrl.trigger("change:_data_link_",  currentAttrs, this._model.get('vtname'), 'rowRefiner');
  }

  if('dataSelector' in statusObj) {
    this.updateChart('SELECTOR', statusObj['dataSelector']);
    this._ctrl.trigger("change:_data_link_",  statusObj['dataSelector'], this._model.get('vtname'), 'columnRefiner');
  }
  
  if('hybridRefiner' in statusObj) {
    let currentAttrs = statusObj['hybridRefiner'];
    if(currentAttrs.constructor == String) { currentAttrs = JSON.parse(currentAttrs);}

    let preAttrs = this._model._previousAttributes['hybridRefiner']; //previous status
    if(preAttrs.constructor == String) { preAttrs = JSON.parse(preAttrs);}
    for(k in preAttrs) {
      if(!(k in currentAttrs)){
        currentAttrs[k] = [];
      }
    }
    //do not update chart here
    this._ctrl.trigger("change:_data_link_", currentAttrs, this._model.get('vtname'), 'hybridRefiner');
  }
}

DataManager.prototype.setExtData = function(key, value) {
  var ext = this._data._ext_;
  if(!ext) { 
      this._data._ext_ = ext = {};
  }
  ext[key] = value;
}

DataManager.prototype.getExtData = function(key, initValue) {
  var ext = this._data._ext_;
  if(!key) {
     return ext;
  }
  if(!ext.hasOwnProperty(key)) {
    return initValue;
  }
  return ext[key];
}

DataManager.prototype._setInferData = function(key, value) {
  var infer = this._data._infer_;

  if(!infer) {
    this._data._infer_ = infer = {};
  }
  infer[key] = value;
};

DataManager.prototype._getInferData = function(key, initValue) {
     var infer = this._data._infer_;
     if(!key) {
        return infer;
     }
     if(!infer.hasOwnProperty(key)) {
       return initValue;
     }
     return infer[key];
 };

DataManager.prototype.clearData = function(key) {
    var self = this;
    if(key) {
      if (this._data.hasOwnProperty(key) ){
        delete this._data[key];
      }
    } else {
        for(let ikey in this._data){
          if(ikey != '_ext_') { //avoid clear chart mappprops
            delete self._data[ikey];
          }
        }
        this._data._default_table_key_='_table_';
        this._data._infer_= {};
    }
 };

DataManager.prototype.setData = function(key, value) {
   var skey = (!key)? this._data._default_table_key_ : key;
   delete this._data[skey];
   this._data[skey] = value;
   console.log(this._data)
};

DataManager.prototype.getData = function(key, initValue) {
  var skey = (!key)? this._data._default_table_key_ : key;
     if(!skey || !this._data[skey]) {
       return initValue;
     }
     /*
     if(_.isEmpty(this._data[skey]) && this._data['_ason_']){
       let ason = this._data['_ason_'],
           columns = Object.keys(ason),
           len = ason[columns[0]].length, //rows number
           arr = new Array(len);
       for(let i=0; i<len; i++) {
         arr[i] = {};
         for (let column of columns) {
           arr[i][column] = ason[column][i];
         }
       }
       return arr;
     }*/
     return this._data[skey];
 };

DataManager.prototype.hasData = function() {
   return this.getData() !== undefined;
 };

DataManager.prototype.getTemplate = function() {
   return this.getData('_template_');
 };


DataManager.prototype.isActiveRow = function(row, filterset) {
    var bHighlight = true, //coloring is  the default status
        dataTypes = this.getDataType();

    var range, value; //the filter conditions
    for(var column in filterset) {
      range = filterset[column];
      if(range && column in dataTypes && column in row) {
         if(dataTypes[column]=='number') {
            value = +row[column];
            if(value< +range[0] || value > +range[1]){
                bHighlight = false;
                break;
            }
     } else if(dataTypes[column]=='datetime') {
             value = row[column];
             var datetime_range = [new Date(range[0]), new Date(range[1])];
       if(value < datetime_range[0] || value > datetime_range[1]){
                bHighlight = false;
                break;
       }
         } else {
             value = row[column];
             if(range.indexOf(value) <0 ) {
                bHighlight = false;
                break;
             }
         }
      }
    }
    return bHighlight;
 };

DataManager.prototype.getFilteredColumns = function () {
   
   var refinedColumns = this.getColumnRefiner(),
       mappedColumns  = this.getMappedColumns();
   
   return (this._ctrl.fullrange())? mappedColumns : _.intersection(refinedColumns, mappedColumns);
 };
   
DataManager.prototype.getFilteredRows = function (extenalData) {
    var self = this,
        table = (extenalData)? extenalData: this.getData(),
        filtedRows = table; //initialized value
   
    if(!this._isDeepUpdate() && !this._ctrl.fullrange() && !_.isEmpty(filtedRows)) {
        var refiningObject = this.getRowRefiner(),
            dataTypes = this.getDataType();
        filtedRows = filtedRows.slice(0);
        //Object.keys(refiningObject).forEach(function(column) { 
        for(let column in refiningObject) {
            var range = refiningObject[column], value;
            if(!range || range.length<=0) continue;

            if(dataTypes[column] ==='number') {
              range = [+range[0], +range[1]];
              filtedRows = filtedRows.filter(function(d) {
                value = +d[column];
                return  (value >= range[0] && value <= range[1]) ;
              });
            }
            else if(dataTypes[column] ==='datetime') {
              range = [new Date(range[0]), new Date(range[1])];
              filtedRows = filtedRows.filter(function(d) {
                value = d[column];
                return (value >= range[0] && value <= range[1]);
              });
            }
            else {
              filtedRows = filtedRows.filter(function(d) {
                value = d[column];
                return (range.indexOf(value) >=0) ;
              });
            }
        };
    }
    return filtedRows;
 };

DataManager.prototype.getAxisRange = function(key, isHighlightMode) {
    var range = (isHighlightMode) ?  this.getDataRange(key): this.getRowRefiner()[key];
    if (range == undefined) {
      range = this.getDataRange(key);
    }
    return range;
};

DataManager.prototype.getMappedColumns = function(key) {
     var columns = [], mapper = this._readMapper();
     for(let prop in mapper) {
       if(prop == '__reverse__') continue;//this is not a column
       if(!_.isEmpty(mapper[prop])) {
         if(mapper[prop].constructor == String) {
           columns = _.union(columns, [mapper[prop]] );
         } else {
           columns = _.union(columns, mapper[prop] );
         }
       }
     }
     return columns;
 };
/*
DataManager.prototype.getMappedArrayColumns = function(key) {
     var columns = [], mapper = this._readMapper();
     for(var prop in mapper) {
       if(!_.isEmpty(mapper[prop]) && mapper[prop].constructor == Array) {
         return mapper[prop];
       }
     }
     return [];
 };
*/
DataManager.prototype._autoSetDataTypes = function(table, types) {
    var self=this;
    if(table.length > 0) {
      var BreakException={};
      for(let key in table[0]) {
        if(!types.hasOwnProperty(key)) { //only computing unknown types
          types[key] = 'number';
          try {
            for(let row of table) {
              if(isNaN(+row[key])) {
                throw BreakException;
              }
            }//for end
          } catch(e) {
            if(e == BreakException) types[key] = 'string';
            else throw e;
          }
        }
      }//for end
    }
    this._setInferData('_dataTypes_',types);
    return types;
  };

  DataManager.prototype._autoSetDataRanges = function(table, ranges){
   var dataTypes = this.getDataType();
   if(table.length > 0) {
      for( let column in dataTypes) {
        if(!ranges[column]) { //only computing unknown ranges
          if(dataTypes[column] === 'number') {
            ranges[column] = d3.extent(table.reduce((newArr, row)=>{
                                            let val = row[column];
                                            if(val && isFinite(val)){
                                              newArr.push(+val);
                                            }
                                            return newArr;
                                          },[])
                                      );
          } else {
            ranges[column] = table.reduce((newArr, row)=>{
              let val = row[column];
              if(val && val.length>0 && newArr.indexOf(val)<0){
                newArr.push(val);
              }
              return newArr;
            },[]).sort();
          }
        }
      } //for end
   }
   this._setInferData('_dataRanges_', ranges);
   return ranges;
 };

 //initialize data mapping and refiner/selector : delete it???
 DataManager.prototype._autoSetDataMapper = function(dataTypes) {
    var self=this,
        BreakException={},
        mapperProps = this.getMapperProps();
  
    //initialize mapper
    if(mapperProps && _.isEmpty(this.getMapper()) ) {
        for(let prop in mapperProps) {
            try{
                for(let column in dataTypes) {
                  if( _.isEmpty(mapperProps[prop].map2) && dataTypes[column] == mapperProps[prop].type ) {
                      if(Array.isArray(mapperProps[prop].map2)) { //ES5 have Array.isArray
                          self.setMapper(prop, [column]); //set init value
                          throw BreakException;
                      } else {
                          self.setMapper(prop, column);
                          throw BreakException;
                      }
                  } //if end
                }//forEach end
            } catch(e) {
                if(e == BreakException){ /*isUpdate = true;*/ }
                else throw e;
            }
        } //forEach end
    }
  };
  
 /**
   * This function will validate input data for drawing chart.
   * If data is validate, chart will be drawn.
   * @returns {Boolean}
   */
  DataManager.prototype.validate = function () {
    var mapperProps = this.getMapperProps();
    if(mapperProps && typeof(mapperProps) == 'object') {// return true if the _chart_ is not set.
      var BreakException={};
      try{
        for(let prop in mapperProps) {
          if(mapperProps[prop].map2 === undefined ) {
            throw BreakException;
          }
        }
      }catch (e) {
        if(e == BreakException ) return false;
      }
    }
    return true;
  };
  
  //not used?
  DataManager.prototype.getQueryObject = function () {
    var query = {},
        where = this.getRowRefiner(),
        select = this.getColumnRefiner();
    
    if(!_.isEmpty(where)) {
      query._where_ = where;
    }
    
    if(!_.isEmpty(select)) {
      query._select_ = select;
    }
    
    query._highlight_ = this._ctrl.fullrange();
    return query;
  };
  
  //get virtual table data from server, 'options' is parameters for filtering data
  DataManager.prototype.getDataFromServer = function(query_options, deferred) {
    const self = this;
    this._ctrl.dataLoadStatus("loading:start");

    let startTime = new Date().getTime();
    let type = 'binary';
    query_options.dataFilter = function(mydata, mytype) {
      type = mytype;
      return mydata;
    };
    self._ajax= $.ajax(query_options).done(function (data) {
          let fileReader = new FileReader();
          fileReader.onload = function(event) {
            try {
              //console.log(event.target.result.slice(0,100));
              let jsondata = msgpack.decode(new Uint8Array(event.target.result));//JSON.parse(event.target.result);
              $.each(jsondata, function(key, value) { //data: {key:value,...}-- key='_data_', value is  {format:.., filled:}
                if(key && key ==='_error_') {
                  value && console.error(value);
                }
                else
                if(value && value.format==='_error_') {
                  value.filled && console.error(value.filled);
                  return false; //break
                }
                else
                if(key ==='_template_') {
                  self._ctrl.analysisManager().setTemplate(value);
                  return true; //continue
                }
                else
                if(!value.format) {
                  self.setData(key, value);
                }
                else
                if(value.format==='csv') {
                  if(value.binary) {
                    self.setData(key, d3.csv.parse(value.filled.toString('utf8')));
                  } else {
                    self.setData(key, d3.csv.parse(value.filled));
                  }
                }
                else
                if(value.format==='tsv'){
                  if(value.binary) {
                    self.setData(key, d3.tsv.parse(value.filled.toString('utf8')));
                  } else {
                    self.setData(key,d3.tsv.parse(value.filled));
                  }
                }
                else
                if(value.format==='msgpack'){
                  self.setData(key, msgpack.decode(value.filled) );
                }
                else
                if(value.format==='json') {
                  if(typeof(value.filled) === "string") {
                    self.setData(key,JSON.parse(value.filled));
                  } else {
                    self.setData(key, value.filled);
                  }
                }
                else {
                  self.setData(key, value.filled);
                }
                if(value.mappable || key==='_table_') {
                  //in the current implementation, the widget constructor have been executed here!
                  self._setInferData('_default_table_key_', key);
                  value.ranges && self._setInferData('_dataRanges_', value.ranges);
                  value.types  && self._setInferData('_dataTypes_',  value.types);
                  value.custom && self._setInferData('_custom_', JSON.parse(value.custom));
                  value.discrete_ranges && self._setInferData('_dataDiscreteRanges_',  value.discrete_ranges);
                  value.datetime_ranges && self._setInferData('_dataDatetimeRanges_',  value.datetime_ranges);
                  value.refiner && self.setRowRefinerFromServer(value.refiner);

                  (value.family!==undefined) && self._setInferData('_family_', value.family);
                  (value.big!==undefined) && self._setInferData('_big_', value.big);
                }
              });
              //save get data time
              self.get_data_time = new Date().getTime() - startTime;
              console.log('Get Data in ' + self.get_data_time + ' milliseconds!');
              self._ctrl.dataLoadStatus("loading:end", 3);//hidden loading icon
              return deferred.resolve();
            }catch (e) {
              self._ctrl.dataLoadStatus("loading:end", -3);  //hidden loading icon
              return deferred.reject(e);
            }
          };
          //first as ArrayBuffer then encoder with MessagePack
          fileReader.readAsArrayBuffer(data);
          //fileReader.readAsText(data);
      }).fail(function( jqXHR, textStatus, errorThrown) {
          self._ctrl.dataLoadStatus("loading:end", -3);  //hidden loading icon
          return deferred.reject(errorThrown);
      });
  };

  /**virtualTable*/
  DataManager.prototype.getDataAsyn = function(virtualTable, screenContext, chartSize) {

      var self = this,
          timeLimit = self.getTimerTimeout(),
          deferred = $.Deferred(),
          conditions = {} ,
          query_options = { type: 'POST',
                            cache: false,
                            dataType: 'binary', //type of sending data?
                            async: true,
                            processData: false,//convert data object to query string or not, default: true
                            contentType: 'application/octet-stream', //type of data to send
                            timeout: (timeLimit>=0)? timeLimit: 0,
                            url: this._dataset_url_root + virtualTable
                          };

      if(_.isEmpty(virtualTable)) {
        self._ctrl.dataLoadStatus("loading:end", 3);//hidden loading icon
        if(self._ctrl.getLocalData(query_options, deferred)) {
          return deferred.resolve();
        } else {
          return deferred.resolve(true);//no data
        }
      }

      if(this._ctrl.loading) {
        return deferred.reject('Data is loading, the reload is skipped!');
      }
      conditions._wvt_ = virtualTable;
      conditions._context_ = $.extend(true, {}, window.framework.context, screenContext);
      conditions._select_  = this.getRequestColumns();
      conditions._extra_select_= this._readExtraColumnRefiner();
      conditions._init_ = _.isEmpty(this.getDataType())? 1: 0;
      //TBD&I: if chart is fullrange mode, the all condtions besides deepColumns' shouldn't be sent to server
      //if(!this._ctrl.fullrange()) {
    if(!this._ctrl.fullrange()) {
          conditions._where_ = this.getRowRefiner(); //COMMON.stringify(this.getRowRefiner());
          conditions._extra_where_ = this._readExtraRowRefiner();
          if(this._ctrl.highlight()) {
             conditions._hybrid_ = this._readHighlightRefiner();
          }
      }

      if(!this._ctrl.analysisManager().isEmpty()) {
        conditions._analysis_ = this._ctrl.analysisManager().getValue();
      }
  
      var spk = this.getPrimaryKeyColumns((chartSize)? chartSize: this._ctrl.chartSize());
      if(!_.isEmpty(spk)) {
        conditions._spk_ = spk;
      }

      var groupby = this.getGroupByColumns();
      if(!_.isEmpty(groupby)) {
        conditions._groupby_ = groupby;
      }

      query_options.data = msgpack.encode(conditions);
      /*if(self._ctrl.getLocalData(query_options)) {
        deferred.resolve();
      } else*/ 
      {
        self.getDataFromServer(query_options, deferred);
      }

      return deferred.promise();
    }; 
  
  //
  DataManager.prototype.checkToPeriodDeepUpdate = function() {
    var interval  = this.getTimerInterval();//also convert undefined to 0
    
    //clear old timer  if existing
    if(this.timerId) { 
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    if(interval >0 ) { //reentry new loop //using the actual_getdata_time
    　　interval = (this.get_data_time && this.get_data_time > 10*interval) ? this.get_data_time: interval ; 
        this.timerId = setTimeout(this.execDeepUpdate.bind(this), interval);
    }
  };
  
  //deep update --simple version
  DataManager.prototype.execDeepUpdate = function(options) {
    var self = this;　
       
       self.getDataAsyn(self._model.get('vtname')).done(
         function(isfull) {
          /*!isfull &&*/ self._ctrl.update({DATA_MANAGER: options});
        }).fail(function(e){
          console.warn(e);
        });
  };

  //deep update data if necessary--simple version
  DataManager.prototype.execUpdate = function(options) {
    if(this._isDeepUpdate()) {
      this.execDeepUpdate(options);
    } else {
      this._ctrl.update(options);
    }
  };
 
  //update chart with changing refining parameters
  DataManager.prototype.updateChart = function(key, options) {
    if(!this.hasData())  return;

    var self=this, vobj = {[key]: options};

    //check whether the data mapping have been setup
    //vobj[key] = options;
    let hasMapping = false;
    for(let prop in this.getMapperProps()) {
       if(!_.isEmpty(this.getMapper(prop)) ) {
          //self._ctrl.update({DATA_MANAGER: {SELECTOR: vobj}}); return;//to delete this line?
         hasMapping = true;
       }
    }
    if(hasMapping )  {
      //true update
      if(this._isDeepUpdate(key, (options.constructor==Array)? options:_.keys(options)) ) {
        //TBD: will the existed data need to be cleared? -- same Virtual Table
        this.getDataAsyn(this._model.get('vtname')).done(
          function(isfull) {
            /*!isfull &&*/ self._ctrl.update({DATA_MANAGER: vobj});
        }).fail(function(e) {
            console.warn(e);
        });
      } else {
        self._ctrl.update({DATA_MANAGER: vobj} );
      }
    } else {
      self._ctrl.update({DATA_MANAGER: vobj} );
    }
  };
  
  DataManager.prototype.isIncompleteData = function() {
    var data = this.getData();
    if(data === undefined) {
      return true;
    }
    var types = this.getDataType(),
        selector_columns = this.getRequestColumns(),
        data_columns = _.keys(data[0]);

    if(selector_columns == '*') {
      selector_columns =  _.keys(types);
    }

    return _.difference(selector_columns, data_columns).length >0 ;
  };

  DataManager.prototype.updateFromColormapping = function(optionsObj, shouldCheckdata) {
     
     var self=this;
     if(shouldCheckdata && /*this._isDeepUpdate() &&*/ this.isIncompleteData()) {
        this.getDataAsyn(this._model.get('vtname')).done(
         function(isfull) {
          /*!isfull &&*/ self._ctrl.update(optionsObj);
        }).fail(function(e) {
            console.warn(e);
        });
     } else {
            self._ctrl.update(optionsObj);
     }
  };
  
  /* link&update related functions  START */
  DataManager.prototype.linkages = function(eventMessage, linked_wvName, mode ) {
    
    if(mode === 'groupby') {
      this._link4Groupby(eventMessage);//set groupby mapper
      this._linkages(eventMessage, linked_wvName, mode);
    }
    else
    if(mode === 'colorby') { //current unused!
      this._ctrl.colorManager()._link4Colorby(eventMessage);
    } 
    else { //general link
      this._linkages(eventMessage, linked_wvName, mode);
    }
  };

  DataManager.prototype._linkages = function(eventMessage, linked_wvName, mode ) {
    var  statusOfLink =this._checkDeepLink(eventMessage, linked_wvName);
    if(this._ctrl.highlight()) { //refiner should be defined by self mode --lxx 2017/12/04
      if(statusOfLink) { //deep update
        this._deepLink4Hybrid(eventMessage, linked_wvName, statusOfLink); //to recode the range??
      } else {
        //skip 
      }
    }
    else
    if(mode == 'rowRefiner' ) { //Row Refiner
      if(statusOfLink) {
        this._deepLink4RowRefiner(eventMessage, linked_wvName, statusOfLink);
      } else {
        this._simpleLink4RowRefiner(eventMessage);
      }
    }
    else
    if(mode == 'columnRefiner' ) { //Column refiner  
      if(statusOfLink) {
          this._deepLink4ColumnRefiner(eventMessage, linked_wvName, statusOfLink);
      } else {
          this._simpleLink4ColumnRefiner(eventMessage);
      }
    }
    else
    if(mode == 'clear') {
      this.clearFilter({silent : false, stoplink: true});
    }
  };

  DataManager.prototype.triggerLink4Groupby =  function(linkedRefiner, opts) {
    if(!opts.stoplink) {
      this._ctrl.trigger("change:_data_link_", linkedRefiner, this._model.get('vtname'), 'groupby');
    }
  };

  DataManager.prototype._link4Groupby =  function(linkedRefiner) { //have not set attributes into this.chart ?

    if( this.getMapper('groupby') !== undefined) { //has defined groupby
        if(_.isEmpty(linkedRefiner)) {
          this.setMapper ('groupby', linkedRefiner);
        }
        else
        if(linkedRefiner.constructor === String &&  _.keys(this.getDataType()).indexOf(linkedRefiner)>=0) {
          this.setMapper ('groupby', linkedRefiner);
        }
        else
        if(linkedRefiner.constructor === Array &&  _.difference(linkedRefiner, _.keys(this.getDataType())).length >0) {
          this.setMapper ('groupby', linkedRefiner);
        }
    }
  };

  //update linked charts with row condtions locally
  DataManager.prototype._simpleLink4RowRefiner =  function(linkedRefiner) { //have not set attributes into this.chart ?
     
      if(!this.bSimpleLinking) {
        this.bSimpleLinking = true;
        var addRowRefiner = _.pick(linkedRefiner, _.keys(this.getDataType()));
        
        if(!_.isEmpty(addRowRefiner) ) {
            if(!_.isEmpty(addRowRefiner)) {
                this._writeRowRefiner(addRowRefiner, {stoplink: true});//considtions of null range will be deleted
            }
        }  
        this.bSimpleLinking = false;
      }
  };
  
  /*update linked charts with row conditions query to server*/
  DataManager.prototype._deepLink4RowRefiner= function(linkedRefiner, linked_wvName, statusOfLink) {
    var self = this;
    
    if(!this.bDeepLinking) {
          this.bDeepLinking = true;
          if(statusOfLink == DEEPLINK.LOCAL) {
            this._writeRowRefiner(linkedRefiner, {silent: true, stoplink: true});
          } else 
          if(statusOfLink == DEEPLINK.WORKER ) {
            var mycolumns = _.keys(self.getDataType());
            var insideAttrs  = _.pick(linkedRefiner, mycolumns);
            var extraAttrs   = _.omit(linkedRefiner, mycolumns);
            if(!_.isEmpty(insideAttrs)) {
              this._writeRowRefiner(insideAttrs, {silent: true, stoplink: true});//overwrite the same condition in local table
            }
            if(!_.isEmpty(extraAttrs)) {
              this._writeExtraRowRefiner(extraAttrs);
            }
          } else { //DEEPLINK.GLOBAL
            this._writeExtraRowRefiner(linkedRefiner);
          }
          
          this.getDataAsyn(this._model.get('vtname')).done(function(isfull) {
                /*!isfull &&*/ self._ctrl.update({DATA_MANAGER: {REFINER: null}});
              }).fail(function(e) {
                console.warn(e);
              }).always(function(){
                 self.bDeepLinking = false;
              });
    }
  };
 
  /*update linked charts with selected columns locally*/
  DataManager.prototype._simpleLink4ColumnRefiner =  function(selector) {
      var self = this;      
      if(!this.bSimpleLinking) {
        this.bSimpleLinking = true;
        var linkedSelector = _.intersection(selector, _.keys(this.getMappedColumns()) );
        this._writeColumnRefiner(selector, {stoplink: true});
        //self._ctrl.update({DATA_MANAGER: {SELECTOR: linkedSelector}});
      }
      this.bSimpleLinking = false;
  };
  
  /*update linked charts with column conditions query to server*/
  DataManager.prototype._deepLink4ColumnRefiner = function(selector, linked_wvName, statusOfLink ) {
     var self = this, obj = {};
     
     if(!this.bDeepLinking) {
       this.bDeepLinking=true;
       
       if(statusOfLink == DEEPLINK.LOCAL) {
         var linkedSelector = _.intersection(selector, _.keys(this.getMappedColumns()) );
         this._writeColumnRefiner(selector, {silent: true, stoplink: true}); //will update after getdata
       } else if(statusOfLink == DEEPLINK.WORKER){
         obj[linked_wvName.split('.').pop()] = selector;
         this._writeExtraColumnRefiner(obj);
       } else if(statusOfLink == DEEPLINK.GLOBAL){
         obj[linked_wvName] = selector;
         this._writeExtraColumnRefiner(obj);
       }

       //TBD: will the existed data need to be cleared? -- same Virtual Table
       this.getDataAsyn(this._model.get('vtname')).done(function(isfull) {
        /*!isfull &&*/ self._ctrl.update({DATA_MANAGER: {SELECTOR: linkedSelector}});
       }).fail(function(e) {
            console.warn(e);
       }).always(function() {
         self.bDeepLinking=false;
       });
     }
  };

  //update linked charts with server query
  DataManager.prototype._deepLink4Hybrid= function(linkedRefiner, linked_wvName, statusOfLink) {
    if(!this.bDeepLinking) {
      this.bDeepLinking = true;
      this._writeHighlightRefiner(linkedRefiner, {silent: true,stoplink: true});
      
      var self = this;
      this.getDataAsyn(this._model.get('vtname')).done(function(isfull) {
        /*!isfull &&*/ self._ctrl.update({DATA_MANAGER: {REFINER: null}});
      }).fail(function(e) {
        console.warn(e);
      }).always(function(){
        self.bDeepLinking = false;
      });
    }
  };
 
  /**
   * A--vt   is the current checking instance
   * B--vt   is the other instances
   * if B.family=[A], then A will show B in its link list
   * vt is specified by wknamme.vtname (if wkname is the same as vtname, then vtname may is omitted 
   */
  DataManager.prototype.isCandidateLinkView = function(otherDataManager) {
     var otherFamily = otherDataManager._getInferData('_family_'),
         wvName = this._model.get('vtname'), //default the the wvName
         blink = false;
     
     if(!_.isEmpty(wvName)) {
        blink = (otherDataManager._model.get('vtname') == wvName) ||
            (otherFamily && otherFamily.indexOf(wvName) >=0) || 
            (otherFamily && otherFamily.indexOf(wvName.split('.')[0])>=0) ||
            (otherFamily && wvName.split('.').length ==1 && otherFamily.indexOf(wvName+'.'+wvName));
     }

    //check the column name to permit wide link inteligently
    if(!blink) {
      var interColumns = _.intersection(Object.keys(this.getDataType()), Object.keys(otherDataManager.getDataType()));
      blink = (interColumns.length >0);
    }

    return blink;
  };

  DataManager.prototype._checkDeepLink = function (linkedMessage, linked_wvName) {
      
      var deepStatus = DEEPLINK.NONE,
          bSelector = (linkedMessage.constructor == Array),
          local_wvName = this._model.get('vtname'),
          family = this._getInferData('_family_');

      if(linked_wvName == local_wvName) { //the same table
        //check whether all columns have its actual data
        var  bret = this._isDeepUpdate(
                    (bSelector)? 'SELECTOR':'REFINER',
                    (bSelector)? linkedMessage: _.keys(linkedMessage)
                 );
        if(bret) {
           deepStatus = DEEPLINK.LOCAL;
        }
      } else { 
        var local_wvArr  = local_wvName.split('.'), 
            linked_wvArr = linked_wvName.split('.');
        if(local_wvArr[0] == linked_wvArr[0] || (local_wvArr.length<=1 && linked_wvArr.length<=1) ) { //share the same worker
          deepStatus = DEEPLINK.WORKER;
        } else 
        if(family && 
            (family.indexOf(linked_wvName) >=0  || 
             family.indexOf(linked_wvArr[0]) >=0 || 
               (linked_wvArr.length === 1 && family.indexOf(linked_wvName+'.'+linked_wvName)>=0)
            )
          ) 
        { //GLOBAL: outside the worker
          deepStatus = DEEPLINK.GLOBAL;
        }
      }
      return deepStatus;
  };
  
  DataManager.prototype._isDeepUpdate = function (subkey, changed_columns) {
    
    var data = this.getData();
    if(data === undefined) return true;

    var isdeep = false,
        big= this._getInferData('_big_');
        //data_columns = _.keys(data[0]),
        //render_columns = this.getRenderingColumns();
    //predefined-condifion -- BIG.COLUMN/BIG.ROW will not use the only-server-columns for coloring
    if(subkey) { //called with changed refiner parameters
      //have all the necessary data been got?
      /*for(let i= render_columns.length; i--;){
         if(!data_columns.includes(render_columns[i])) {
           return true;
         }
      }*/ //delete in 2018/12/3 by lxx -- use big flag
      // For fullrange mode, all necessary data is prepared?, do not update from server
      if(/*this._ctrl.fullrange() ||*/ this._ctrl.insideUpdate()) {  //delete fullrange in 2018/11/30 as to update high dimensions
          return false; 
      } 
      isdeep = !!big;//2019/02/18
      //For drilldown mode:  necessary to update the actual data if table is BIG-ROW/BOTH
      //MAPPER   : necessary to get the actual (&sampled) data  if still not
      //REFINER  : necessary to get the filterd (&sampled) data even if the filtering columns havn't actual data
      //SELECTOR : unnecessary to update the actual data
      /*switch (big) {
        case BIG.COLUMN://all rows have been got
          isdeep = true;//(_.without(changed_columns, data_columns).length >0) && (subkey == 'MAPPER');
          //+ or coloring changed
          break;
        case BIG.ROW://all rows have been got
          isdeep = true;//(subkey == 'REFINER' || subkey == 'ANALYSIS'); //how to set the samping column and accumulated columns?
          //+ or mapper changed or coloring changed ?
          break;
        case BIG.BOTH:
          isdeep = true;//(_.without(changed_columns, data_columns).length >0) && (subkey == 'MAPPER');
          //isdeep = isdeep || (subkey == 'REFINER') || (subkey == 'ANALYSIS');
          break;
        case BIG.NONE: 
          break;
        default: break;
        
      }*/
    } else { //switching MODE
      isdeep = !!big;//(big !== undefined && big > BIG.NONE);
    }
    
    return isdeep;
  };
 
  /* link&update related functions  END */

  DataManager.prototype.setControl = function() {
    //this._ctrl.trigger("change:_show_ctrl_", arguments, this);
    if(arguments.length ==2 && arguments[0].constructor == String && 
       arguments[1].constructor == MouseEvent)
    {  //show row refiner control component
      this._ctrl.trigger("change:_show_ctrl_", arguments[0], arguments[1], this);
    }
    else
    if(arguments.length ==1  && arguments[0].constructor == MouseEvent) 
    { //show column refiner control component
       this._ctrl.trigger("change:_show_ctrl_", "$$$", arguments[0], this);
    }
  };
  
  DataManager.prototype.getControl = function(key) {
  
    const self=this,
        dataTypes = this.getDataType(),
        dataRanges = this.getDataRange();

    let $ctrl=$(), 
        value,
        mappedColumns = this.getMappedColumns(),
        mappedNumberColumns = mappedColumns.filter(function(column){ return dataTypes[column]=='number' ;});
    
    if(key) {
      if(typeof(key) == 'object'){ //for self-defined control //not used
        $ctrl = $('<div>');
        $ctrl.data(key);
        return $ctrl;
      }
      else if(key==="$$$") { //one column refiner control component 
        $ctrl = $('<div>');
        $ctrl.data( { type: 'selection',
                     range: mappedNumberColumns,
                     value:  this.getColumnRefiner()
                   });
        return $ctrl;
      } else {  //one row refiner control component
        value = this.getRowRefiner(key);
        if(_.isEmpty(value)) {
          value = dataRanges[key];
        }
        $ctrl = $('<div>', {id: key});
        if(dataTypes[key] === 'number' ) { //slider
          $ctrl.data({type: 'slider', range: dataRanges[key], value: value});//TD: get current value
        } else 
        if(dataTypes[key] === 'datetime') { //slider
          $ctrl.data({type: 'dateslider', range: dataRanges[key], value: value});//TD: get current value
        } 
        else {
          $ctrl.data({type: 'selection', range: dataRanges[key], value:  value}); 
        }
        return $ctrl;
      }
    } //key is not null
    else  {
      
      var $control_array = $('<div>');
      
      //set controls for mapped columns
      for(let column of mappedColumns) {
        $ctrl = $('<div>', {id: column});
        if(dataTypes[column] === 'number') { //slider
          value = self.getRowRefiner(column);
          $ctrl.data({type: 'slider', range:dataRanges[column], value: (value)? value: dataRanges[column]});
        } else
        if( dataTypes[column] === 'datetime') { //slider
          value = self.getRowRefiner(column);
          $ctrl.data({type: 'dateslider', range:dataRanges[column], value: (value)? value: dataRanges[column]});
        }  
        else { //multi selection
          value = self.getRowRefiner(column);
          $ctrl.data({type: 'selection', range:dataRanges[column], value: (value.length>0)? value: dataRanges[column]});
        }
        $control_array.append($ctrl);    
      }
      
      //set columnRefiner control if possible
      //if(mappedArrayColumns.length > 0) 
      {
        $ctrl = $('<div>');
        value = this.getColumnRefiner();
        $ctrl.data({ type: 'selection', 
                    range: mappedColumns,
                    value: value});
        $control_array.append($ctrl);
      }
      
      //set controls for unmapped columns
      for(let column in dataTypes) {
        if(mappedColumns.indexOf(column) >=0) continue;
      //_.keys(dataTypes).filter(function(column){ return mappedColumns.indexOf(column) <0;}).forEach( function(column) {
        $ctrl = $('<div>', {id: column});
        if(dataTypes[column] === 'number') { //slider
          value = self.getRowRefiner(column);
          $ctrl.data({type: 'slider', range:dataRanges[column], value: (value)? value: dataRanges[column]});
        }
        else 
        if(dataTypes[column] === 'datetime') { //slider
          value = self.getRowRefiner(column);
          $ctrl.data({type: 'dateslider', range:dataRanges[column], value: (value)? value: dataRanges[column]});
        }  
        else { //multi selection
          value = self.getRowRefiner(column);
          $ctrl.data({type: 'selection', range:dataRanges[column], value: (value.length>0)? value: dataRanges[column]});
        }
        $control_array.append($ctrl);    
      }
      
      return $control_array.children();
    }
  };
  
  return DataManager;
});
