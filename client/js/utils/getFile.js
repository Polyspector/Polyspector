/*
    html2canvas : 'assets/libs/canvg/html2canvas',
    canvg       : 'assets/libs/canvg/canvg',//
    StackBlur   : 'assets/libs/canvg/StackBlur',
    rgbcolor    : 'assets/libs/canvg/rgbcolor',//
    
*/

define([
    'lib/html2canvas/index',
    'lib/stackBlur/index',
    'lib/rgbcolor/index',
    'lib/canvg/index'
], function(){
  
  var MyClass= function(){};
  //download.js v3.1, by dandavis; 2008-2014. [CCBY2] see http://danml.com/download.html for tests/usage
  // v1 landed a FF+Chrome compat way of downloading strings to local un-named files, upgraded to use a hidden frame and optional mime
  // v2 added named files via a[download], msSaveBlob, IE (10+) support, and window.URL support for larger+faster saves than dataURLs
  // v3 added dataURL and Blob Input, bind-toggle arity, and legacy dataURL fallback was improved with force-download mime and base64 support. 3.1 improved safari handling.
  // https://github.com/rndme/download
  // data can be a string, Blob, File, or dataURL
  MyClass.prototype.download=function (data, strFileName, strMimeType) {
    
    var self = window, // this script is only for browsers anyway...
      u = "application/octet-stream", // this default mime also triggers iframe downloads
      m = strMimeType || u, 
      x = data,
      D = document,
      a = D.createElement("a"),
      z = function(a){return String(a);},
      B = (self.Blob || self.MozBlob || self.WebKitBlob || z);
      B=B.call ? B.bind(self) : Blob ;
      var fn = strFileName || "download",
      blob, 
      fr;
   
    //go ahead and download dataURLs right away
    if(String(x).match(/^data\:[\w+\-]+\/[\w+\-]+[,;]/)){
      return navigator.msSaveBlob ?  // IE10 can't do a[download], only Blobs:
        navigator.msSaveBlob(d2b(x), fn) : 
        saver(x) ; // everyone else can save dataURLs un-processed
    }//end if dataURL passed?
    
    blob = x instanceof B ? 
      x : 
      new B([x], {type: m}) ;
    
    
    function d2b(u) {
      var p= u.split(/[:;,]/),
      t= p[1],
      dec= p[2] == "base64" ? atob : decodeURIComponent,
      bin= dec(p.pop()),
      mx= bin.length,
      i= 0,
      uia= new Uint8Array(mx);

      for(i;i<mx;++i) uia[i]= bin.charCodeAt(i);

      return new B([uia], {type: t});
     }
      
    function saver(url, winMode){
      
      if ('download' in a) { //html5 A[download] 			
        a.href = url;
        a.setAttribute("download", fn);
        a.innerHTML = "downloading...";
        D.body.appendChild(a);
        setTimeout(function() {
          a.click();
          D.body.removeChild(a);
          if(winMode===true){setTimeout(function(){ self.URL.revokeObjectURL(a.href);}, 250 );}
        }, 66);
        return true;
      }

      if(typeof safari !=="undefined" ){ // handle non-a[download] safari as best we can:
        url="data:"+url.replace(/^data:([\w\/\-\+]+)/, u);
        if(!window.open(url)){ // popup blocked, offer direct download: 
          if(confirm("Displaying New Document\n\nUse Save As... to download, then click back to return to this page.")){ location.href=url; }
        }
        return true;
      }
      
      //do iframe dataURL download (old ch+FF):
      var f = D.createElement("iframe");
      D.body.appendChild(f);
      
      if(!winMode){ // force a mime that will download:
        url="data:"+url.replace(/^data:([\w\/\-\+]+)/, u);
      }
      f.src=url;
      setTimeout(function(){ D.body.removeChild(f); }, 333);
      
    }//end saver 
      
    if (navigator.msSaveBlob) { // IE10+ : (has Blob, but not a[download] or URL)
      return navigator.msSaveBlob(blob, fn);
    } 	
    
    if(self.URL){ // simple fast and modern way using Blob and URL:
      saver(self.URL.createObjectURL(blob), true);
    }else{
      // handle non-Blob()+non-URL browsers:
      if(typeof blob === "string" || blob.constructor===z ){
        try{
          return saver( "data:" +  m   + ";base64,"  +  self.btoa(blob)  ); 
        }catch(y){
          return saver( "data:" +  m   + "," + encodeURIComponent(blob)  ); 
        }
      }
    }	
    return true;
  }; /* end download() */
  

   MyClass.prototype.styles = function(el) {
     var css = "";
     var sheets = document.styleSheets;
     var isExternal = function(url) {
       return url && url.lastIndexOf('http', 0) === 0 && url.lastIndexOf(window.location.host) == -1;
     };
     for (var i = 0; i < sheets.length; i++) {
       if (isExternal(sheets[i].href)) {
         //console.warn("Cannot include styles from other hosts: " + sheets[i].href);
         continue;
       }
       var rules = sheets[i].cssRules;
       if (rules !== null) {
         for (var j = 0; j < rules.length; j++) {
           var rule = rules[j];
           if (typeof (rule.style) != "undefined") {
             var match = null;
             try {
                 match = el.querySelector(rule.selectorText);
             } catch (err) {
                 console.warn('Invalid CSS selector "' + rule.selectorText + '"', err);
             }
             if (match) {
                 css += rule.selectorText + " { " + rule.style.cssText + " }\n";
             }
           }
         }
       }
     } //for end
     return css;
   };
  
   MyClass.prototype.convertSVGToCanvas= function (chart_el) {
      var self = this;
      var $svgs = $(chart_el).find('svg');
          
      $svgs.each(function (index, svg) {
        
        // Create canvas object
        var $canvas = $("<canvas/>", {class: "screenShotTempCanvas"});
        
        // Add CSS data to head of svg title
        $(svg).prepend("\n<style type='text/css'></style>");
        $(svg).find("style").html("\n<![CDATA[" + self.styles(svg) + "]]>\n");

        //draw the SVG onto a canvas
        canvg($canvas.get(0), svg.outerHTML);
        
        $canvas.insertAfter(svg);
    
        //hide the SVG element
        $(svg).hide();
    });
  };
    
  MyClass.prototype.revertSVGFromCanvas= function (chart_el) {
    // Remove canvas
    $(chart_el).find('.screenShotTempCanvas').remove();
    var svgs = $(chart_el).find('svg');

    // Display all svg object
    svgs.each(function (index, svg) {
      $(svg).show();
    });
  };


  return new MyClass();
  
});
