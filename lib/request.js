'use strict';

/**
 * Extends {@link http://expressjs.com/api.html#req.params express Request} object to support additional methods.
 *
 * @example
 * req = require('./request').extend(req);
 *
 * @module request
 */

/**
 * @private
 */
var _ = require('underscore');

/**
 * @class
 * @mixes req
 */
var Request = {

	/**
	 * @param {String} moduleName
	 * @param {String} controllerName
	 * @param {String} actionName
	 */
	setRoute: function (moduleName, controllerName, actionName) {
		if (this.module) {
			this.history.push(this.getRoute());
		}
		this.module = moduleName;
		this.controller = controllerName;
		this.action = actionName;
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
	},

	/**
	 * @return {String|null}
	 */
	getPayloadId: function () {
		return this.param('payloadId') || null;
	}
};

/**
 * @param {req} req
 * @return {Request}
 */
exports.extend = function (req) {
	req.module = null;
	req.controller = null;
	req.action = null;
	req.history = [];
	_.functions(Request).forEach(function (functionName) {
		req[functionName] = Request[functionName].bind(req);
	});
	return req;
};