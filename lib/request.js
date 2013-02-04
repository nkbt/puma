'use strict';

var _ = require('underscore');

/**
 * @extends req
 * @constructor
 *
 * @param req
 */
var Request = function (req) {
	this.req = req;
};

/**
 * @lends Request
 */
Request.prototype = {

	req: null,
	module: null,
	controller: null,
	action: null,
	history: [],
	allowedContext: ['html', 'json'],

	/**
	 * @param {String} _module
	 * @param {String} _controller
	 * @param {String} _action
	 */
	setRoute: function (_module, _controller, _action) {
		if (this.module) {
			this.history.push(this.getRoute());
		}
		this.module = _module;
		this.controller = _controller;
		this.action = _action;
	},

	/**
	 * @return {String}
	 */
	getRoute: function () {
		return [this.module, this.controller, this.action].join('/');
	},

	/**
	 * @return {String}
	 */
	getModule: function () {
		return this.module;
	},

	/**
	 * @return {String}
	 */
	getController: function () {
		return this.controller;
	},

	/**
	 * @return {String}
	 */
	getAction: function () {
		return this.action;
	},

	/**
	 * @return {Array}
	 */
	getHistory: function () {
		return this.history;
	},

	/**
	 * @return {String}
	 */
	getContext: function () {
		var context = this.req.param('context');
		if (_.indexOf(this.allowedContext, context) === -1) {
			context = 'html';
		}
		return context;
	},

	getFiles: function (name) {

		var files = [];

		if (this.files[name] !== undefined) {
			if (Object.prototype.toString.call(this.files[name]) === '[object Object]') {
				files = [
					this.files[name]
				];
			} else if (Object.prototype.toString.call(this.files[name]) !== '[object Array]') {
				files = this.files[name];
			}
		}

		console.log("files --> request.js:47", files.map(function (file) {
			return file.name;
		}));

		return files;
	}
};

/**
 * @param {req} req
 * @return {Request}
 */
exports.extend = function (req) {
	var request;
	if (_.isUndefined(req.puma)) {
		request = new Request(req);
		_.functions(request).forEach(function (functionName) {
			req[functionName] = request[functionName].bind(request);
		});
		req.puma = true;
	}
	return req;
};