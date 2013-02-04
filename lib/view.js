"use strict";

var path = require('path');
var _ = require('underscore');

var View = function (req, res, vars) {
	this.req = req;
	this.res = res;
	if (vars) {
		this.vars = vars;
	}

	this.assign('helper', new (require('./view-helpers').ViewHelpers)(this));

};


View.prototype = {

	/**
	 * @type {Request}
	 */
	req: null,
	/**
	 * @type {Response}
	 */
	res: null,
	/**
	 * @type {Object}
	 */
	vars: {},


	/**
	 * @param {String} template
	 * @param {Function} callback
	 * @return {View}
	 */
	renderScript: function (template, callback) {
		//console.log('this.getVars() --> view.js:42', this.getVars());

		this.res.render(template, this.getVars(), callback);
		return this;
	},


	/**
	 * @param {String} template
	 * @param {Function} callback
	 * @return {View}
	 */
	render: function (template, callback) {
		var layout = !_.isUndefined(this.vars.layout) ? this.vars.layout : 'layout';

		if (!_.isUndefined(this.vars.redirect)) {
			if (this.vars.redirect === true) {
				this.res.redirect('back');
			} else {
				this.res.redirect(this.vars.redirect);
			}
			return this;
		}

		if (_.isUndefined(this.vars.title)) {
			this.vars.title = 'Hello World!';
		}

		this.vars.messages = this.res.getHistory();

		if (!_.isUndefined(this.vars.status)) {
			this.res.statusCode = this.vars.status;
		}

		this.renderScript(template, function (error, content) {
			if (error) {
				callback(error, content);
			} else {
				this.assign('content', content);
				this.renderScript(path.join(this.req.getModule(), 'views', layout), callback);
			}
		}.bind(this));

		return this;
	},

	/**
	 * @param {String} key
	 * @param {*} value
	 * @return {View}
	 */
	assign: function (key, value) {
		this.vars[key] = value;
		return this;
	},

	/**
	 * @return {Object}
	 */
	getVars: function () {
		return this.vars;
	}


};


exports.View = View;