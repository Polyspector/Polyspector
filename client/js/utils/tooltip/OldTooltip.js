/**
 * @fileOverview implement for showing tooltips
 */

/** @module CustomTooltip*/

/**
 * Show and hide tooltip if need
 * @class CustomTooltip
 * @param {type} tooltipId id of element define tooltip in html file
 * @param {type} width width of tooltip
 * @returns {CustomTooltip}
 */
define(["css!./OldTooltip"],function(){
  
  var CustomTooltip = function(id) {
    var $tip = $("<div class='tooltip' />").attr('id', id);
    
    this.showTooltip= function(content, event) {
        $tip.empty();
        if(typeof(content) == 'object') {
          _.each(content, function(value, name) {
            $tip.append("<span>" + name + ": " + value + "</span><br>");
          });
        }
        else {
            $tip.append("<span>" + content + "</span>");;
        }

        $tip.show();
        this.updatePosition(event);

        $("body").find(".tooltip").remove();
        $("body").append($tip);
        
    };

    this.hideTooltip = function() {
        $("body").find(".tooltip").hide()
        //$tip.hide();
    };

    this.updatePosition=function(event) {
        
        var curX = event.pageX;
        var curY = event.pageY;
        var ttw = $tip.width();
        var tth = $tip.height();
        var wscrY = $(window).scrollTop();
        var wscrX = $(window).scrollLeft();
        
        var ttleft = ((curX - wscrX  + ttw) > $(window).width()) ? curX - ttw : curX;
        if (ttleft < wscrX) {
            ttleft = wscrX;
        }
        var tttop = ((curY - wscrY + + tth) > $(window).height()) ? curY - tth  : curY ;
        if (tttop < wscrY) {
            tttop = curY;
        }

        $tip.css('top', tttop + 'px').css('left', ttleft + 'px');
    };

    //$("body").find(".tooltip").remove();
    //$("body").append($tip);
    this.hideTooltip();
  };

  return CustomTooltip;
});

