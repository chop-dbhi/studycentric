require.config({
    paths: {
        'jquery': 'libs/jquery',
        'underscore': 'libs/underscore-min', 
        'backbone': 'libs/backbone' // AMD support
    }
});
require(['jquery',
         'models',
         'config',
         'utils',
         'lightbox',
         'underscore',
         'libs/jquery.mousewheel',
         'libs/jquery-ui-min',
         'libs/jquery.nanoscroller.min',
         "libs/raphael-min"
], function($, Models, Config, Utils, LightBox, _) {
    
    var lightBox;
    var t_window = _.template("<p>Window Center: <%=center%></p><p>Window Width: <%=width%></p>");
    var handleWindow = function(){};

    $("#instancepanel.nano").nanoScroller();
    $("#series.nano").nanoScroller();

    $("#lightbox").addClass("interpol").hide();
    function changeZoom(event, ui){
        // If we don't have the data for this image yet, we can't zoom
        if (lightBox.data('dicom_attrs') === null) return;
        // How this works:
        // If the image's current size is smaller than its native size
        // we ask the server to do the zoom for us, either wise we just
        // make it bigger on the browser since we already have all the data 
        var dicom_attrs =  lightBox.data('dicom_attrs')
        var nativeRows = dicom_attrs["nativeRows"];
        var screenRows = lightBox.prop("height");
        if (ui.value === 0){
            newRows = nativeRows;
        }else { 
            newRows = nativeRows + ui.value;//ath.floor(nativeRows * (1 - Math.abs(ui.value)/(3*nativeRows)));
        }
        if (ui.value >=0 &&  newRows > screenRows && newRows <= nativeRows){
            // change img src to get the servers new image
            lightBox.prop("height", newRows); // Change in case its no longer not set 
            var qsObject = Utils.queryString2Object(lightBox[0].src);
            qsObject.rows = newRows;
            lightBox[0].src = lightBox[0].src.split("?")[0]+"?"+$.param(qsObject).replace("252F", "2F");
        }else{
            lightBox.prop("height", newRows); 
        }
        // Keep image centered as it gets larger or smaller
        var diff = newRows - screenRows;
        lightBox.css("top", parseInt(lightBox.css("top")) - diff/2+"px");
        lightBox.css("left", parseInt(lightBox.css("left")) - diff/2+"px");
    }
    
    // Set the slider to the right spot
    function setZoomScale(whenDone){
        if (lightBox.data('dicom_attrs') === null) {
            $("#slider").slider("disable");
            // Try again
            setTimeout(function(){setZoomScale(whenDone);}, 500);
            return;
        } 
        $("#slider").slider("destroy"); 
        var nativeRows = lightBox.data('dicom_attrs')["nativeRows"];
        $("#slider").slider({
            orientation:"vertical", 
            range:"min",
			min: 0-nativeRows,
			max: 5*nativeRows,
			step: 2,
            slide: changeZoom
        });
        $("#slider").slider("enable");
        changeZoom(undefined, {value:0});
        whenDone && whenDone();
    }

    function centerLightBox(){
        if (!lightBox.width()){
            setTimeout(centerLightBox, 100);
            return;
        }
        var start = $("#series").width() + parseInt($("#series").css("padding-left"));
        var end = $("#instancepanel").width(); 
        var center_width = $(window).width() - start - end;
        var spot = center_width/2 - lightBox.width()/2;
        lightBox.css("position","absolute");
        lightBox.css("left", spot+"px");
        lightBox.css("top", $("#center").height()/2 - lightBox.height()/2 - 50);
        lightBox.show();
    }

    $(function() {
        $("body").bind("null_dicom_attr", function(){
            $('#measure').addClass("disabled");
        });
        $("body").bind("dicom_attr_received", function(){
            $('#measure').removeClass("disabled");
            // handleWindow();
            setWWWL(0,0);
        });
        $("body").bind("study/new", function(){
            setZoomScale(function(){
                centerLightBox();
            });
        });

        function setWWWL(deltaWW, deltaWL){
            var current_src = lightBox[0].src;
            var current_attrs = lightBox.data("dicom_attrs");
            var obj = Utils.queryString2Object(current_src);

            // We don't yet have the windowWidth, try again when the next ajax request finishes 
            //if (!current_attrs && !obj.windowCenter) {
            //   handleWindow=function(){setWWWL(deltaWW,deltaWW);};
            //   return;
            //}
            // handleWindow = function(){};
            obj.windowCenter = obj.windowCenter ? parseInt(obj.windowCenter)+deltaWL : current_attrs.windowCenter + deltaWL;
            obj.windowWidth = obj.windowWidth ? parseInt(obj.windowWidth)+deltaWW : current_attrs.windowWidth + deltaWW;
            obj.windowCenter = obj.windowCenter < 1 ? 1 : obj.windowCenter;
            obj.windowWidth = obj.windowWidth < 1 ? 1 : obj.windowWidth;
            
            $("#window_info").html(t_window({center: obj.windowCenter, width: obj.windowWidth}));
            
            // Don't waste time setting these attributes if they are the defaults, it will cause unnecessary server hits
            // but if we set them because none were provided by the server, leave them.
            if (!current_attrs.defaults && (obj.windowWidth === parseInt(current_attrs.windowWidth)) &&
               (obj.windowCenter === parseInt(current_attrs.windowCenter))){
                   delete obj["windowWidth"];
                   delete obj["windowCenter"];
            } 
            
            // If we actually changed something, change the image.
            if (deltaWW && deltaWL) lightBox[0].src = [lightBox[0].src.split('?')[0],  jQuery.param(obj).replace("252F", "2F")].join("?");
        };

        $("#handle").toggle(function(){
            $("#instancepanel").css("width","320px");
            $("#handle").css("right","323px");
            $("#arrow").addClass("right").removeClass("left");
        },
        function(){
            $("#instancepanel").css("width","0px");
            $("#handle").css("right","3px"); $("#arrow").addClass("left").removeClass("right");
        });
        
        var lb;
        var disable = function(){};

        // This function handles animating and scrolling via the scroll
        // wheel 
        var may_continue = true;
        var animateSeries = function(event, delta, loop){
              // This code puts a throttle on how fast you can zip through images
              // because on faster browsers the nice movie effect wasn't working for
              // smaller images
              if (!may_continue){
                  return; 
              }
              var t = setTimeout(function(){
                 lightBox.unbind("load");
                 may_continue = true;
              }, 3000); 
              lightBox.one("load", function(){
                  may_continue = true;
                  clearTimeout(t);
              });
              
              may_continue = false;
              var dir = delta > 0 ? 'Up' : 'Down';
              var m = lightBox.data("model");
              var i = lightBox.data("index");
              var length = m.collection.models.length;
              var next_m;
              if (dir === "Up" && i > 0) {
                 next_m = m.collection.models[i-1];
                 lightBox.data("model", next_m);
                 lightBox.data("index", $.inArray(next_m, m.collection.models));
                 next_m.trigger("scroll_show");
              } else if (dir === "Down" && i < length-1){
                 next_m = m.collection.models[i+1];
                 lightBox.data("model", next_m);
                 lightBox.data("index", $.inArray(next_m, m.collection.models));
                 next_m.trigger("scroll_show");
              } else if (loop) {
                 next_m = m.collection.models[0];
                 lightBox.data("model", next_m);
                 lightBox.data("index", 0);
                 next_m.trigger("scroll_show");
              }
              if (!loop &&((dir === "Down" && i === length-1) || (dir === "Up" && i === 0))){
                   may_continue = true;
                   clearTimeout(t);
                   lightBox.unbind("load");
              }
        };

        // Bind arrow keys to run through the series
        $(document).keydown(function(event){
            if (event.which in {39:1, 40:1}){
               animateSeries(undefined, 0);
            } else if (event.which in {37:1, 38:1}){
               animateSeries(undefined, 1);
            }
            return false;
        });

        $("#slider").slider({
            orientation:"vertical", 
            range:"min",
            value:10,
			min: 10,
			max: 250,
			step: 10,
            slide: changeZoom
        });

        $("#move").click(function(){ 
             if ($(this).hasClass("selected")) return false; 
             $(this).siblings().removeClass("selected");
             $(this).addClass("selected");
             disable();
             lightBox.draggable({scroll:false});
             disable = function(){
                 lightBox.draggable("destroy");
             };
             return false;
        });

        $("#recover").click(function(){
             if ($(this).hasClass("disabled")) return false;
             if (!$("#lightbox").is(":visible")) return false;
             // We can't move when measure is on.
             if ($("#measure").hasClass("selecte")) return false;
             centerLightBox();
        });

        $("#measure").click(function(){
             if (!$("#lightbox").is(":visible")) return false;
             if ($(this).hasClass("disabled")) return false;
             if ($(this).hasClass("selected")) {
                 lb.clear();
                 return false;
             }
             $(this).siblings().removeClass("selected");
             $(this).addClass("selected");
             disable(); 
             lb = LightBox("lightbox"); 
             lb.measureOn();
             disable = function(){
                 lb.measureOff(); lb.destroy();
                 $("#slider").slider("enable");
             };
             $("#slider").slider("disable");
             return false;
        });

        $("#animate").click(function(){
             if (!$("#lightbox").is(":visible")) return false;
             // This button is a toggle
             if ($(this).hasClass("selected")) {
                 $(this).removeClass("selected"); 
                 disable();
                 disable = function(){};
                 return false; 
             }
             $(this).siblings().removeClass("selected");
             $(this).addClass("selected");
             disable(); 
             var interval = setInterval(function(){
                    animateSeries(null,-1, true);
             }, 100);
             disable = function(){
                clearInterval(interval);
                $("#slider").slider("enable");
             };
             $("#slider").slider("disable");
             return false;
        });

        // Window level functionality
        $("#window").click(function(){
             if (!$("#lightbox").is(":visible")) return false;
             if ($(this).hasClass("selected")) return false; 
             $(this).siblings().removeClass("selected");
             $(this).addClass("selected"); 
             disable();
             var start = undefined;
             var attrs = lightBox.data("dicom_attrs");
             lightBox.mousedown(function(event){
                 start = { x: event.pageX,
                           y: event.pageY };
                 // This is to fix an IE bug where mouseup doesn't work on images after a drag 
                 lightBox.bind("mousemove.wl", function(){return false;}); 
                 $(document).one("mouseup", function(event){
                     lightBox.unbind(".wl"); 
                     var deltaWL = event.pageY - start.y;//windowCenter
                     var deltaWW = event.pageX - start.x;//windowWidth
                     setWWWL(deltaWL, deltaWW); 
                 });
                 return false;
             });

             disable = function(){
                 lightBox.unbind("mousedown"); 
                 lightBox.unbind("mouseup");
             };
        });


        var config = Utils.queryString2Object(window.location.search);
        window.study = new Models.Study({uid:config.uid || 
                                             config.study_uid || 
                                             config.studyuid ||
                                             config.studyUID});
        if (config.instances) $("#handle").click();
        lightBox = $("#lightbox");
        lightBox.mousewheel(animateSeries);
        $("#slider").slider("disable");

        if (!Config.DisableClinicalWarning){
            if ($().dialog){
              $( "#dialog-confirm" ).dialog({
                  resizable: false,
                  draggable: false,
                  height:200,
                  width:350,
                  modal: true,
                  closeOnEscape: false,
                  buttons: {
                      "I agree": function() {
                          $(this).dialog( "close" );
                      }
                  }
              });
            }else{
                alert("StudyCentric is not a certified Medical Device and is not to be used for any clinical or diagnostic purposes. It is for research only.");
            }
        }
        
    });
});
