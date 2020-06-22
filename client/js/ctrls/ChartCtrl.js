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
define(['ctrl/ColorManager', 'ctrl/DesignManager', 'ctrl/DataManager', 'ctrl/AnalysisManager'], 
  function (ColorManager, DesignManager, DataManager, AnalysisManager) {
  var MyClass = function (board_model, screen_model) {
      var self = this;

      //for trigger event
      _.extend(this, Backbone.Events);// event triiger, on & listenTo

      this._inside_update_ = false;
      this._size_ = {width:0 , height: 0};
      this._chart_dom = undefined;//$();

      this.board_model = board_model;
      this.screen_model = screen_model;

      this.RENDER_STATUS = {
        UPDATE_ERRORed: -6,
        RENDER_ERRORed: -5,
        VALID_ERRORed: -4,
        GETD_ERRORed: -3,
        INIT_ERRORed: -2,
        LIB_ERRORed: -1,
        EMPRY: 0,
        LIBed: 1,
        INITed: 2,
        GETDed: 3,
        VALIDed: 4,
        RENDERed: 5,
        UPDATed: 6
      };
  };
  
  //add the link to colorManager for access from widget.io
  MyClass.prototype.colorManager = function() {
    return this._colorManager_ || (this._colorManager_ = new ColorManager(this)); 
  };
  
  MyClass.prototype.designManager = function() {
    return this._designManager_ || (this._designManager_ = new DesignManager(this)); 
  };
  
  MyClass.prototype.dataManager = function() {
    return this._dataManager_ || (this._dataManager_ = new DataManager(this)); 
  };
  
  MyClass.prototype.analysisManager = function() {
    return this._analysisManager_ || (this._analysisManager_ = new AnalysisManager(this));
  };

  MyClass.prototype.chartInstance = function() {
    return this._widget_; 
  };
  
  MyClass.prototype.chartSize = function (osize) { //keep the size
    if(osize) {
      this._size_ = osize;
    } else {
      return this._size_;
    }
  };

  MyClass.prototype.statusCode = function(status) {
    if(status === undefined ) {
      return this._RenderStatus_;
    } else {
      this._RenderStatus_ = status;
    }
  };

  MyClass.prototype.statusColor = function() {
     var color='';
     switch(this._RenderStatus_) {
       case this.RENDER_STATUS.LIB_ERRORed:    color="#40302f"; break;
       case this.RENDER_STATUS.INIT_ERRORed:   color="#50302f"; break;
       case this.RENDER_STATUS.GETD_ERRORed:   color="#60302f"; break;
       case this.RENDER_STATUS.VALID_ERRORed:  color="#703619"; break;
       case this.RENDER_STATUS.RENDER_ERRORed: color="#c1913e"; break;
       case this.RENDER_STATUS.UPDATE_ERRORed: color="#d1913e"; break;
       default:
        color = (this._RenderStatus_ >=0)? '': "#b0302f"; //color of unknown error code;
       break;
     }
     return color;
   };
  
  MyClass.prototype.dataLoadStatus = function(key, statusCode) {
    if(statusCode !== undefined) {
      this._RenderStatus_ = statusCode;
    }
    this.trigger(key);
  };
  
  MyClass.prototype.hasNewDataLoadError = function() {
    return (this._RenderStatus_ == this.RENDER_STATUS.GETD_ERRORed);
  };
  
  MyClass.prototype.isDirty = function() {
    return (this._RenderStatus_ == this.RENDER_STATUS.GETDed);
  };

  MyClass.prototype.hasRendered = function () {
    return (this._RenderStatus_ >= this.RENDER_STATUS.RENDERed) ||
           (this._RenderStatus_ <= this.RENDER_STATUS.RENDER_ERRORed);  // to permit showing design/control panel with error
  } ;
  
  MyClass.prototype.hasErrored = function () {
    return this._RenderStatus_ < this.RENDER_STATUS.EMPRY;
  } ;

  MyClass.prototype.hasInited = function () {
    return this._RenderStatus_ >= this.RENDER_STATUS.INITed; 
  } ;
  
  MyClass.prototype.getChartLib= function(vttype) {
      var self = this;
      var deferred = $.Deferred();
      if (self.widget) {
        deferred.resolve();
      } else {
          let chartmain = 'vis/'+ vttype + '/main';
          self._RenderStatus_ = self.RENDER_STATUS.EMPRY;
          require([chartmain], function (ChartLibClass) {
            try {
              self._widget_ = new ChartLibClass(self); //call initilize function
              self._RenderStatus_ = self.RENDER_STATUS.INITed; 
              deferred.resolve();
            } catch(error) {
              console.error(error);
              self._RenderStatus_ = self.RENDER_STATUS.INIT_ERRORed;
              self.trigger("current:status");
              deferred.reject();
            }
          }, function(err) { //resuirejs error
            console.error(err);
            self._RenderStatus_ = self.RENDER_STATUS.LIB_ERRORed;
            self.trigger("current:status");
            deferred.reject();
          });
      }
      return deferred.promise();
  };

  MyClass.prototype.resize = function(width, height) {
    var self = this;

    self.chartSize({width: width, height: height});
    try {
        /*if(self.fastDraw(false, true)) {
          // draw png/jpeg
        } else*/ 
        if(self._widget_.resize) {
             var chart_dom = self._widget_.resize(width, height);
             if(chart_dom && chart_dom.tagName) {
               self._chart_dom = chart_dom;
             }
             self.fitsvg();
             self.trigger("change:_save_model_"); //model may been updated before and when chart-updating
        } else if(self._chart_dom !==undefined && self._chart_dom.tagName && self._chart_dom.tagName.toLowerCase()==='svg') {
             self.fitsvg();
        } else {
          self.render(self._size_.width, self._size_.height, $(self._chart_dom).parent());
          self.trigger("change:_save_model_"); //model may been updated before and when updating
        }
        self._RenderStatus_ = self.RENDER_STATUS.UPDATed;
     }catch (err) {
        console.error(err);
        self._RenderStatus_ = self.RENDER_STATUS.UPDATE_ERRORed;
     }
     self.trigger("current:status", self.statusColor());
     return self._chart_dom;
  };

  MyClass.prototype.drawImage = function(root_dom, isUpdate, isResize) { 
    const self=this;
    let based_dom=root_dom, content=null;

    if(content=self._dataManager_.getData('_html_')) {
      let iframe=null;

      if(isResize) {
        iframe = based_dom;
        iframe.width  = self._size_.width;
        iframe.height = self._size_.height;
      } else {
        if(isUpdate) {
          var $parent = $(based_dom).parent();
          while ($parent.firstChild) {
            $parent.removeChild(based_dom.firstChild);
          }
        }
        iframe = document.createElement('iframe');
        iframe.src = 'data:text/html;charset=utf-8,' + encodeURI(content);
        iframe.width  = self._size_.width;
        iframe.height = self._size_.height;
        based_dom = iframe;
      }
    }
    else
    if(content= self._dataManager_.getData('_png_')) {
      //draw png
      let img=null;
      if(isResize) {
        img = based_dom;
        img.width  = self._size_.width;
        img.height = self._size_.height;
      } else {
        if(isUpdate) {
          var $parent = $(based_dom).parent();
          while ($parent.firstChild) {
            $parent.removeChild(based_dom.firstChild);
          }
        }
        img = new Image();
        //const decoder = new TextDecoder();
        img.src = "data:image/png;base64,"+ content;
        img.width  = self._size_.width;
        img.height = self._size_.height;
        based_dom = img;
      }
    }
    else
    if(content= self._dataManager_.getData('_jpeg_')) {
      //draw png
      let img=null;
      if(isResize) {
        img = based_dom;
        img.width  = self._size_.width;
        img.height = self._size_.height;
      } else {
        if(isUpdate) {
          var $parent = $(based_dom).parent();
          while ($parent.firstChild) {
            $parent.removeChild(based_dom.firstChild);
          }
        }
        img = new Image();
        img.src = "data:image/jpeg;base64,"+ content;
        img.width  = self._size_.width;
        img.height = self._size_.height;
        based_dom = img;
      }
    }
    else
    if(content=self._dataManager_.getData('_svg_')) {
      //draw svg
      let iframe_svg =null;
      if(isResize) {
        
      } else {
        if(isUpdate) {
          var $parent = $(based_dom).parent();
          while ($parent.firstChild) {
            $parent.removeChild(based_dom.firstChild);
          }
        }
        iframe_svg = document.createElement("iframe");
        iframe_svg.src = 'data:text/html;charset=utf-8,' + encodeURI(content);
        iframe_svg.width  = self._size_.width;
        iframe_svg.height = self._size_.height;
        based_dom = iframe_svg;
      }
    }
    
    return based_dom;
  };

  MyClass.prototype.clearAll = function() {
    this._widget_.clearAll && 
    this._widget_.clearAll();
  }

  MyClass.prototype.insideUpdate = function(flag) {
    if(flag !== undefined) {
      this._inside_update_ = flag;
    } else {
      return this._inside_update_;
    }
  };

  //use the existed dom entry
  MyClass.prototype.update = function(changed) {
     var self = this;
     try {
        if(this._inside_update_) {//use it only once
          this._inside_update_  = false;
        } /*else if(self.fastDraw(true)) {
          //png/jpeg/dom/svg etc.
        } else*/ 
        if(self._widget_.update && self._chart_dom) {
          self._widget_.update(changed); //use the existed dom entry
          self.fitsvg();
        } else {
          self.render(self._size_.width, self._size_.height, $(self._chart_dom).parent());
        }
        self.trigger("change:_save_model_"); //model may been updated before and when updating    
        self._RenderStatus_ = self.RENDER_STATUS.UPDATed;
        self._dataManager_.checkToPeriodDeepUpdate();
     } catch (err) {
        console.error(err);
        self._RenderStatus_ = self.RENDER_STATUS.UPDATE_ERRORed;
     }
     self.trigger("current:status", self.statusColor());
     return self._chart_dom;
  };

  MyClass.prototype.render = function(width, height, $parent) {
     var self = this;
     self.chartSize({width: width, height: height});
     try {
        /*if(self.fastDraw()) {
          $parent.empty().append(self._chart_dom);
          self._RenderStatus_ = self.RENDER_STATUS.RENDERed;
        } 
        else */
        if (!self._dataManager_.hasData()) {
          console.warn('No data exist!');
          self._RenderStatus_ = self.RENDER_STATUS.GETD_ERRORed;
        } 
        else 
        if(!self._widget_.render) {
          console.error('Chart render function doesnot exist!');
          self._RenderStatus_ = self.RENDER_STATUS.RENDER_ERRORed;
        } 
        else {
          var dataok = (self._widget_.validate)? self._widget_.validate(): self.dataManager().validate();
          if(dataok) {
            var root_dom = self._widget_.render(width, height, $parent);
            if(root_dom) {
              self._chart_dom = root_dom;
            }
            if($parent)  {
              $parent.empty().append(self._chart_dom);
            }
            self.fitsvg();

            self.trigger("change:_save_model_"); //model may been updated before or within rendering
            //update status
            self._RenderStatus_ = self.RENDER_STATUS.RENDERed;
            //check for periodic update
            self._dataManager_.checkToPeriodDeepUpdate();//
          } else {
            console.error('Chart Data error when validating!');
            self._RenderStatus_ = self.RENDER_STATUS.VALID_ERRORed;
          }
        }
      } catch (err) {
          console.error(err);
          self._RenderStatus_ = self.RENDER_STATUS.RENDER_ERRORed;
      }
      self.trigger("current:status", self.statusColor());
  };
  
  MyClass.prototype.fitsvg = function() {

    var chart_dom = this._chart_dom;
    
    if(chart_dom && chart_dom.tagName && chart_dom.tagName.toLowerCase()==='svg') {
      
      var bbox = chart_dom.getBBox();
      if(this._widget_.size) {
        var size = this._widget_.size;
        chart_dom.setAttribute("viewBox",  [0, 0, size[0], size[1]]);
      }
      else if(bbox && bbox.width >0 && bbox.height>0) {
        chart_dom.setAttribute("viewBox",  [bbox.x, bbox.y, bbox.width, bbox.height]);
      } 
      else {
        chart_dom.setAttribute("viewBox",  [0, 0, this._size_.width, this._size_.height]);
      }
      
      $(chart_dom)
        .attr('width', this._size_.width)
        .attr('height',this._size_.height);
        
      if(!chart_dom.hasAttribute("preserveAspectRatio")){
        chart_dom.setAttribute("preserveAspectRatio", 'none');
      }
    }
  };

  
  MyClass.prototype.createRootDom = function(type) {
    if(!this._chart_dom) {
      this._chart_dom = (type && type ==='svg')?
        document.createElementNS(d3.ns.prefix.svg, 'svg'): 
        document.createElement("div");
    } else {
      while (this._chart_dom.firstChild) {
          this._chart_dom.removeChild(this._chart_dom.firstChild);
      }
    }
    return this._chart_dom;
  };
 
 MyClass.prototype.getLocalData = function(options) {
   if(this._widget_.getLocalData) {
     this._dataManager_.setData(null, this._widget_.getLocalData(options));
     return true;
   } 
   return false;
 };

 //get/set mode
 MyClass.prototype.mode = function(mode) {
    if(this._widget_ && this._widget_.mode){
      return this._widget_.mode(mode);
    } else { //default implementation
      return this.designManager().mode(mode);  //get only?
    }
 };
 
 //set/set hightlight mode
 MyClass.prototype.fullrange = function (flag) {
   if(flag === undefined) {
     var mode = this.mode();
     return _.isEmpty(mode)? true: this.mode()=='fullrange';
   } else if(flag) { //flag: true
     this.mode('fullrange');
   } else if(this.mode()=='fullrange') { //flag: false
     this.mode(''); 
   }
 };
 
 //set/set hightlight mode
 MyClass.prototype.drilldown = function (flag) {
   if(flag === undefined) {
     return this.mode()==='drilldown';
   } else if(flag) {
     this.mode('drilldown');
   } else if(this.mode()=='drilldown') { //flag: false
     this.mode(''); 
   }
 };
 
 //set/set highlight mode
 MyClass.prototype.highlight = function (flag) {
   if(flag === undefined) {
     return this.mode()==='highlight';
   } else if(flag) {
     this.mode('highlight');
   } else if(this.mode()=='highlight') { //flag: false
     this.mode(''); 
   }
 };

 return MyClass;
});
