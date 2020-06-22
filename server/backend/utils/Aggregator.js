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
//status-less or statusful ?-- status-less
function Aggregator(jsonarray, itypes) {
  var self = this,
      LIMIT_NUM_OF_COLUMNS = 30, //max=32
      LIMIT_NUM_OF_ROWS = 20000,
      //d3 = require('d3'),
      _ = require('underscore'),
      crossfilter = require('crossfilter');
      
  this.crossfilter = crossfilter(jsonarray);
  this.dimensions = {};
  this.prefilters = {};
  this.prespkobj = {};
  
  this.scale = function(size, pks_num){ // it it necessary to consider the size of spks ?
    if(!pks_num) { return size;  }
    var limit = (pks_num>=3)?  100: (pks_num>=2)? 500: 4100;
    return (size < limit)? size: limit; 
  };

  this.findOneDimKey = function() {
    return Object.keys(this.dimensions)[0];
  };

  this.findOneNumberDimKey = function(spks) {
    var key = null;
    for(var column in this.dimensions) {
      if(itypes[column]) {
        key = column;
        break;
      }
    }
    return key;
  };
  

  this.clear = function() {
    
  };
  
  this.createDimensions = function(dimKeys) {
    
    var dimsLength2Keep = dimKeys.length,
        clearColumns = _.difference(Object.keys(this.dimensions), dimKeys);

    if( (dimsLength2Keep + clearColumns.length) > LIMIT_NUM_OF_COLUMNS ) { //clear all dimensions excepts the keys and current pk
      clearColumns.forEach(function(column) {
         self.dimensions[column].dispose();
         delete self.dimensions[column];
         if(self.prefilters[column]) {
           delete self.prefilters[column];
         }
      });
    }

    //add new dimension which are not still existed (except comboKey)
    dimKeys.forEach(function(column) {
        if(!self.dimensions[column] && Object.keys(self.dimensions).length < LIMIT_NUM_OF_COLUMNS) {
          self.dimensions[column] = self.crossfilter.dimension(function(collection){
              return collection[column];
          });
        }
    });
  }; //create  end

  this.exec = function(options) {
    var tmpArray, startTime = new Date().getTime();

    var spkObject = _.pick(options._spk_ || {}, function(value, key){return itypes[key];}), 
        spknum = _.size(spkObject);

    spkObject =_.mapObject(spkObject, function(val, key) {
        return self.scale(+val, spknum);
    });

    var refiner  =  options._where_  || {},
        selector =  (options._select_=='*')? Object.keys(itypes): options._select_ , //the rendering column
        groupby = options._groupby_;
    
    var hasGroupBy = !_.isEmpty(groupby),
        spks = Object.keys(spkObject),
        comboPK = spks.sort().join('|'), //
        refinerKeys = Object.keys(refiner);
    
    var currentArray = {}, clearfilters = {};

    var flag_keep_dim = _.isEqual(this.prespkobj, spkObject), //keep the sampling dimension
        flag_keep_group = this.grouping &&  flag_keep_dim,  //keep the group.all() result -- this.grouping intersects all filters
        flag_keep_mapreduce = _.isEqual(this.prefilters, refiner) && _.isEqual(this.preselector, selector) && flag_keep_group,  //keep the map result
        flag_keep_result = flag_keep_mapreduce && this.preaggresult; //keep the reduce result
        
    try {

      //firstly, check and send back empty data for initializing data mapping panel
      if(!selector) { 
        return {};
      }
      this.preselector = selector.slice(0); 
     
      this.createDimensions(_.union(refinerKeys, spks)); //create necessary dimensions
      
      console.log( 'createDimension(ms): ' + (new Date().getTime() - startTime));

      //no refiner, no spks -- TBD: how to process long columns? 
      if(Object.keys(this.dimensions).length <=0 && spks.length <=0 ) {
        console.error('(1)sending all the data without sampling');
        return  (jsonarray.length> LIMIT_NUM_OF_ROWS)? _.sample(jsonarray, LIMIT_NUM_OF_ROWS): jsonarray;
      }

      var clearColumn;
      if(!_.isEmpty(refiner)) {
        
        clearfilters = _.omit(this.prefilters, refinerKeys);
        
        //clear unused filters
        if(!_.isEmpty(clearfilters)) {
          for(clearColumn in clearfilters) {
            this.dimensions[clearColumn].filterAll();
            delete this.prefilters[clearColumn];
          }
        }
        console.log( 'clearDimension(ms) : ' + (new Date().getTime() - startTime));
        //apply current refiner
        var left, right;
        refinerKeys.forEach(function(column) {
          if(_.isNull(refiner[column][0]) || _.isNull(refiner[column][1])) {
              clearfilters[column] = self.prefilters[column];
          } else if(!_.isEqual(self.prefilters[column], refiner[column])) {
              if(itypes[column]) {
                left  = +refiner[column][0];
                right = +refiner[column][1];
                //self.dimensions[column].filterRange([left, right]);
                self.dimensions[column].filterFunction(function(d) {
                    return d >=left && d <right; //filter range is slower than fiter function
                });
              }
              else { //'string'
                var rangeset = refiner[column];
                self.dimensions[column].filterFunction(function(d) {
                    return rangeset.indexOf(d) >=0; //filter range is slower than fiter function
                });
              }
              self.prefilters[column] = refiner[column].slice(0); //copy array [min, max]
          }
        });
        console.log( 'filter(ms): ' + (new Date().getTime() - startTime));
      } else { //highlight mode or inital chart
        clearfilters = this.prefilters;
        //clear unnecessary filters
        if(!_.isEmpty(clearfilters)) {
          for(clearColumn in clearfilters) {
            this.dimensions[clearColumn].filterAll();
            delete this.prefilters[clearColumn];
          }
        }
        console.log( 'clearDimension(ms): ' + (new Date().getTime() - startTime));
      }
      
      if(this.crossfilter.groupAll().value() <= LIMIT_NUM_OF_ROWS) { //small data --> samlping is unnecessary  
        return this.dimensions[refinerKeys[0] || this.findOneDimKey()].top(Infinity);
      }
      
      var numberKey = this.findOneNumberDimKey(spks);
      if(!numberKey) {
        if(hasGroupBy) { //return only the groupby result: TBD
            var puregroup, comboGroupKey = '|'+ groupby.join('|') +'|';
            if(!this.dimensions[comboGroupKey]) {
              this.dimensions[comboGroupKey] = self.crossfilter.dimension(function(d) {
                puregroup  =  groupby.map(function(column) {
                  return d[column];
                });
                return puregroup.join('|');
              });
              console.log( 'addDimension(ms): ' + (new Date().getTime() - startTime));
            }
            if(!flag_keep_group) {
              if(this.grouping) {
                this.grouping.dispose();
              }
              this.grouping = this.dimensions[comboGroupKey].group();
              console.log( 'dim.group(ms): ' + (new Date().getTime() - startTime));
            }
        } else {
          console.error('(2)sending all the data without sampling');
          return this.dimensions[refinerKeys[0] || this.findOneDimKey()].top(LIMIT_NUM_OF_ROWS);
        }
      }
      else if(spks.length <= 1 ) { //one dimension sampling
        var size =1000; //default value
        if(comboPK ==='') { comboPK = numberKey; }  //size is 1000
        else { size = +spkObject[comboPK] ;} //pk equal the spks[0]

        var max = this.dimensions[comboPK].top(1)[0][comboPK],
            min = this.dimensions[comboPK].bottom(1)[0][comboPK];
        
        if(max == min) {
           return this.dimensions[refinerKeys[0] || this.findOneDimKey()].top(LIMIT_NUM_OF_ROWS);
        }

        var group, groupItem, comboGroupPK = '|'+ comboPK+'|';
        if(! flag_keep_dim ) {
          this.prespkobj = _.clone(spkObject);
          if(this.dimensions[comboGroupPK]) { 
            this.dimensions[comboGroupPK].dispose(); 
          }
          this.dimensions[comboGroupPK] = self.crossfilter.dimension(function(d) {
            if(hasGroupBy) {
              group = groupby.map(function(column) {
                return d[column];
              });
              return group.join('|') + Math.round(size* (d[comboPK] - min) /(max-min)); 
            } else {
              return Math.round(size* (d[comboPK] - min) /(max-min));
            }
          });
          console.log( 'addDimension(ms): ' + (new Date().getTime() - startTime));
        }
        if(!flag_keep_group){
          if(this.grouping) {
              this.grouping.dispose();
          }
          this.grouping = this.dimensions[comboGroupPK].group(function(d){
            return (d = d);
          });
          console.log( 'dim.group (ms): ' + (new Date().getTime() - startTime));
        }
      } else { //two~ dimensions samping
        
        if(! flag_keep_dim ) {
          var multiParams = {};
          spks.forEach(function(onePK){
              multiParams[onePK] = {};
              multiParams[onePK].size = +spkObject[onePK];
              multiParams[onePK].max  = self.dimensions[onePK].top(1)[0][onePK];
              multiParams[onePK].min  = self.dimensions[onePK].bottom(1)[0][onePK];
          });

          this.prespkobj = _.clone(spkObject);
          if(this.dimensions[comboPK]) { 
            this.dimensions[comboPK].dispose();
          }
          var dimPKsSizeValues, dimGroupByValues, dimParam;
              groupColumns= spks.filter(function(column){return multiParams[column].max !== multiParams[column].min;});
              
          this.dimensions[comboPK] = self.crossfilter.dimension(function(d) {
           
            dimPKsSizeValues = groupColumns.map(function(onePK){
              dimParam = multiParams[onePK];
              return Math.round(dimParam.size * (d[onePK] - dimParam.min) / (dimParam.max- dimParam.min));
            });
            if(hasGroupBy) {
              dimGroupByValues = groupby.map(function(column){
                return d[column];
              });
              return dimGroupByValues.join('|') + dimPKsSizeValues.join('|');
            } else {
              return '|'+ dimPKsSizeValues.join('|')+'|';
            }
          });
          console.log( 'addDimension(ms): ' + (new Date().getTime() - startTime));
        }

        if(!flag_keep_group){
          if(this.grouping) {
                this.grouping.dispose();
          }
          this.grouping = this.dimensions[comboPK].group();
          console.log( 'dim.group (ms): ' + (new Date().getTime() - startTime));
        }
      }
      
      
      //return previous result;
      if(flag_keep_result) {
        console.log( 'happy! send out previous result .');
        return this.preaggresult;
      } else { //grouping should have value always

        //MAP-REDUCE
        this.grouping.reduce(
          function reduceAdd(p,v) {
            selector.forEach(function(column) {
              p[column] = (itypes[column])? p[column]+v[column] : v[column];
            });
             p['|size|'] += 1;
            return p;
          },
          function reduceRemove(p,v) {
            selector.forEach(function(column) {
              p[column] = (itypes[column])? p[column]-v[column] : v[column];
            });
            p['|size|'] -= 1;
            return p;
          },
          function reduceInitial(){
            var p = {'|size|': 0};
            selector.forEach(function(column) {
              p[column] = (itypes[column])? 0: null;
            });
            return p;
          }
        );
        console.log( 'Group.reduce(ms): ' + (new Date().getTime() - startTime));
        
        //OUTPUT
        tmpArray = this.grouping.all();
        console.log( 'Group.all() (ms): ' + (new Date().getTime() - startTime));

        tmpArray = _.filter(tmpArray, function(d) { 
          return d.value['|size|'] > 0; 
        });
        console.log( 'result.filter(ms): ' + (new Date().getTime() - startTime));
        if(tmpArray.length> LIMIT_NUM_OF_ROWS) {
          tmpArray = _.sample(tmpArray, LIMIT_NUM_OF_ROWS);
          console.log( 'result.sample (ms): ' + (new Date().getTime() - startTime));
        }
        currentArray = _.map(tmpArray,
          function(p) {
            var row = {};
            selector.forEach(function(column) {
              row[column] = (itypes[column])? p.value[column] / p.value['|size|']: p.value[column];
            });
            row['|size|'] = p.value['|size|']; //return size in its group
            return row;
          });//map end
        
        console.log( 'result.map (ms): ' + (new Date().getTime() - startTime));

        this.preaggresult = currentArray;
        return currentArray;
      } //if(grouping) end
      
    } catch (e) {
      console.log(e);
      if(this.grouping) {
        this.grouping.dispose();
        this.grouping= null;
      }
      return {};
    }

    //should never arrive here
    return currentArray; 
  }; //this.exec function end
  
}

module.exports= Aggregator;
