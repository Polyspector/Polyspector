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
define(['ctrl/COMMON'], function (COMMON) {
  var ColorManager = function (ctrl) {
     this._model = ctrl.board_model; //colorDomain //colorTheme //colorIndex //colorDomainName //colorRange
     this._ctrl  = ctrl; //chart control
     this._themeColors = { //fixed color sets inside system
       'd3.category20': d3.scale.category20().range(),
       'd3.category10': d3.scale.category10().range(),
       'd3.category20c': d3.scale.category20c().range(),
       'd3.category20b': d3.scale.category20b().range(),
       '20set': [
         "#3366cc", "#dc3912", "#ff9900",
         "#109618", "#990099", "#0099c6",
         "#dd4477", "#66aa00", "#b82e2e",
         "#316395", "#994499", "#22aa99",
         "#aaaa11", "#6633cc", "#e67300",
         "#8b0707", "#651067", "#329262",
         "#5574a6", "#3b3eac"
       ],
       '4sets': [
         "#f17673","#f29006","#62c462","#6bc6e1"
       ]
     };
     this._MAX_ITEMS_NUM = 300;
     this._defaultTheme = 'd3.category10'; //user inputed value
     this._defalutColor = "#555";
     this._defaultColorSeparator = [];//[0.2, 0.4, 0.6, 0.8];
     this._typeOfColorColumn = null;
     this._extentType = undefined;
 };

  ColorManager.prototype.clearAll = function() {
     this._model.set({ 'colorIndexes': {},
                       'colorTheme': '',
                       'colorDomainName': '',
                       'colorDomain': []
                     }, {silent: true});
     this._ctrl.trigger("change:_save_model_");
  };

  //get the colorset list to show combox
  ColorManager.prototype.getThemes = function(){
      return Object.keys(this._themeColors);
  };

  ColorManager.prototype.getTheme = function(){
     var theme = this._model.get('colorTheme');
     if(_.isEmpty(theme) || !_.has(this._themeColors, theme)) {
         theme = this._defaultTheme;
     }
     return theme;
  };

  /*
  ColorManager.prototype.getSeparator = function(){
    var colorSeparator = this._model.get('colorSeparator');

    colorSeparator = COMMON.makeObject(colorSeparator, this._defaultColorSeparator);

    if(_.isEmpty(colorSeparator)) {
        colorSeparator = this._defaultColorSeparator;
    }

    return colorSeparator;
  };

  ColorManager.prototype.setSeparator = function(arr) {
    var bDirty=false,
        origSeparator = this.getSeparator();

    if(!COMMON.isEqualArray(origSeparator, arr) && !_.isEmpty(arr)) {
       this._model.set('colorSeparator', arr);
       bDirty = true;
    }
    return bDirty;
  };
  */

  //set the use selected theme
  //if return not null, trigger event to chart to inofrm changing of the whole colormap
  ColorManager.prototype.setTheme = function(selectedTheme){
     var bDirty=false, theme = this.getTheme(),
         themeIndex = Object.keys(this._themeColors).indexOf(selectedTheme);
     if(theme != selectedTheme && themeIndex >= 0) {
         this._model.set('colorTheme', selectedTheme);
         this._model.set('colorIndexes', {}); //reset _colorIndexes
         bDirty = true;
     }
     return bDirty;
  };

  //get colorset to show the color list in user interface
  ColorManager.prototype.getThemeColors = function() {
      var colors= [], theme = this.getTheme();
      return this._themeColors[theme];
  };

  //the function is used for setting start or end color or number domain
  ColorManager.prototype.setColorIndex = function(indexOfStartOrEnd, color) {
    var theme = this.getTheme(),
    colorIndex = this._themeColors[theme].indexOf(color),
    colorIndexes = COMMON.makeObject(this._model.get('colorIndexes'), {});
    if(colorIndex >=0  && (indexOfStartOrEnd === 0 || indexOfStartOrEnd == 1 ) ){
      colorIndexes[indexOfStartOrEnd] = colorIndex;
      this._model.set('colorIndexes', colorIndexes);
    }
  };

  //set colorIndex when  user select or change the color mapping to an item
  //--- trigger event to chart to inform the change of one color in colormap
  ColorManager.prototype.setColor = function(itemValue, color) {
    var items = this.getDomain(),
        itemIndex = items.indexOf(this.isNumberDomain()? +itemValue : itemValue),
        colorIndexes = COMMON.makeObject(this._model.get('colorIndexes'),{}),
        theme = this.getTheme(),
        colorIndex = this._themeColors[theme].indexOf(color);

    if(itemIndex <0 ) return false;

    if(itemIndex != colorIndex) {
        if(colorIndexes[itemIndex] != colorIndex) { //add index to colorIndexes
            colorIndexes[itemIndex] = colorIndex;
        } //else the colorIndex has been set up
    } else {  //the natural number order such as {1:1,2:2,4:4,5:5}
        delete colorIndexes[itemIndex];
    }
    this._model.set('colorIndexes',colorIndexes);
    return true;
  };

  //get color<>item object to show the current color mapping status in user interface
  ColorManager.prototype.getColormap = function() {
    var domain = this.getDomain();
    if(!domain || domain.length <=0 ) return {};
    var colormap = {},
        colorIndexes = COMMON.makeObject(this._model.get('colorIndexes'),{}),
        colorDomainName = this.getDomainName(),
        colorIndex=-1;

    var colors = this.getThemeColors();

    if(this.isLinearDomain())  { domain = domain.slice(0,2); } //reduce memory
    for(let itemIndex=0; itemIndex<domain.length; itemIndex++) {
        let item = domain[itemIndex];
    //domain.forEach(function(item, itemIndex) { //the items have been defined
       if(_.isEmpty(colorIndexes) ) { //defalut color setting :colorIndex = itemIndex, user have not defined color
           colormap[item] = colors[itemIndex % colors.length];
       } else if((colorIndex = colorIndexes[itemIndex]) >=0 ) { //user defined color<>item mapping
           colormap[item] = colors[colorIndex];
       }  else { //colorIndex < 0 : natural number order of the defined color
           colormap[item] = colors[itemIndex % colors.length];
       }
    }

    return colormap;
  };

  //get the color of a given item from themeColors
  //if domain has not been set, the default coloring will be used
  ColorManager.prototype.getColor = function(itemName){
     var color = this._defalutColor,
         items = this.getDomain(),
         itemIndex = items.indexOf(itemName),
         theme = this.getTheme(),
         colors = this.getThemeColors(),
         colorIndexes = COMMON.makeObject(this._model.get('colorIndexes'),{}),
         colorIndex = -1;

     if(itemIndex >= 0 ) { //known item
        if(_.isEmpty(colorIndexes) ) { //defalut color setting :colorIndex = itemIndex
            color = colors[itemIndex % colors.length];
        } else {  //user defined itemIndex<-->colorIndex mapping
            colorIndex = colorIndexes[itemIndex];
            if(colorIndex >= 0 ) {
                color = colors[colorIndex]; 
            } else { //natural number order of defined color:colorIndex = itemIndex
                color = colors[itemIndex % colors.length];
            }
        }
     } else { //unknown item -- maybe the datamapping panel is still not opened: no itemIndex, nocolorIndexes
         if(!this.defaultColoring) {
             this.defalutColoring = d3.scale.category20();
         }
         this.defalutColoring(itemName);
     }
     return color;
  };


  ColorManager.prototype.updateDomain = function() {
      var domainName = this._model.get('colorDomainName');
      if(!!domainName) {
        var dataRange = this._ctrl.dataManager().getDataRange(domainName);
        if(!_.isEmpty(dataRange)) {
            this.setDomain(domainName, dataRange);
        }
      }
  };

  ColorManager.prototype.setDomain = function(name, range) {
    if(!range) return;

    var isDirty = false,
        oldDomain = this.getDomain(),
        oldDomainName = this._model.get('colorDomainName'),
        newDomainName = name,
        newDomain = range.slice(0, this._MAX_ITEMS_NUM);

    var isDomainNameChanged, isRangeChanged;

    isDomainNameChanged = (oldDomainName !== newDomainName);
    if(isDomainNameChanged ) {
      this._model.set('colorDomainName', newDomainName);
    }

    //set isRangeChanged value
    if(isDomainNameChanged) {
      isRangeChanged = true;
      this._model.set('colorDomain', newDomain);//save the setted values
      this._model.set('colorIndexes', {}); //reset _colorIndexes
    } else {
      if(newDomain && !COMMON.isEqualArray(oldDomain, newDomain)) {
        isRangeChanged = true;
        if(this.isColumnDomain()) newDomain = _.union(oldDomain, newDomain);
        this._model.set('colorDomain', newDomain); //clone and then save
      } else {
        isRangeChanged = false;
      }
    }
    return isDomainNameChanged || isRangeChanged ;
  };

  ColorManager.prototype.getDomainName = function() {
      return  this._model.get('colorDomainName');
  };

  ColorManager.prototype.getDomain = function() {
    var savedDomainName = this._model.get('colorDomainName'),
    isEmptyDomain = _.isEmpty(savedDomainName);
    var savedDomain = (isEmptyDomain)? []: COMMON.makeObject(this._model.get('colorDomain'), []);
    var specialRange =  null;
    if(!isEmptyDomain) { //parameter to set color range from defign panel
       // for numeric rows
      specialRange =  this._ctrl.designManager().getValue(savedDomainName);
    }
    return (!_.isEmpty(specialRange))?
      ( (this.isNumberDomain())?[+specialRange[0], +specialRange[1]] :specialRange) : savedDomain;
  };

  /** the following function are using chart ctrl parameters  */
  //show the dataset List
  ColorManager.prototype.getColorColumnList = function() {
    var self = this, dataset= [];

    let dataManager = this._ctrl.dataManager();
    let mapperProps = dataManager.getMapperProps();
    let data = dataManager.getData();

    //add xx.map2 whose have color or colors attrs----use Object.keys(data[0])?
    _.each(mapperProps, function(item, key) {
        if(item.color_label) { //add mapper label for color mapping
          //let label = item.label.trim();
          if(dataset.indexOf(item.label)<0) dataset.push(item.label);
        }
        if(item.color_column) { //add mapper columns for color mapping
          let map = item.map2;
          //for deep link data, only part if data is get
          if(dataManager._getInferData('_big_')) {
            if(data && data.length>0) {
              map= _.intersection(map, Object.keys(data[0]));
            }
          }
          dataset = _.union(dataset, map);
        }
    });

    if(data && dataset.length<=0) {
        dataset = Object.keys(data[0]);
    }
    return dataset;
  };

  //
  ColorManager.prototype.setTypeOfColorColumn = function() {
    if(arguments.length >0 ) {
        this._typeOfColorColumn = _.values(arguments);
    }
  };

  ColorManager.prototype.getDomainOfDataset = function(colorby) {
    var items=[],
        mapperPropsObj = this._ctrl.dataManager().getMapperProps();

    //get the range of one mappered property
    for(var prop in mapperPropsObj) {
        if(mapperPropsObj[prop].label/*.trim()*/ == colorby){
            items = mapperPropsObj[prop].map2;
            break;
        }
    }

    //get the range of one column
    if(items.length === 0 ) {
        items = this._ctrl.dataManager().getDataRange(colorby);
    }

    //limit to max num in colormaping panel
    return items.slice(0, this._MAX_ITEMS_NUM);
  };

  ColorManager.prototype.isDataMappingDomain = function(domainName) {
     var column = (domainName) ? domainName: this.getDomainName(),
         mapperPropsObj = this._ctrl.dataManager().getMapperProps();
     if(!_.isEmpty(column)) {
        for(var prop in mapperPropsObj) {
            if(mapperPropsObj[prop].label == column) {
                return true;
            }
        }
     }
     return false;
  };

  ColorManager.prototype.isColumnDomain = function(domainName) {
    var column = (domainName) ? domainName: this.getDomainName(),
         dataManager = this._ctrl.dataManager(),
         mapper = dataManager.getMapper();
     if(!_.isEmpty(column)) {
        var labels = _.values(dataManager.getMapperProps()).map(function(prop){ return prop.label;});
        return mapper && labels.indexOf(column)<0;
     }
     return false;
  };

  ColorManager.prototype.isLinearDomain = function(domainName) {

    var column = (domainName) ? domainName: this.getDomainName();
       dataTypes = this._ctrl.dataManager().getDataType();
    return column && dataTypes && (column in dataTypes) &&
      ['number', 'ordinal', 'datetime'].includes(dataTypes[column]);
 };

  ColorManager.prototype.isNumberDomain = function(domainName) {
    let column = (domainName) ? domainName: this.getDomainName();
    let dataTypes = this._ctrl.dataManager().getDataType();
    return (!_.isEmpty(column)) && dataTypes && (dataTypes[column] == 'number');
  };

  ColorManager.prototype.getDefaultColor = function() {
    return this._defalutColor;
  };

 ColorManager.prototype.getColorOfColumn = function(columnName) {
    var  color = this._defalutColor, //default color
         colormap = this.getColormap();

    if(this.isDataMappingDomain() && colormap[columnName]) {  //data mapping array
      color=  colormap[columnName];
    }

    return color;
 };

 ColorManager.prototype.getColorOfRow = function(row) {
    var self  = this,
        color = this._defalutColor;
        colorDomainName = this.getDomainName();

    if(this.isDataMappingDomain() || (typeof row !== 'object') || !(colorDomainName in row)) {
        return color; //default color
    }

    var domain = this.getDomain(),
        colormap = this.getColormap(),
        type = this._ctrl.dataManager().getDataType()[colorDomainName];

    if(type !=='string') {//column
      let value = +row[colorDomainName];
      color = d3.scale.linear()
                .domain(domain)
                .range([colormap[domain[0]], colormap[domain[1]]])
                .interpolate(d3.interpolateLab)(value);
    } else {
      color = colormap[row[colorDomainName]];
    }
    return color;
  };

 ColorManager.prototype.chartUpdatingWithColors = function(options, shouldCheckData) {
    var self = this, dataManager= this._ctrl.dataManager();
    dataManager.updateFromColormapping({ COLOR_MANAGER: options}, shouldCheckData);
 };
 /*
 ColorManager.prototype.triggerLink4Colorby =  function(colorby) {
    //this._ctrl.trigger("change:_data_link_", colorby, this._model.get('vtname'), 'colorby');
 };
*/
 ColorManager.prototype._link4Colorby =  function(colorby) { //have not set attributes into this.chart ?
    if(colorby.constructor === String &&  _.keys(this._ctrl.dataManager().getDataType()).indexOf(colorby)>=0) {
       var colorDomain = this.getDomainOfDataset(colorby);
      if(this.setDomain(colorby, colorDomain)) {
           this.chartUpdatingWithColors(null, false);
       }
    }
 };

 return ColorManager;
});
