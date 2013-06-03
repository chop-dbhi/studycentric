define(["jquery", "config",  "libs/big.min" ], function(jQuery, Config,  Big){
    // This class represents the length rulers the user draws on the screen to perform a distance measurement.
    // lightBox should be the Raphael-based svg object that this ruler resides on
    var ruler = function(lightBox, ratio, xHeaderSpacing, yHeaderSpacing){
        var that = {};
        var line = null;
        var startPoint = null;
        var endPoint = null;
        var textLoc = {};
        var text = null;
        var slope = null;
        var trace = null;
        var end1 = null;
        var end2 = null;
        var boundingBox = null;
        var boundingBoxEnd1 = null;
        var boundingBoxEnd2 = null;
        var textBoundaryBox = null;
    
        // This function is based on the Raphael safari( ) call. There are some issues in Chrome 7 with the SVG DOM not updating.
        // We could only do this in Chrome, but it's not doing any harm.
        // See OV-98
        var redraw = function(){
            var rect = lightBox.paper.rect(-99, -99, lightBox.paper.width + 99, lightBox.paper.height + 99).attr({stroke: "none"});
            setTimeout(function () {rect.remove();});
        };
    
        var calculateLength = function (){

            var mult = 1;
            var xDiff = Big(startPoint.x).minus(endPoint.x);
            var yDiff = Big(startPoint.y).minus(endPoint.y);
            
            xDiff = xDiff.div(ratio);
            yDiff = yDiff.div(ratio);
            
            var xSpacing = Big(1);
            var ySpacing = Big(1);
            // If we don't have pixelSpacing data, units will be in pixels
            // Note it is intentional here that 0 or null or undefined for either var will result
            // in false
            var units = "px";
            if (xHeaderSpacing && yHeaderSpacing){
                units = "mm";
                xSpacing = Big(xHeaderSpacing);
                ySpacing = Big(yHeaderSpacing);
            }
            
            var xDistance = xSpacing.times(xDiff);
            var yDistance = ySpacing.times(yDiff);
            
            //var measurement = fn["sqrt"](fn["+"](fn["*"](xDistance,xDistance), fn["*"](yDistance,yDistance)));
            var measurement = xDistance.pow(2).plus(yDistance.pow(2));
            measurement = measurement.sqrt();
            measurement = measurement.toFixed(Config.MeasurementPrecision)+ units;
            
            return measurement;
        };
        that.calculateLength = calculateLength;
    
        var start = function(point){
            startPoint = point;
        };
        that.start = start;
    
        var solver = function(px,py,length,slope){
    
           // if slope is 0 or undefined, we can't use our regular formula
           if (slope === 0 ){
                return [{x:px,y:py+length},{x:px,y:py-length}];
           } else if (slope === undefined) {
                return [{x:px+length,y:py},{x:px-length,y:py}];
           } else {
                   var m = -1/slope;
                   var x1 = (Math.pow(m,2)*px+length*Math.sqrt(Math.pow(m,2)+1)+px)/(Math.pow(m,2)+1);
                   var x2 = (Math.pow(m,2)*px-length*Math.sqrt(Math.pow(m,2)+1)+px)/(Math.pow(m,2)+1);
                   var y1 = m * (x1-px)+py;
                   var y2 = m * (x2-px)+py;
                   return [{x:parseFloat(x1.toFixed(1)),y:parseFloat(y1.toFixed(1))},{x:parseFloat(x2.toFixed(1)),y:parseFloat(y2.toFixed(1))}];
           }
        };
    
        var end = function(point){
            endPoint = point;
            // Handle a quick click
            if (line === null){
                return false;
            }
    
            // If was a ruler that was moved, we need to clear the line (during a move) or the whole thing (if they didn't actually move it)
            clear();
    
            // Length calculations
            var measurement = calculateLength();
            var textPlacement = 45;
            if (endPoint.x + 60 > lightBox.width) {
                textPlacement = -45;
            }
            text = lightBox.paper.text(endPoint.x+textPlacement, endPoint.y, measurement);
    
            // White text with a black border
            text.attr("font-size", 12);
            text.attr("font-weight", "normal");
            text.attr("font-style","normal");
    
            text.attr("stroke-width", 0.5);
            text.attr("font-family","courier");
            text.attr("fill",Config.MeasurementColor);
            var textBox = text.getBBox();
            textBoundaryBox = lightBox.paper.rect(endPoint.x+textPlacement - textBox.width/2, endPoint.y-textBox.height/2, textBox.width, textBox.height);
            textBoundaryBox.attr("fill", Config.HintColor);
            textBoundaryBox.attr("opacity",0);
            var textSet = lightBox.paper.set();
            textSet.push(text);
            textSet.push(textBoundaryBox);
    
            // The user can drag the line and the text. When the text is selected, draw a dashed line to the ruler it corresponds to.
            if (startPoint.x === endPoint.x){
                slope = undefined;
            } else {
                slope = (startPoint.y - endPoint.y)/(startPoint.x - endPoint.x);
            }
    
            var a = solver(startPoint.x,startPoint.y,5,slope);
            var b = solver(endPoint.x,endPoint.y,5,slope);
            var rulerPath = "M"+startPoint.x+" "+startPoint.y+"L"+endPoint.x+ " "+endPoint.y;
            var end1BeginPoint = {x:a[0].x,y:a[0].y};
            var end1EndPoint = {x:a[1].x,y:a[1].y};
            var end2BeginPoint = {x:b[0].x,y:b[0].y};
            var end2EndPoint = {x:b[1].x,y:b[1].y};
            var endPath1 = "M"+a[0].x+" "+a[0].y+"L"+a[1].x+" "+a[1].y;
            var endPath2 = "M"+b[0].x+" "+b[0].y+"L"+b[1].x+" "+b[1].y;
            line = lightBox.paper.path(rulerPath);        
            line.attr("stroke", Config.MeasurementColor);
            end1 = lightBox.paper.path(endPath1);
            end1.attr("stroke", Config.MeasurementColor);
            end2 = lightBox.paper.path(endPath2);
            end2.attr("stroke", Config.MeasurementColor);
    
            // The line is very thin, but we need that for accuracy, however for useability, its needs to be easier to move and manipulate
            // This creates a bounding box around the middle of the line that acts as a proxy for the line on rollover and dragging
            // The alternative was to make LightBox aware of the equations of every single line, and do calculations on every mouse move and every click to 
            // determine the users intent and proxmity to rulers. This solution seems more elegant and likely to be faster.
            a = solver(startPoint.x,startPoint.y,7,slope);
            b = solver(endPoint.x,endPoint.y,7,slope);
            boundingBox = lightBox.paper.path("M"+a[0].x+" "+a[0].y+"L"+a[1].x+" "+a[1].y+"L"+b[1].x+" "+b[1].y+"L"+b[0].x+ " "+b[0].y+"L"+a[0].x+" "+a[0].y);
            boundingBox.attr("opacity",0);
            boundingBox.attr("stroke",Config.HintColor);
            boundingBox.attr("fill",Config.HintColor);
            boundingBox.toFront();
            jQuery(boundingBox.node).hover(function(){line.attr('stroke',Config.HoverColor);end1.attr('stroke',Config.HoverColor);end2.attr('stroke',Config.HoverColor);lightBox.moveCursorOn();},
                                           function(){line.attr('stroke',Config.MeasurementColor);end1.attr('stroke',Config.MeasurementColor);end2.attr('stroke',Config.MeasurementColor);lightBox.moveCursorOff();});
    
            // Now bounding boxes for the rule marks
            var oppositeSlope = null;
            if (slope === undefined){
                oppositeSlope = 0;
            }else if (slope === 0){
                oppositeSlope = undefined;
            }else{
                oppositeSlope = -1/slope;
            }
            
            a = solver(end1BeginPoint.x, end1BeginPoint.y, 3, oppositeSlope);
            b = solver(end1EndPoint.x, end1EndPoint.y, 3, oppositeSlope);
            boundingBoxEnd1 = lightBox.paper.path("M"+a[0].x+" "+a[0].y+"L"+a[1].x+" "+a[1].y+"L"+b[1].x+" "+b[1].y+"L"+b[0].x+ " "+b[0].y+"L"+a[0].x+" "+a[0].y);
            boundingBoxEnd1.attr("opacity",0);
            boundingBoxEnd1.attr("stroke",Config.HintColor);
            boundingBoxEnd1.attr("fill",Config.HintColor);
            jQuery(boundingBoxEnd1.node).hover(function(){end1.attr('stroke',Config.HoverColor);}, function(){end1.attr('stroke',Config.MeasurementColor);});
    
            a = solver(end2BeginPoint.x, end2BeginPoint.y, 1, oppositeSlope);
            b = solver(end2EndPoint.x, end2EndPoint.y, 1, oppositeSlope);
            boundingBoxEnd2 = lightBox.paper.path("M"+a[0].x+" "+a[0].y+"L"+a[1].x+" "+a[1].y+"L"+b[1].x+" "+b[1].y+"L"+b[0].x+ " "+b[0].y+"L"+a[0].x+" "+a[0].y);
            boundingBoxEnd2.attr("opacity",0);
            boundingBoxEnd2.attr("stroke",Config.HintColor);
            boundingBoxEnd2.attr("fill",Config.HintColor);
            jQuery(boundingBoxEnd2.node).hover(function(){end2.attr('stroke',Config.HoverColor);}, function(){end2.attr('stroke',Config.MeasurementColor);});
    
    
            // Make the line draggable
            boundingBox.draggable();
            boundingBox.dragStart = function(sX,sY){
                sX=Math.floor(sX); // Firefox has a bug that causes long decimals to be returned here.
                sY=Math.floor(sY);
                var startDrag = {x:sX,y:sY};
                var s = lightBox.paper.set();
                s.push(line);
                s.push(end1);
                s.push(end2);
                s.push(boundingBoxEnd1);
                s.push(boundingBoxEnd2);
                s.push(boundingBox);
                // This allows us to track pixel differences ourselves
                s.dragFinish = function(droppped, eX, eY){
                    eX=Math.floor(eX); // Firefox has a bug that causes long decimals to be returned here.
                    eY=Math.floor(eY); 
                    var dX = startDrag.x-eX;
                    var dY = startDrag.y-eY;
                    startPoint.x = startPoint.x-dX;
                    startPoint.y = startPoint.y-dY;
                    endPoint.x = endPoint.x-dX;
                    endPoint.y = endPoint.y-dY;
                };
                return s;
            };
    
    
            // Make the line moveable by clicking on either end
            jQuery(boundingBoxEnd2.node).mousedown(function(event){
                 jQuery(boundingBox.node).unbind();
                 jQuery(boundingBoxEnd2.node).unbind(); 
                 event.stopPropagation();
                 event.preventDefault();
                 textLoc = {};
                 lightBox.mouseDown(null,that,startPoint.x,startPoint.y);
            });
    
            jQuery(boundingBoxEnd1.node).mousedown(function(event){
                 jQuery(boundingBox.node).unbind();
                 jQuery(boundingBoxEnd1.node).unbind(); 
                 event.stopPropagation();
                 event.preventDefault();
                 textLoc = {};
                 lightBox.mouseDown(null,that,endPoint.x,endPoint.y); 
            });
    
            redraw();
            // This code handles drawing a dashed line when the text for a ruler is clicked. It also makes text draggable
            jQuery(textBoundaryBox.node).mousedown(function(){
                var tracePath = "M "+(textLoc.x || text.attr('x')) + " " +(textLoc.y || text.attr("y")) + "L"+endPoint.x + " " + endPoint.y;
                trace = lightBox.paper.path(tracePath);
                trace.attr("stroke-width", 1);
                trace.attr("stroke",Config.HintColor);
                trace.attr("stroke-dasharray",['--']);
    
                redraw();
    
                jQuery(textBoundaryBox.node).one("mousemove", function(event) {
                    if (trace !== null){
                        trace.remove();
                        trace = null;
                    } 
                });
            });
    
            jQuery(textBoundaryBox.node).mouseup(function(){
                if (trace !== null){
                    trace.remove();
                    trace = null;
                }
            });
            
            // Raphaelle used to properly update x and y attributes of dragged items 
            // but somehwere along the line this stopped working. Now we keep track of this
            // ourselves.
            textBoundaryBox.draggable();
            textBoundaryBox.dragStart = function(sX,sY){
                sX=Math.floor(sX); // Firefox has a bug that causes long decimals to be returned here.
                sY=Math.floor(sY);
                var startDrag = {x:sX,y:sY};
                // Once they start to drag, remove the white line if it's there
                if (trace !== null){
                    trace.remove();
                    trace = null;
                }
                textSet.dragFinish = function(droppped, eX, eY){
                    eX=Math.floor(eX); // Firefox has a bug that causes long decimals to be returned here.
                    eY=Math.floor(eY); 
                    var dX = startDrag.x-eX;
                    var dY = startDrag.y-eY;
                    textLoc.x = (textLoc.x || text.attr("x"))-dX;
                    textLoc.y = (textLoc.y || text.attr("y"))-dY;
                };
                return textSet;
            };

    
            jQuery(textBoundaryBox.node).hover(function(){lightBox.moveCursorOn();}, function(){lightBox.moveCursorOff();});
    
            // If they double click on the line, delete it. Do we want this?
            jQuery(boundingBox.node).dblclick(function(){
                clear();
                //If they were able to delete, they had the move icon, we need to pop it off
                lightBox.moveCursorOff();
            });
    
            return true;
        };
        that.end = end;
    
        var clear = function (){
             line && line.remove();
             line = null;
             end1 && end1.remove();
             end1 = null;
             end2 && end2.remove();
             end2 = null;
             text && text.remove();
             text = null;
             textBoundaryBox && textBoundaryBox.remove();
             textBoundaryBox = null;
             boundingBox && jQuery(boundingBox.node).unbind(); 
             boundingBox && boundingBox.remove();
             boundingBox = null;
             boundingBoxEnd1 && jQuery(boundingBoxEnd1.node).unbind(); 
             boundingBoxEnd1 && boundingBoxEnd1.remove();
             boundingBoxEnd1 = null;
             boundingBoxEnd2 && jQuery(boundingBoxEnd2.node).unbind(); 
             boundingBoxEnd2 && boundingBoxEnd2.remove();
             boundingBoxEnd2 = null;
        };
        that.clear = clear;
    
        var adjust = function(point){
           clear();
           line = lightBox.paper.path("M"+startPoint.x+" "+startPoint.y+"L"+point.x+" "+point.y);
           line.attr("stroke",Config.MeasurementColor);
        };
        that.adjust = adjust;
    
        return that;
    };
    return ruler;
});
