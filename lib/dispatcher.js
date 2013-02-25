'use strict';


var path = require('path');
var async = require('async');
var tool = require('./tool');
var _ = require('underscore');
var _s = require('underscore.string');

var defaultModule = 'index';
var defaultController = 'index';
var defaultAction = 'index';

var moduleRoot = null;

var getModuleFolder = function (_module) {
	if (_.isEmpty(moduleRoot)) {
		throw new Error("Module root not set. Use .setModuleRoot() in app configuration section");
	}
	return path.join(moduleRoot, _module);
};

var getControllerFile = function (_module, _controller) {
	return path.join(getModuleFolder(_module), _controller + '-controller.js');
};

/**
 * @param {Request} req
 * @param {Function} callback
 */
var initModule = function (req, callback) {

	var _module = req.getModule(),
		moduleFolder = getModuleFolder(_module);

	tool.cachedFsExists(moduleFolder, function (exists) {
		if (exists) {
			callback(null);
		} else {
			callback(new Error("Module " + _module + " does not exist"));
		}
	});
};

/**
 * @param {Request} req
 * @param {Function} callback
 */
var initController = function (req, callback) {

	var _module = req.getModule(),
		_controller = req.getController(),
		_controllerFile = getControllerFile(_module, _controller);

	tool.cachedFsExists(_controllerFile, function (exists) {
		if (exists) {
			callback(null, require(_controllerFile));
		} else {
			callback(new Error("Controller " + _controller + " does not exist"));
		}
	});

};


/**
 * @param {Request} req
 * @param {Object} controller
 * @param {Function} callback
 */
var initAction = function (req, controller, callback) {

	var _action = req.getAction(),
		_actionFunctionName = _s.camelize(_action);

	if (_.isUndefined(controller[_actionFunctionName])) {
		callback(new Error('Action not implemented: ' + _actionFunctionName));
		return;
	}

	callback(null, controller[_actionFunctionName]);

};


/**
 * @param {Request} req
 * @param {Function} action
 * @param {Function} callback
 */
var runAction = function (req, action, callback) {

	action(req, function (error, payload, message) {
		if (!_.isObject(payload)) {
			payload = {};
		}
		if (!_.isString(message)) {
			message = "";
		}
		callback(error, payload, message);
	});
};

var render = function (request, response, responseObject) {
	response.set('Content-type', 'application/json');
	response.send(JSON.stringify(responseObject));
};

exports.setRenderer = function (func) {
	if (!_.isFunction(func)) {
		throw new Error('Argument is not a valid function');
	}
	render = func;
};

/**
 * @param {Request} req
 * @param {Response} res
 */
var dispatch = function (req, res) {

	// Not more, then two executions (one "forward") during dispatch process
	var recursionLimit = 2,
		dispatchLoop;

	/**
	 * @param {Request} request
	 * @param {Response} response
	 */
	dispatchLoop = function (request, response) {

		async.waterfall(
			[
				async.apply(initModule, request),
				async.apply(initController, request),
				async.apply(initAction, request)
			],
			function (error, action) {

				if (error) {
					if (request.getController() !== 'error' && recursionLimit > 0) {
						response.addMessage({
							isMessage: false,
							isError: true,
							text: error instanceof Error ? error.message : error
						});
						response.status(404);
						request.setRoute(defaultModule, 'error', 'not-found');
						dispatchLoop(request, response);
					} else {
						render(request, response, response.getResponseObject());
					}
					return;
				}

				runAction(request, action, function (error, payload, message) {
					if (error && request.getController() !== 'error' && recursionLimit > 0) {
						response.addMessage({
							isMessage: false,
							isError: true,
							text: error instanceof Error ? error.message : error
						});
						response.status(500);
						request.setRoute(defaultModule, 'error', 'index');
						dispatchLoop(request, response);
						return;
					}

					if (!_s.isBlank(message)) {
						response.addMessage({
							isMessage: true,
							isError: false,
							text: message
						});
					}

					if (!_.isEmpty(payload)) {
						response.addPayload({
							id: request.getPayloadId(),
							data: payload
						});
					}

					render(request, response, response.getResponseObject());
				});

			}
		);

		recursionLimit = recursionLimit - 1;
	};

	dispatchLoop(req, res);

};

/**
 * @param {String} _moduleRoot
 */
exports.setModuleRoot = function (_moduleRoot) {
	moduleRoot = _moduleRoot;
};

/**
 * @return {String}
 */
exports.getModuleRoot = function () {
	return moduleRoot;
};

/**
 * @param {String} _module
 */
exports.setDefaultModule = function (_module) {
	defaultModule = _module;
};

/**
 * @return {String}
 */
exports.getDefaultModule = function () {
	return defaultModule;
};

/**
 * @param {String} _controller
 */
exports.setDefaultController = function (_controller) {
	defaultController = _controller;
};

/**
 * @return {String}
 */
exports.getDefaultController = function () {
	return defaultController;
};

/**
 * @param {String} _action
 */
exports.setDefaultAction = function (_action) {
	defaultAction = _action;
};

/**
 * @return {String}
 */
exports.getDefaultAction = function () {
	return defaultAction;
};


/**
 * @type {Function}
 * @param {String} module
 * @return {String}
 */
exports.getModuleFolder = getModuleFolder;


/**
 * @param {String} _module
 * @param {String} _controller
 * @param {String} _action
 * @return {Function}
 */
exports.route = function (_module, _controller, _action) {

	/**
	 * @param {Request} req
	 * @param {Response} res
	 */
	return function (req, res) {
		// Extending request and response objects to support history, controller, action, etc.
		req = require('./request').extend(req);
		res = require('./response').extend(res);

		if (_module && _controller && _action) {
			req.setRoute(_module, _controller, _action);
		} else {
			res.status(500);
			req.setRoute(defaultModule, 'error', 'index');
		}
		dispatch(req, res);
	};

};

/**
 * @param {Request} req
 * @param {Response} res
 */
exports.routeDefault = function (req, res) {

	var router = require('./router');
	// Extending request and response objects to support history, controller, action, etc.
	req = require('./request').extend(req);
	res = require('./response').extend(res);

	router.match(req, function (error, _module, _controller, _action) {

		if (error) {
			res.addError(error);
			res.status(404);
			req.setRoute(defaultModule, 'error', 'not-found');
		} else {
			req.setRoute(
				_module || defaultModule,
				_controller || defaultController,
				_action || defaultAction
			);
		}
		dispatch(req, res);

	});

};


exports.errorHandlerMiddleware = function (error, req, res, next) {
	req = require('./request').extend(req);
	res = require('./response').extend(res);
	res.addError(error);
	res.status(500);
	req.setRoute(defaultModule, 'error', 'index');
	dispatch(req, res);
};

