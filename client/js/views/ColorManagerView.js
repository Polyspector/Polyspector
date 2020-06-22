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
define(['text!templates/color_manager.html',
        'util/jquery-simplecolorpicker/jquery.simplecolorpicker',
        'css!util/jquery-simplecolorpicker/jquery.simplecolorpicker.css',
        'css!util/jquery-simplecolorpicker/jquery.simplecolorpicker-regularfont.css'], 
        function(dataMappingTpl) {

  var UPDATE_COLOR_MAP = {
        EMPTY: 0,
        THEME: 1,
        DATASET: 2,
        DATAITEM: 3,
        SEPARATOR : 4
   };

   const MAX_COLOR_PADS = 100;

  var MyView = Backbone.View.extend({
    template: _.template(dataMappingTpl),
    
    initialize: function (attr, options) {
      options || (options = {}); this.colorManager = options.colorManager;
      _.bindAll(this, 'render');
      
      this.listenTo(framework.mediator, 'data_mapping:update_with_new_dataset', this.updateWithNewDataMapping);// only one colorview , so mediator
    },
   
    events: { 
        "change .optionset .dataset" : "datalistSelected",
        "change .optionset .colorset": "themeSelected",
    },
    
    render: function() {
     
      this.$el.html( this.template());

      var $colorset = this.$el.find('.colorset'),
          $dataset = this.$el.find('.dataset'),
          $colormap_content = this.$el.find('.colormap-content');
      
      if(this.colorManager) { //color manager have been initialized

        //add dataset list
          var domainName = this.colorManager.getDomainName();
          $dataset.append("<option style='color:grey' disabled selected>Please select one</option>");
          this.colorManager.getColorColumnList().forEach( function(dataGroupName) {
             var $option= $('<option>', {value: dataGroupName}).text(dataGroupName).appendTo($dataset);
             if(dataGroupName == domainName) {
                 $option.prop('selected', true);
             }
          });//TBD:update dataset list with datamapping events 

          //add theme list
          var currTheme = this.colorManager.getTheme();
          this.colorManager.getThemes().forEach( function(themeName) {
             var $option= $('<option>', {value: themeName}).text(themeName).appendTo($colorset);
             if(themeName == currTheme) {
                 $option.prop('selected', true);
             }
          });
          
          // initialize colormap (donot update chart)
          this.drawColormap();
        }
        return this.$el; //return from render function
    },
    
    //add colormap after select a theme or a dataset
    datalistSelected: function(ev) {
       var $select = $(ev.target).find("option:selected"),
           colorby = $select.text();//use text() instead of val() because val() will trim string
       var colorDomain = this.colorManager.getDomainOfDataset(colorby);
       
       if(this.colorManager.setDomain(colorby, colorDomain)) {
            //update colormap and chart with new dataset
            this.drawColormap(UPDATE_COLOR_MAP.DATASET);
            //this.colorManager.triggerLink4Colorby(colorby); //comment out in 2018/2/15--lxx
       }
    },
    
    themeSelected: function(ev) {
       var $select = $(ev.target).find("option:selected"),
           theme = $select.val();
    
           this.colorManager.setTheme(theme);
           //update colormap and chart with new theme
           this.drawColormap(UPDATE_COLOR_MAP.THEME);
    },

    
    //data mapping for numberic columns list
    updateWithNewDataMapping: function (updateDomainName) {
        //update select datalist
        var $dataset = this.$el.find('.dataset'),
            domainName = this.colorManager.getDomainName();
    
        //clear old options
        $dataset.find('option').remove();
        $dataset.append("<option style='color:grey' disabled selected>Please select one</option>");
        this.colorManager.getColorColumnList().forEach(function(dataGroupName) {
           var $option= $('<option>', {value: dataGroupName}).text(dataGroupName).appendTo($dataset);
           if(dataGroupName == domainName) {
               $option.prop('selected', true);
           }
           $option.appendTo($dataset);
        });

        if(updateDomainName) {
            //update colormap and chart with changed color domain
            this.drawColormap(UPDATE_COLOR_MAP.DATAITEM);
         }
    },
    
    _drawColorpad: function(color, key, $parent) {
     
        var self=this,
          colorManager = this.colorManager,
          isLinearDomain =　colorManager.isLinearDomain(),
          domain =colorManager.getDomain(),
          themeColors = colorManager.getThemeColors(),
          domainName = colorManager.getDomainName();
       
        var text = (key.length > 24)? key.slice(0, 24)+'...' : key;
            $padContainer=$('<div/>', {class: 'color-pad'}).append('<i>'+  text   +'</i>').attr('title', key),
            $selection = $('<selection/>', {name: key}).appendTo($padContainer);
          
          themeColors.forEach(function(themeColor) {
              $('<option/>',{value: themeColor}).text(themeColor).appendTo($selection);
          });
          
          $selection.simplecolorpicker({picker: true, theme: 'regularfont'});
          $selection.simplecolorpicker('selectColor', color);
          $selection.appendTo($padContainer).on('change', function()
          { //update domainItem color with user operation
            var domainItem =  $(this).attr('name'); //$(this) is $selection
            if(colorManager.setColor(domainItem, $(this).val())) { //update gradient bar when changeing color
              if(isLinearDomain) {
                var colormap = colorManager.getColormap(),
                    keys = Object.keys(colormap),
                    $gradient = self._drawGradientBar(colormap[keys[0]], colormap[keys[keys.length-1]]);
                $parent.find('.color-ranges').replaceWith($gradient);
              }
              colorManager.chartUpdatingWithColors(null, false);
            }
          });
          
          $parent.append($padContainer);
          
          return $padContainer;
    },
    
    _drawGradientBar: function(color1, color2) {
     
      return $('<div>',{ class: 'color-ranges'})
            .css({
                height: '15px',
                background: 'linear-gradient(to right, '+ color1 + ','+ color2+')',
                display: 'inline-block', 
                width: '75%'
          });
   },
   
   drawColormap: function(updateStatus) {
      var self=this,
          isLinearDomain = this.colorManager.isLinearDomain(), 
          colormap = this.colorManager.getColormap(),
          $colormap_content = this.$el.find('.colormap-content').empty();
      if(isLinearDomain) { //draw numder domain color-map
          var $container = $('<div/>').css({display: 'inline-block', width: '100%'}).appendTo($colormap_content),
              keys = Object.keys(colormap), size = keys.length;
          if(size >0 ) {
            self._drawColorpad(colormap[keys[0]], keys[0], $container).css({display: 'inline-block', margin: '0px', width: '10%'});//start
          }
          if(size >1 ) {
             self._drawGradientBar(colormap[keys[0]], colormap[keys[size-1]]).appendTo($container);//bar
             self._drawColorpad(colormap[keys[size-1]], keys[size-1], $container).css({display: 'inline-block', margin: '0px', width: '10%'});//end
          }
      } else { //draw string domain color-pad
        Object.keys(colormap)
            .slice(0, MAX_COLOR_PADS)
            .map(key=>self._drawColorpad(colormap[key], key, $colormap_content));
      }

      if(updateStatus && updateStatus != UPDATE_COLOR_MAP.EMPTY ) { //update the whole colormap
          //update chart
          this.colorManager.chartUpdatingWithColors(null, true);//true-- check whether or not data is complete
      }
   }, //drawColormap end
    
    close: function() {
        $('.simplecolorpicker').remove();
        this.remove(); 
    }
  
  });
  
  
  
  return MyView;
});
