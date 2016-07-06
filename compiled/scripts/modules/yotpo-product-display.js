define(['modules/jquery-mozu', "hyprlive"], function($,Hypr) {
	var appId = Hypr.getThemeSetting('yotpoAppId');
	var yotpoWidgetScript = document.createElement("script");
		yotpoWidgetScript.type = "text/javascript";
		yotpoWidgetScript.async = true;
		yotpoWidgetScript.src = "//staticw2.yotpo.com/" + appId + "/widget.js";	
    try { 
		$(document.body).first().append(yotpoWidgetScript);
	} catch(e) {/*Ignore*/}
});
