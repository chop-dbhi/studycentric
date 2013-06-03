define(["jquery","underscore", "config"], function($, _, Config){
    var timeout = null; 
    var req = null;
    var t_withPixel = _.template("<p>Horizontal Spacing: <%=xSpacing%></p><p>Vertical Spacing: <%=ySpacing%></p>");
    return {
       queryString2Object: function(queryString){
             var regEx = /[?&]([^=]*)=([^&]*)/g;
             var match;
             var obj = {};
             while(match = regEx.exec(queryString)){
                 obj[match[1]]=match[2];
             }
             return obj;
       },
       processDicomAttributes: function(attrs){
           // if the image displayed does not match this response
           // we are done
           var lightBox = $("#lightbox");
           if (attrs.objectUID !== this.queryString2Object(lightBox[0].src).objectUID)
               return;
           // TODO disable zoom if nativeRows is 0
           lightBox.data("dicom_attrs", attrs);
           if (attrs.xSpacing) {
               attrs.xSpacing = parseFloat(attrs.xSpacing); 
               attrs.ySpacing = parseFloat(attrs.ySpacing);
               $("#pixel_spacing").html(t_withPixel(attrs));
           }
           else $("#pixel_spacing").text("Measurements in pixels");
           // If we don't have windowWidth params, default to sensible
           if (!attrs.windowWidth || !attrs.windowCenter) attrs.defaults = true;
           attrs.windowWidth = attrs.windowWidth || 50;
           attrs.windowCenter = attrs.windowCenter || 200;
           //TODO set message for native resolution here, and specify whether it existed or not.
           attrs.nativeCols = attrs.nativeCols || 512;
           attrs.nativeRows = attrs.nativeRows || 512;
           $("body").trigger("dicom_attr_received");
           if (attrs.pixelMessage) $("#pixel_message").text(attrs.pixelMessage);
       },
       retrieveDicomAttributes: function(study,imgSource){
           if (timeout !== null){
               clearTimeout(timeout);
           }
           $("body").trigger("null_dicom_attr");
           if (req !== null) req.abort();
           var that = this;
           timeout = setTimeout(function() {
              var o = that.queryString2Object(imgSource);
              var url = (Config.StudyCentricHost ? ((Config.StudyCentricProt || "https") +  "://" + Config.StudyCentricHost + (Config.StudyCentricPort ? ":" + Config.StudyCentricPort:"") +"/") : "" ) + Config.StudyCentricPath +"object/"+o.objectUID+"?&seriesUID="+o.seriesUID+"&studyUID="+o.studyUID;
              if (Config.JSONP) 
                  url += "&callback=?";
              req = $.getJSON(url, $.proxy(that.processDicomAttributes, that) ); 
           }, 500);
       }
    };
});
