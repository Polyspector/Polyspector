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
 var DesignManager = function(ctrl){
     
      this._model = ctrl.board_model;
      this._ctrl  = ctrl;
      this._$controls= $('<div/>');//container
 };
 
 DesignManager.prototype._set =  function(changedObj, options) {
    if(changedObj) {
        // trigger 'change' to save to server with silent:true(default) in options
        if(options) {
          this._model.set('ioattrs', _.extend(this._get(), changedObj), options ); 
        } else {
          this._model.set('ioattrs', _.extend(this._get(), changedObj) ); 
        }
        // update chart only if it is timing to save to server
        if(!options || !options.silent) {
          this.designUpdating(changedObj); //save with update and render
        }
    }
 };
 
 DesignManager.prototype._get =  function(id) {
   var ret= null,
       attrs = COMMON.makeObject(this._model.get('ioattrs'), {});
   if(id) {
       ret = attrs[id];
   } else {
       ret = attrs;
   }
   return  ret;
 };
 
 DesignManager.prototype.clearAll = function() {
     this._model.set({'ioattrs': {}}, {silent: true});
     this._$controls= $('<div/>');
     this._ctrl.trigger("change:_save_model_");
 };
 
 //create DOM before initialize, and updating data show design panel
 DesignManager.prototype.setTemplate = function(tpl) {
      const self = this;
      let $tpl = $(_.template(tpl)()).filter(function(){ return $(this).is('div[id]'); });
      //set the inital values in template into _designModel
      $tpl.each(function(index){
        let val = $(this).attr('data-value');
        if(val) {
          self.setValue($(this).attr('id'), val );
        }
      });
      this._$controls.append($tpl);
    };
    
  DesignManager.prototype.getControl = function(id) {
    var self = this,  
        selector = (id)? "div[id='"+ id + "']" : "div[id]";
    
    //fixed control components
    var $controls = self._$controls.find(selector).toArray();
    $.each($controls, function(index, ctrl) {
      var currval = self.getValue($(ctrl).attr('id'));//value from model
      $(ctrl).data('value', currval);
    });
    
    // TBD:delete this following component / move it to color mapping 
    var column = self._ctrl.colorManager().getDomainName(),
        dataTypes = self._ctrl.dataManager().getDataType();
    if(column in dataTypes) {
      var $ctrl = $('<div>', {id: column}), 
          value = self._ctrl.dataManager().getRowRefiner(column),
          range = self._ctrl.dataManager().getDataRange(column),
          name ='ColorMapping Range: '+ column;
      if(dataTypes[column] === 'number') { //slider
        $ctrl.data({type: 'slider', name: name, range:range, value: (value)? value: ''});
      } else
      if( dataTypes[column] === 'datetime') { //slider
        $ctrl.data({type: 'dateslider', name: name, range:range, value: (value)? value: ''});
      }  
      else { //multi selection
        $ctrl.data({type: 'selection', name: name, range:range, value: (value.length>0)? value: ''});
      }
      $controls.push($ctrl.toArray()[0]);
    }

    //color mapping control components
    return $controls;

  };

  DesignManager.prototype._mergeControl_ = function(key, dataset) {
      var $ctrl = this._$controls.find("div[id='"+ key+ "']");
      if( $ctrl.length <=0 ) {
        $ctrl = $('<div/>', {id: key});
        this._$controls.append($ctrl);
      }
      var new_dataset = $.extend(true,{}, $ctrl.data(), dataset);
      $ctrl.data(new_dataset);
      //add or update io variable
      if(dataset.value !== undefined && dataset.value !== null) {
        this.setValue(key, dataset.value);
      }
    };
  
  DesignManager.prototype.setControl = function() {
      var self=this;
      if(arguments.length <=0) return;

      if(arguments[0].constructor == Object) {
        _.each(arguments[0], function(item, key){
          self._mergeControl_(key, item);
        });
      }
      else if(arguments[0].constructor == String) {
         if( !arguments[1] ) {
           //
         }
         else if(arguments[1].constructor== MouseEvent) {
           self._ctrl.trigger("change:_show_ctrl_", arguments[0], arguments[1], this);
         }
         else if(arguments[1].constructor == Object) {
            self._mergeControl_(arguments[0], arguments[1]);
         }
      }
  };
  
  DesignManager.prototype.designUpdating = function(changedObj) {
    this._ctrl.update({ DESIGN_MANAGER: changedObj} );
  };
  
  DesignManager.prototype.setValue = function() {
  
     var hasRenderedORerror = this._ctrl.hasRendered() || this._ctrl.hasErrored(), 
         hasInited   = this._ctrl.hasInited(),
         toBeAdded, obj;
     
     if(arguments.length <=0) return;
     
     if(arguments[0].constructor == Object) {                   
        if(hasRenderedORerror) {
            toBeAdded = _.pick(arguments[0], _.keys(this._get())); 
            if(!_.isEmpty(toBeAdded)) { //only set existed attributes
              this._set(toBeAdded);  //the general 'change' event is triggered
            }
         } else if(hasInited ) { //rendering
            toBeAdded = _.pick(arguments[0], _.keys(this._get())); 
            if(!_.isEmpty(toBeAdded)) { 
              this._set(toBeAdded, {silent: true});
            }
         } else { //initializing
            toBeAdded = _.omit(arguments[0], _.keys(this._get())); //only set new attributes
            if(!_.isEmpty(toBeAdded)) { 
              this._set(toBeAdded, {silent: true});
            }
        }
     } else {
         if( hasRenderedORerror ) {
            if(_.has(this._get(), arguments[0]) || arguments[0] == this._ctrl.colorManager().getDomainName()) {
              obj = {}; obj[arguments[0]]=arguments[1];
              this._set(obj);// general 'change' event is triggered
            }
          } else if(hasInited) { //rendering
            if( _.has(this._get(), arguments[0])) {
              obj = {}; obj[arguments[0]]=arguments[1];
              this._set(obj, { silent:true });// general 'change' event isn't triggered
            }
          }
          else { //initializing
            if(! _.has(this._get(), arguments[0])) { //only the new attribute
              obj = {};  obj[arguments[0]]=arguments[1];
              this._set(obj, { silent:true });// general 'change' event isn't triggered
            }
          } 
     }
  };
  
  DesignManager.prototype.getValue = function(id) {
    return (id)?this._get(id): this._get();
  };
  
  DesignManager.prototype.mode = function(mode) {
    if(mode) {
      this._model.set('ioattrs', $.extend(true, {}, this._get(), {'mode': mode}));
    }
    return this._get('mode');
  };

  return DesignManager;
});
