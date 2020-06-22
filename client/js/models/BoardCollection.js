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
//here to keep data for one chart widget
define(['model/BoardModel'], function (BoardModel) {
  
  var myclass = Backbone.Collection.extend({
    
    model: BoardModel,
    
    queryServerWithModelId: function (id) {
      var self = this;
      var deferred = $.Deferred();
      
      var model = this.get(id);
      if ( model) { //exists in memory model
        deferred.resolve(model);
      } else {
        model = new BoardModel( {id: id} );
        model.fetch({
          silent: true, //do not trigger change event to furtherly save model
          success: function (modelInDB){
            self.add(modelInDB);
            deferred.resolve(modelInDB); //curiously resolveWith can not be used.
          },
          error: function(modelInDB, xhr, options){
            console.warn(xhr.responseText);
            deferred.reject();
          }
        });
      }
      return deferred.promise();
    }, //loolup end

    //create new Model: the options should include userid, screenid, vtname, vttype
    createAndsaveModel: function(attrs, opts){
      var self = this;
      var deferred = $.Deferred();
      
      model = new BoardModel(attrs, opts);
      
      model.save(null, {
        silent: true, //donot trigger change event to furtherly save model
        error: function(modelInDB, xhr, options) {
          deferred.reject(xhr.responseText);
        },
        success: function(modelInDB){
          self.add(modelInDB);
          deferred.resolve(modelInDB);
        }
      });
      return deferred.promise();
    },
    
    removeModel: function(model){
      var self = this;
      var deferred = $.Deferred();
      model.destroy({
        silent: true,
        error: function(mod, xhr, options) {
          deferred.reject(xhr.responseText);
        },
        success: function(mod){
          self.remove(mod);
          deferred.resolve();
        }
      });
      return deferred.promise();
    } //removeModel end
  });
  return myclass;
});
