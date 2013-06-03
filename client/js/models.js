define(['jquery', 
        'config',
        'backbone', 
        'views'], function($, Config, Backbone, Views) {

  var Instance = Backbone.Model.extend({
      initialize:function(){
          var view = new Views.InstanceView({model:this});
          // TODO this awful, its here to enable putting the red box around instances during scroll
          this.bind("scroll_show", function(){$("img", view.el).trigger("click");});
      } 
  });

  var ImageStack = Backbone.Collection.extend({
      model:Instance,  
      parse: function(response){
         var models = [];
         for (var index in response){
             models.push({uid:response[index], studyUID:this.studyUID, seriesUID:this.seriesUID});
         }
         return models;
      },
      initialize: function(){
         //var view = new Views.InstanceStackView({collection:this}); 
      }
  });

  var Series = Backbone.Model.extend({
      initialize: function(){
        var ref = this; 
        var data = "json";
        this.instances = new ImageStack();
        // Store study and instance uid on collection so we can properly populate instance model
        this.instances.studyUID = this.get("studyUID");
        this.instances.seriesUID=this.get("uid"); 
        this.instances.url = (Config.StudyCentricHost ? ((Config.StudyCentricProt || "https") + "://" + Config.StudyCentricHost + (Config.StudyCentricPort ? ":"+Config.StudyCentricPort : "") + "/") : "" ) + Config.StudyCentricPath + "series/"+this.get("uid")+"?callback=?";
        var view = new Views.SeriesView({model:this}); 
        if (Config.JSONP)
            data = "jsonp"; 
        this.instances.fetch({dataType:data});
    }
  });

  var SeriesStack = Backbone.Collection.extend({
      model:Series, 
      parse: function(response){
        var models = [];
        var series_objs=response["series"];
        for (var index in series_objs){
            models.push({uid:series_objs[index]["uid"], description:series_objs[index]["description"], studyUID:this.studyUID});
        }
        // TODO remove this
        $("#study_description").text(response.description);
        return models;
      }
  });

  var Study = Backbone.Model.extend({
      initialize: function(){
          var data = "json";
          this.series = new SeriesStack();
          // Stores study uid on collection so we can populate series model
          this.series.studyUID = this.get("uid");
          this.series.url = (Config.StudyCentricHost ? ((Config.StudyCentricProt || "https")+"://"+Config.StudyCentricHost + (Config.StudyCentricPort ? ":"+Config.StudyCentricPort : "") + "/") : "")  + Config.StudyCentricPath + "study/" + this.get("uid")+"?callback=?";
          if (Config.JSONP)
              data = "jsonp";
          this.series.fetch({dataType:data});
      }
  });

  return {
    ImageStack:ImageStack,
    SeriesStack:SeriesStack,
    Series:Series,
    Study:Study,
    Instance:Instance
  };
});
