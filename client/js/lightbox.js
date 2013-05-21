define(["jquery", "ruler","libs/big.min", "libs/raphaelle"], function($, ruler, Big) {
// The lightbox object will represent the image at the center of the screen when measuring is enabled
    var LightBox = function(id){
        var that = {};
        var dcmImageLink = $("#"+id);
        var dcm = dcmImageLink.get(0);
        var width = dcm.width;
        var height = dcm.height;
        var attrs = dcmImageLink.data("dicom_attrs");
        var ratio = Big(height).div(attrs.nativeRows);
        var imgTop = dcmImageLink.css("top");
        var imgLeft = dcmImageLink.css("left");
        var lightBoxDiv = $('<div id="lightbox" width="'+width+'"></div>');
        var offset = null; // when this was stage.node, moving messed up lines
        var top  = null;
        var left = null;
        var ruler_cache = [];
    
        var container = dcmImageLink.parent();
    
        // Make sure the Raphael Box is in the same spot on the screen as the img tag was.
        // Needs to be relative because it will not retain its position when moved either wise.
        lightBoxDiv.css("top",imgTop).css("left",imgLeft).css("position","absolute");
    
        lightBoxDiv.height(height);
        lightBoxDiv.width(width);
        dcmImageLink.detach();
        $(container).append(lightBoxDiv);
        
        var paper = Raphael("lightbox",width,height);
    
        // IE6 and 7 have odd behavior, the box shifts over the right for some reason.
        // This hack fixes that. Webkit also has an very odd bug where it shifts over to the 
        // left even thought the wrapped jquery object should be empty and this should do nothing.
        if ($("#lightBox > div").length > 0) {
            $("#lightBox > div").css("position","relative");
        }
    
        that.paper = paper;
        that.width = width;
    
        var stage = paper.image(dcmImageLink.attr('src'),0,0,width,height);
    
        var node  = $(stage.node).parent(); // Passing the Raphael Object was not working because it didn't have a node property
    
        var moveCursorOn = function(cursor){
            lightBoxDiv.toggleClass("crosshair",false);
            lightBoxDiv.toggleClass("move",true);
    
        };
        that.moveCursorOn = moveCursorOn;
        
        var moveCursorOff = function(cursor){
            lightBoxDiv.toggleClass("move",false);
            lightBoxDiv.toggleClass("crosshair",true);
        };
        that.moveCursorOff = moveCursorOff;
    
        var measureOn = function() {
    
            // Show the user a crosshair so they know they can measure
            lightBoxDiv.hover(function(){ lightBoxDiv.toggleClass("crosshair",true);}, function(){lightBoxDiv.toggleClass("crosshair",false);});
            var currentRuler = null;
            
            var mouseDown = function (event, movedRuler, seedX, seedY) {
                var x = null;
                var y = null;
                // We need to re-calculate this because if the user changes the size of the browser, it can change.
                offset = $(lightBoxDiv).offset(); // when this was stage.node, moving messed up lines
                
                top  = offset.top;
                left = offset.left; 
    
                if (event == null){
                    x = seedX;
                    y = seedY;
                    currentRuler = movedRuler;
                }else{
                    x = event.pageX - Math.floor(left); // Firefox has a bug here, giving non-integer back.
                    y = event.pageY - top;
                    currentRuler = ruler(that, ratio, attrs.xSpacing, attrs.ySpacing);
                }
                currentRuler.start({x:x,y:y});
    
                $(node).unbind("mousedown");
    
                $(document).bind("mousemove.measure", function (event) {     
                    var endX = event.pageX - Math.floor(left);
                    var endY = event.pageY - top;
                    currentRuler.adjust({x:endX, y:endY});
                    return false;
                });
                
                var measureDone = function (event){
                    // For ie, we can't bind to the node object for some reason, so we need to prevent a line from drawing 
                    // if the user is not inside the image.
                    if ((event.pageY > top + height) || (event.pageY < top) || (event.pageX > left + width) || (event.pageX < left)){
                        return;
                    }
                    
                    var endX = event.pageX - Math.floor(left);
                    var endY = event.pageY - top;
                    
                    $(document).unbind(".measure");
                    
                    $(node).mousedown(mouseDown);
                    currentRuler.end({x:endX,y:endY});
                    ruler_cache.push(currentRuler);
                    currentRuler = null;
                };
    
                $(document).bind("mouseup.measure",measureDone);
                $(document).bind("mousedown.measure",measureDone);
    
                // Prevent a small square from appearing when clicking on SVGs
                // and text cursor from appearing on drag.
                if (event !== null) { 
                    event.preventDefault();
                    event.stopPropagation();
                }
            };
            that.mouseDown = mouseDown;
            $(node).mousedown(mouseDown);
        };
        that.measureOn = measureOn;
    
        var measureOff = function(){
            $(document).unbind(".measure");
            $(node).unbind("mousedown");
        };
        that.measureOff = measureOff;
    
        // revert back to plain old image tag
        var destroy = function() {
            lightBoxDiv.remove();
            $(container).append(dcmImageLink);
        };
        that.destroy = destroy;

        var clear = function(){
           $.each(ruler_cache, function(){
              this.clear();
           });
           ruler_cache = [];
        };
        that.clear = clear;
        return that;
    };
   return LightBox;
});
