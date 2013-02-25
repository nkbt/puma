'use strict';

var _ = require('underscore');

var responseDecorators = {};
/**
 * {
 *     response: function(response) { return response; },
 *     message: function(message) { return message; },
 *     payload: function(payload) { return payload; },
 * }
 * @param {Object} decorators
 */
exports.setResponseDecorators = function (decorators) {
	responseDecorators = decorators;
};


/**
 * @extends res
 */
var Response = {

	/**
	 * @param {Object} payload
	 */
	addPayload: function (payload) {

		this.getResponseObject().payload.push(this.payloadDecorator(payload));
	},

	/**
	 * @param {Object} payload
	 * @return {Object}
	 */
	payloadDecorator: function (payload) {

		return payload;
	},

	/**
	 * @param {Object} message
	 */
	addMessage: function (message) {

		this.getResponseObject().message.push(this.messageDecorator(message));
	},

	/**
	 * @param {Object} message
	 * @return {Object}
	 */
	messageDecorator: function (message) {

		return message;
	},

	/**
	 * @return {ResponseEntity}
	 */
	getResponseObject: function () {

		if (_.isEmpty(this.responseObject)) {
			this.responseObject = this.responseDecorator({
				redirect: null,
				message: [],
				payload: []
			});
		}

		return this.responseObject;
	},

	/**
	 * @param {Object} response
	 * @return {Object}
	 */
	responseDecorator: function (response) {

		return response;
	}

};


/**
 * @param {res} res
 * @return {Response}
 */
exports.extend = function (res) {

	_.each(_.functions(Response), function (key) {
		res[key] = Response[key].bind(res);
	});

	_.each(responseDecorators, function (decorator, key) {
		if (_.isFunction(res[key + 'Decorator']) && _.isFunction(decorator)) {
			res[key + 'Decorator'] = decorator.bind(res);
		}
	});

	return res;
};