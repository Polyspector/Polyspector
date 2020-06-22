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
  var AnalysisManager = function(ctrl){
    this._ctrl  = ctrl;
    this._id = 'analysis_' + ctrl.board_model.id;
    this._model = (window.localStorage)? window.localStorage: window.sessionStorage;//TBD: save the parameters into webstorage
    this._$controls= $('<div/>');//container
  };

  AnalysisManager.prototype.setTemplate = function(tpl) {
    if(_.isEmpty(tpl)) return;

    const self = this;

    if (typeof(tpl) == 'string') {
      let $tpl = $(_.template(tpl)()).filter(function(){ return $(this).is('div[id]'); });
      $tpl.each(function(index) {
        // $(this) include all values -- id, value, range, type
        let id  = $(this).attr('id'),
        val = $(this).data('value') || $(this).attr('data-value');
        if(self._$controls.find('#'+id).length<=0) { //check whether or not existed
          self._$controls.append($(this));
        }
        if(val && _.isEmpty(self.getValue(id)) ) {
          self.setValue(id, val);//save value to storage
        }
      });
    } else {
      for(let ctrl of tpl) { //array
        let $ctrl = self._$controls.find('#'+ctrl['id']);
        if($ctrl.length <= 0) {
          $ctrl = $('<div/>');//container
          ('id' in ctrl)    && $ctrl.attr('id', ctrl['id']);
          ('range' in ctrl) && $ctrl.data('range', ctrl['range']);
          ('type' in ctrl)  && $ctrl.data('type', ctrl['type']);
          ('name' in ctrl)  && $ctrl.data('name', ctrl['name']);
          if ('value' in ctrl) {
            $ctrl.data('value', ctrl['value']);
            self.setValue(ctrl['id'], ctrl['value']); //use new value from server
          }
          self._$controls.append($ctrl);
        } else {
          if ('value' in ctrl) {
            $ctrl.data('value', ctrl['value']);
            self.setValue(ctrl['id'], ctrl['value']); //use new value from server
          }
        }
      }
    }
  };

  AnalysisManager.prototype.isEmptyTemplate = function() {
    return this._$controls.is(':empty');
  };

  AnalysisManager.prototype.isEmpty = function() {
    return _.isEmpty(this._get());
  };

  AnalysisManager.prototype.getControl = function(id) {
    let self = this,
    selector = (id)? "div[id='"+ id + "']" : "div[id]";

    //exclude components of link panel
    let $controls = self._$controls.find(selector);
    $.each($controls, function(index, ctrl) {
      let currval = self.getValue($(ctrl).attr('id'));//value from model
      $(ctrl).data('value', currval);
    });
    return $controls;
  };

  AnalysisManager.prototype._set =  function(changedObj, options) {
    if(changedObj) {
      // trigger 'change' to save to server with silent:true(default) in options
      this._model.setItem(this._id, JSON.stringify($.extend({}, this._get(), changedObj)) );
      // update chart only if it is timing to save to server
      if(!options || !options.silent) {
        this.analysisUpdating(changedObj); //save with update and render
      }
    }
  };

  AnalysisManager.prototype._get =  function(id) {
    let ret= null,
    attrs = COMMON.makeObject(this._model.getItem(this._id), {});
    if(id) {
      ret = attrs[id];
    } else {
      ret = attrs;
    }
    return  ret;
  };

  AnalysisManager.prototype.setValue = function() {
    let hasRenderedORerror = this._ctrl.hasRendered() || this._ctrl.hasErrored(),
    hasInited = this._ctrl.hasInited(),
    toBeAdded/*, obj*/;

    if(arguments.length <=0) return;

    if(arguments[0].constructor == Object) {
      if(hasRenderedORerror) {
        toBeAdded = _.pick(arguments[0], _.keys(this._get()));
        if(!_.isEmpty(toBeAdded)) { //only set existed attributes
          this._set(toBeAdded);  //the general 'change' event is triggered
        }
      } else { //initializing
        toBeAdded = _.omit(arguments[0], _.keys(this._get())); //only set new attributes
        if(!_.isEmpty(toBeAdded)) {
          this._set(toBeAdded, {silent: true});
        }
      }
    } else {
      if( hasRenderedORerror ) { //panel operation
        //if(_.has(this._get(), arguments[0])) {
        //obj = {}; obj[arguments[0]]=arguments[1];
        this._set({[arguments[0]]: arguments[1]}, {silent:false});// general 'change' event is triggered
        //}
      } else { //initializing
        //obj = {};  obj[arguments[0]]=arguments[1];
        this._set({[arguments[0]]: arguments[1]}, { silent:true });// general 'change' event isn't triggered
      }
    }
  };

  AnalysisManager.prototype.getValue = function(id) {
    return (id)?this._get(id): this._get();
  };

 AnalysisManager.prototype.clearAll = function() {
   this._model.setItem({'analysis': {}}, {silent: true}); //will update analysis chart?
   this._$controls= $('<div/>');
   this.analysisUpdating();
 };

 //get data from server abd update chart
  AnalysisManager.prototype.analysisUpdating = function(changedObj) {
    //this._ctrl.update({ ANALYSIS_MANAGER: changedObj} );
    this._ctrl.dataManager().updateChart('ANALYSIS', changedObj);
  };
  return AnalysisManager;
});
