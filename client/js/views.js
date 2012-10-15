define(["jquery",
        "config",
        "backbone",
        "underscore",
        "utils"], function($,Config,Backbone,_, Utils){

    var SeriesView = Backbone.View.extend({
      tagName: "div",
      className: "series",
      events: {
        "click":"openSeries"
      },
      initialize: function() {
        _.bindAll(this, "render");
        $("#series .content").append(this.el);
        this.template = _.template($("#seriesview").html());
        this.model.instances.bind("reset",this.render);
      },

      render: function() {
        $(this.el).html(this.template({
            wado_url: (Config.WADOHost ? ((Config.WADOProt || "https") + "://" + Config.WADOHost+(Config.WADOPort ? ":"+Config.WADOPort : "") +"/"): "" )
            + Config.WADOPath + "?" + "contentType=image%2Fjpeg&"+ "requestType=WADO&studyUID="+this.model.get("studyUID")+"&"
            + "seriesUID="+this.model.get("uid") + "&" + "objectUID=" + this.model.instances.at(0).get("uid")
            + "&rows=100",
            size:Config.SeriesThumbNailSizePx,
            description:this.model.get("description") || "None"
        }));
        var save_el;
        var save_parent;
        var label;
        var interval
        $("img", this.el).hover(function(){
           if ($("#lightbox").hasClass("ui-draggable-dragging")) return; 
           save_parent = $(this).parent();
           var offset = 0;
           save_el = $(this).siblings(".full_series_description");
           if (save_el.width() - 10 > $(this).width()) offset = 15;  
           label = $(this).siblings(".series_description").css("visibility", "hidden");
           save_el.appendTo("body").css("position","absolute").css("top", label.offset().top).css("left", label.offset().left-offset).show();
           interval = setInterval(function(){
              save_el && save_el.css("top", save_parent.offset().top);
           }, 50);
        },
        function(){
            if ($("#lightbox").hasClass("ui-draggable-dragging")) return; 
            clearInterval(interval);
            save_el.hide().appendTo(save_parent);
            label && label.css("visibility", "visible");
        });
      },
      openSeries:function(){
        $("#slider").slider("disable");
        // We already have all the UIDs for this study
        // Clear out the models section, and put the new models in there
        // Also reset tool to the move tool and clear out the stage
        var instance_view = new InstanceStack({collection:this.model.instances}); 
        // TODO we maintain state about the current series wwwl in the src, this is not good
        // we have to clean it out so the next study doesn't pick it up
        $("#move").click();
        $("#lightbox").hide().data("dicom_attrs", null)[0].src="";
        $("#series img").removeClass("selected");
        $(this.el ).find("img").addClass("selected");
        $("#pixel_spacing").empty();
        $("#pixel_message").empty();
        $("#window_info").empty();
        this.model.instances.trigger("show");
        $("#image_number").text("Image #1 of "+this.model.instances.length);
      }
    });

    var InstanceStack = Backbone.View.extend({
         el:"#instances",
         events: {
             "click img":"openInstance"
         },
         initialize:function(){
             _.bindAll(this);
             this.collection.bind("show", this.render);
         },
         render:function(){
             $(this.el).empty();
             $(this.el).append("<tbody></tbody>");
             // We are reusing the same DOM for all instances, so we need to clear out anything
             // placed here by any previous instances 
             $(this.el).unbind();
             this.delegateEvents();
             this.collection.models[0].trigger("render");
             $("#instancepanel td:first-child img").click();
             this.collection.each(function(element, index){
               if (!index) return;
               element.trigger("render"); 
            });
         }, 
         openInstance: function(event){
           if ($("#measure").hasClass("selected")) $("#move").click();
           var lightBox = $("#lightbox"); 
           var m = $(event.target).data("model");
           lightBox.data("dicom_attrs", null);
           var previousObj = Utils.queryString2Object(lightBox[0].src);
           var newObj = Utils.queryString2Object(event.target.src);
           // If lightBox is visible (meaning this is not the first instance opened for this series)
           // maintain ww/wl
           if (lightBox.is(":visible")){
                if (previousObj.rows){
                    newObj.rows = previousObj.rows;
                }
                if (previousObj.windowWidth && previousObj.windowCenter){
                    newObj.windowWidth=previousObj.windowWidth;
                    newObj.windowCenter=+previousObj.windowCenter;
                }
           }else{
              lightBox.trigger("study/new");
              // Show image at its native resolution
              lightBox.removeAttr("height");
              lightBox.removeAttr("width"); 
           }
           lightBox[0].src = [event.target.src.split("?")[0], jQuery.param(newObj).replace("252F", "2F")].join('?');
           Utils.retrieveDicomAttributes(m, event.target.src);
           lightBox.data("model", m);
           lightBox.data("index", $.inArray(m, m.collection.models));
           $("img",this.el).removeClass("selected"); 
           $(event.target).addClass("selected");
           $("#image_number").text("Image #" + ($.inArray(m, m.collection.models)+1) + " of " + m.collection.models.length );
           $("#pixel_spacing").empty();
           $("#pixel_message").empty();
        }
    });
   
    var InstanceView = Backbone.View.extend({
        tagName:"td",
        className: "instance",
        initialize: function() {
            _.bindAll(this, "render");
            this.template = _.template($("#instanceview").html());
            this.model.bind("render",this.render);
        },
        render: function(){
            $("#instances tbody").append(this.el);
            var index = $.inArray(this.model, this.model.collection.models);
            $(this.el).html(this.template({wado_url:(Config.WADOHost ? ((Config.WADOProt || "https") + "://" + Config.WADOHost+ (Config.WADOPort ? ":"+Config.WADOPort: "")  +"/") : "" )
            + Config.WADOPath + "?"+"contentType=image%2Fjpeg&"+ "requestType=WADO&studyUID="+this.model.get("studyUID")+"&"
            + "seriesUID="+this.model.get("seriesUID") + "&" + "objectUID=" + this.model.get("uid")
            + "&rows="+Config.DefaultImgSize,
            size:Config.InstanceThumbNailSizePx}));
            $("img",this.el).data("model", this.model);
            this.model.attributes.url = $('img', this.el)[0].src; 
            // This is not efficient, but this allows us to wrap tr around
            // each group of Config.ImagesPerRow as we build it. This view 
            // should probably pass the collection, not the model
            if ((index % Config.ImagesPerRow === Config.ImagesPerRow - 1)
               || (index === this.model.collection.models.length)) {
                $(this.el).prevUntil("table,tr").add(this.el).wrapAll("<tr/>");
            }
        }
    });
    
    return {
       SeriesView:SeriesView,
       InstanceView:InstanceView,
       InstanceStackView:InstanceStack};
});
