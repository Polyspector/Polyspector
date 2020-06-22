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
/**
 * Create FooterView main function
 * @class FooterView
 * @param {type} app - app.js
 * @param {type} footerTpl - Footer html template
 * @returns {FooterView}
 */
define([ "js/app",
        'text!templates/footer.html'
       ], function (app, footerTpl) {

  var MyClass = Backbone.View.extend({

    template: _.template(footerTpl),

    initialize: function () {
    },
    // Render FooterView
    render: function () {
      if(DEBUG) console.log("footer RENDER::", app.session.toJSON());
      this.$el.html(this.template({
          logged_in: app.session.get("logged_in"),
          user: app.session.user.toJSON()
      }));
      return this;
    },
  });
  return MyClass;
});


