"use strict";

/**
 * @module router
 */

/**
 * @private
 */
var tool = require('./tool');
var _ = require('underscore');

/**
 * @param {Request} req
 * @param {Function} getModuleFolder
 * @param {Function} callback
 * @returns {Function}
 *
 */
exports.match = function (req, getModuleFolder, callback) {

	// Setting default module/controller/action route
	var params = req.params[0].split('/'),
		_module = null,
		_controller = null,
		_action = null,
		paramsSize = _.size(params);

	/**
	 * Some static files
	 */
	if (req.params[0].match(/\./)) {
		return callback("Not found");
	}

	/**
	 * "/"
	 */
	if (paramsSize === 2 && _.isEmpty(params[1])) {
		return callback(null, _module, _controller, _action);
	}

	/**
	 * "/module" OR "/controller"
	 */
	if (paramsSize === 2) {
		return tool.cachedFsExists(getModuleFolder(params[1]), function (exists) {
			if (exists) {
				_module = params[1] || _module;
			} else {
				_controller = params[1] || _controller;
			}
			return callback(null, _module, _controller, _action);
		});
	}

	/**
	 * "/module/controller" OR "/controller/action"
	 */
	if (paramsSize === 3) {
		return tool.cachedFsExists(getModuleFolder(params[1]), function (exists) {
			if (exists) {
				_module = params[1] || _module;
				_controller = params[2] || _controller;
			} else {
				_controller = params[1] || _controller;
				_action = params[2] || _action;
			}
			return callback(null, _module, _controller, _action);
		});
	}

	/**
	 * "/module/controller" OR "/controller/action"
	 */
	if (paramsSize === 4) {
		_module = params[1] || _module;
		_controller = params[2] || _controller;
		_action = params[3] || _action;
		return callback(null, _module, _controller, _action);
	}

	return callback("Incorrect route: " + [_module, _controller, _action].join('/'));
};