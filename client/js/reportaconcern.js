define(["jquery","underscore","utils","config","libs/jquery-ui-min"], function($, _, Utils, Config) {
    if (!Config.EnableReportConcern){
       return;
    }

    function loadCss(url) {
        var link = document.createElement("link");
        link.type = "text/css";
        link.rel = "stylesheet";
        link.href = window.location.pathname + "/" + url;
        document.getElementsByTagName("head")[0].appendChild(link);
    }
    loadCss("css/reportaconcern.css");
    var phiReportTmpl = _.template(['<!doctype html>',
                                       '<head>',
                                       '<meta charset="utf-8">',
                                       '<meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">',
                                       '<title>Reported PHI Issue</title>',
                                       '</head>',
                                       '<body>',
                                       '<a href="<%=study_link%>"><img src="<%=image_link%>"/></a><br/>',
                                       '<a href="<%=study_link%>">Study</a>',
                                       '</body>',
                                       '</html>'].join(''));
    
    var racTmpl =['<div id="rac-dialog" class="container">',
              '<div class="content">',
                 '<p class="info">When you click "Report Concern", information about the ',
                 'currently displayed study will be sent to the administrators. Please ',
                 'provide any additional information below.</p>',
                 '<textarea placeholder="Additional details (optional)"></textarea>',
              '</div>',
              '</div>'].join('');
    
    var errorFallBackTmpl = _.template(['<strong style="color:maroon">',
                 'The submission failed, but we take privacy issues very seriously. ',
                 'Please send an email to <a href="'+Config.ReportConcernEmail+'">'+Config.ReportConcernEmail+'</a> ',
                 'with the following study id:<br/><%=study%><br/>and as much detail about your concern ',
                 'as you can WITHOUT revealing any private data in the email itself. Thank you for your help.',
              '</strong>'].join(''));
    // Setup the privacy concern button
    var rac = $('<a id="rac" href="'+Config.ReportConcernUrl+'">Report Privacy Concern</a>');
    rac.css('position', 'absolute');
    rac.css('left', '250px');
    rac.css('top', '20px');
    $("#header").append(rac);
    var save_handler;
	var racDialog;
    rac.click(function(evt){
       evt.preventDefault();
       racDialog = $(racTmpl);
       var racText = rac.text();
       var comment = racDialog.find('textarea');
       racDialog.dialog({
           autoOpen: false,
           resizable: false,
           title: 'Report a PHI Concern',
           width: 400,
           buttons: {
               'Cancel': function() { 
                   racDialog.dialog('close');
                },
               'Report Concern': function() {
                   $.ajax({
                       type: 'POST',
                       url: rac.attr('href'),
                       beforeSend: function(xhr, settings) {
                           racDialog.dialog('close');
                           var context = {
                               study_link : location.href,
                               image_link : $("#lightbox").attr("src")
                           };
                           var payload = phiReportTmpl(context);
                           settings.data = $.param({
                               document: payload, 
                               comment: comment.val()
                           });
                       },
                       success: function() {
                           comment.val('');
                           rac.addClass('success').text('Submitted. Thank You!');
                           setTimeout(function() {
                               rac.removeClass('success').text(racText);
                           }, 3000);
                       },
                       error: function(xhr, code, error) {
                           var failMessage = $(errorFallBackTmpl({study: Utils.queryString2Object(location.href).studyUID}));
                           racDialog.dialog({buttons: {
                              'Cancel': function() { 
                                racDialog.dialog('close');
                           }}});
                           racDialog.dialog('open');
                           comment.replaceWith(failMessage); 
                       },
                       timeout:7000
                   });
               }
           }
       });
       racDialog.dialog('open');
   }
});
