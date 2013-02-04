"use strict";

var ViewHelpers = function (view) {
	this.view = view;
};

ViewHelpers.prototype = {

	view: null,

	getModule: function () {
		return this.view.req.getModule();
	},

	getController: function () {
		return this.view.req.getController();
	},

	getAction: function () {
		return this.view.req.getAction();
	},

	getBaseUrl: function () {
		return '/' + this.view.req.getModule();
	},

	getJs: function (path) {
		return "<script type=\"text/javascript\" src=\"" + path + "\"></script>";
	},

	getCss: function (path) {
		return "<link rel=\"stylesheet\" href=\"" + path + "\" />";
	},

	getModuleJs: function (path) {
		return this.getJs(this.getBaseUrl() + path);
	},

	getModuleCss: function (path) {
		return this.getCss(this.getBaseUrl() + path);
	}

};


exports.ViewHelpers = ViewHelpers;