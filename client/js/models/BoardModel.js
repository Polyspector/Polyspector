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
define(function () {
  var MyClass = Backbone.Model.extend({
    urlRoot: 'api/chart',
    //to unify the IF of updating from unit control component--set caption
    setValue: function(key, val) {
        this.save(key, val);
    }
  });
  
  return MyClass;
});
