'use strict';

var _ = require('underscore');

/**
 * @extends res
 * @constructor
 */
var Response = function () {
};

/**
 * @lends Response
 */
Response.prototype = {
	isSuccess: true,
	message: 'OK',
	history: [],

	/**
	 * @param {Boolean} _isSuccess
	 * @param {String} _message
	 */
	setResult: function (_isSuccess, _message) {

		if (_isSuccess !== null) {
			this.history.push({
				'isSuccess': this.isSuccess,
				'message': this.message
			});
		}
		this.isSuccess = _isSuccess;
		this.message = !_message ? (_isSuccess ? 'OK' : 'Error') : _message;

	},

	/**
	 * @return {Boolean}
	 */
	getIsSuccess: function () {
		return this.isSuccess;
	},

	/**
	 * @return {String}
	 */
	getMessage: function () {
		return this.message;
	},

	/**
	 * @return {Array}
	 */
	getHistory: function () {
		return this.history;
	}
};


/**
 * @param {res} res
 * @return {Response}
 */
exports.extend = function (res) {
	var response;
	if (_.isUndefined(res.puma)) {
		response = new Response();
		_.functions(response).forEach(function (functionName) {
			res[functionName] = response[functionName].bind(response);
		});
		res.puma = true;
	}
	return res;
};


