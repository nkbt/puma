'use strict';

/**
 * @file Exposes all publicly accessible Puma methods.
 * @author Nik Butenko <nikita.butenko@gmail.com>
 * @copyright Nik Butenko 2013
 * @version 20130228
 * @license MIT
 *
 * @see {@link module:puma puma}
 *
 * @example
 * // For default application layout with structure like:
 * // myblog
 * //   modules
 * //     admin
 * //       index-controller.js
 * //     index
 * //       index-controller.js
 * //   public
 * //     js
 * //     css
 * //     index.html
 *
 * var express = require('express');
 * var http = require('http');
 * var app = express();
 *
 * var {@link module:puma puma} = require({@link module:puma puma});
 *
 * // Set application Module Root for Puma. Required
 * {@link module:puma.setModuleRoot puma.setModuleRoot}(__dirname + '/modules');
 *
 * app.set('port', process.env.PORT || 3000);
 * app.set('case sensitive routing', true);
 * app.use(express.logger('dev'));
 * app.use(express.compress());
 * app.use(express.static(__dirname + '/public'));
 *
 * // Set Bootstrap file for any non-ajax request
 * app.use({@link module:puma.bootstrapMiddleware puma.bootstrapMiddleware}(__dirname + '/public', 'index.html'));
 *
 * app.use(express.bodyParser());
 * app.use(express.methodOverride());
 * app.use(app.router);
 *
 * // Set Puma error handler
 * app.use({@link module:puma.errorHandlerMiddleware puma.errorHandlerMiddleware});
 *
 * // Route /home to /index/index/index
 * app.get('/home', {@link module:puma.route puma.route}('index', 'index', 'index'));
 *
 * // Process all requests with default Puma router
 * app.all('*', {@link module:puma.routeDefault puma.routeDefault});
 *
 * http.createServer(app).listen(app.get('port'), function () { console.log("Express server listening on port " + app.get('port')); });
 */

/**
 * @module puma
 */

/**
 * @private
 */
var path = require('path');
var async = require('async');
var tool = require('./tool');
var _ = require('underscore');
var _s = require('underscore.string');

var config = {
	module: 'index',
	controller: 'index',
	action: 'index',
	moduleRoot: null
};


var getModuleFolder = function (_module) {
	if (_.isEmpty(config.moduleRoot)) {
		throw new Error("Module root not set. Use .setModuleRoot() in app configuration section");
	}
	return path.join(config.moduleRoot, _module);
};

var getControllerFile = function (_module, _controller) {
	return path.join(getModuleFolder(_module), _controller + '-controller.js');
};

/**
 * @private
 *
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
 * @private
 *
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
 * @private
 *
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
 * @private
 *
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

/**
 * @method
 * @callback module:dispatcher.render
 *
 * @param {Request} request
 * @param {Response} response
 * @param {Object} responseObject JavaScript object, that could be stringified to JSON
 */
var render = function (request, response, responseObject) {
	response.set('Content-type', 'application/json');
	response.send(JSON.stringify(responseObject));
};

/**
 * @private
 *
 * @param {Request} req
 * @param {Response} res
 */
var dispatch = function (req, res) {

	// Not more, then two executions (one "forward") during dispatch process
	var recursionLimit = 2,
		dispatchLoop;

	/**
	 * @private
	 * @param {Request} request
	 * @param {Response} response
	 */
	dispatchLoop = function dispatchLoop(request, response) {

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
						request.setRoute(config.module, 'error', 'not-found');
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
						request.setRoute(config.module, 'error', 'index');
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
 * Every application supposed to have modules. At least one default (<i>index</i>).
 * You have to provide Puma with full path to the directory that contains modules,
 * otherwise application will not work.
 *
 * @method
 *
 * @example
 * puma.setModuleRoot(__dirname + '/modules');
 *
 * @param {String} moduleRoot Absolute path to application modules
 */
exports.setModuleRoot = function (moduleRoot) {
	config.moduleRoot = moduleRoot;
};

/**
 * @method
 * @see {@link http://expressjs.com/api.html#app.all express app.all()}
 *
 * @example
 * app.get('/home', puma.route('index', 'index', 'index'));
 *
 * @param {String} moduleName
 * @param {String} controllerName
 * @param {String} actionName
 *
 * @return {Function} express-compatible callback to handle requests
 */
exports.route = function (moduleName, controllerName, actionName) {

	/**
	 * @param {Request} req
	 * @param {Response} res
	 */
	return function (req, res) {
		// Extending request and response objects to support history, controller, action, etc.
		req = require('./request').extend(req);
		res = require('./response').extend(res);

		if (moduleName && controllerName && actionName) {
			req.setRoute(moduleName, controllerName, actionName);
		} else {
			res.status(500);
			req.setRoute(config.module, 'error', 'index');
		}
		dispatch(req, res);
	};

};


/**
 * Default routing callback, express-compatible callback to handle requests
 *
 * @see {@link http://expressjs.com/api.html#app.all express app.all()}
 *
 * @param {Request} req
 * @param {Response} res
 *
 * @example
 * app.all('*', puma.routeDefault);
 *
 */
exports.routeDefault = function (req, res) {

	var router = require('./router');
	// Extending request and response objects to support history, controller, action, etc.
	req = require('./request').extend(req);
	res = require('./response').extend(res);

	router.match(req, getModuleFolder, function (error, moduleName, controllerName, actionName) {

		if (error) {
			res.addError(error);
			res.status(404);
			req.setRoute(config.module, 'error', 'not-found');
		} else {
			req.setRoute(
				moduleName || config.module,
				controllerName || config.controller,
				actionName || config.action
			);
		}
		dispatch(req, res);
	});
};


/**
 * Express-compatible error handling middleware. Creates unified JSON response for any error occurred
 *
 * @see {@link http://expressjs.com/api.html#middleware express Middleware}
 *
 * @example
 * app.use(puma.errorHandlerMiddleware);
 *
 * @param {Error|null} error
 * @param {req} req
 * @param {req} res
 * @param {Function} next This will never be called, since error handler should be the last one
 */
exports.errorHandlerMiddleware = function (error, req, res, next) {
	req = require('./request').extend(req);
	res = require('./response').extend(res);
	res.addError(error);
	res.status(500);
	req.setRoute(config.module, 'error', 'index');
	dispatch(req, res);
};


/**
 * Replace default JSON renderer with a custom one.
 * It is possible to use any templating engines, Puma is not restricted only to JSON.
 *
 * @method
 *
 * @example
 *puma.setRenderer(function (request, response, responseObject) {
 *	response.set('Content-type', 'application/json');
 *	response.send(JSON.stringify(responseObject));
 *});
 *
 * @param {module:dispatcher.render} func
 */
exports.setRenderer = function (func) {
	if (!_.isFunction(func)) {
		throw new Error('Argument is not a valid function');
	}
	render = func;
};


/**
 * By default Puma uses <b>index</b> as default module name. This can be redefined.
 *
 * @example
 * puma.setDefaultController('myDefaultModule');
 *
 * @param {String} moduleName
 */
exports.setDefaultModule = function (moduleName) {
	config.module = moduleName;
};


/**
 * By default Puma uses <b>index</b> as default controller name. This can be redefined.
 *
 * @example
 * puma.setDefaultController('myDefaultController');
 *
 * @param {String} controllerName
 */
exports.setDefaultController = function (controllerName) {
	config.controller = controllerName;
};


/**
 * By default Puma uses <b>index</b> as default action name. This can be redefined.
 *
 * @example
 * puma.setDefaultAction('myDefaultAction');
 *
 * @param {String} actionName
 */
exports.setDefaultAction = function (actionName) {
	config.action = actionName;
};

/**
 * Messages, payloads and response are initially simple objects, which later render to JSON.<br>
 * It is possible to decorate them with your own functions, for example adding more fields.<br>
 * Every decorator will be invoke for every <b>add</b> (addMessage, addPayload) operation
 * and as a result {@link Response} will always have modified objects
 *
 * @method
 *
 * @example
 *puma.setResponseDecorators({
 *	response: function (response) {
 *		response.date = new Date();
 *		return response;
 *	},
 *	payload: function (payload) {
 *		return payload;
 *	},
 *	message: function (message) {
 *		var customMessage = new CustomMessage(message);
 *		customMessage.setDate(new Date());
 *		return customMessage;
 *	}
 *});
 * @param {Object} decorators
 * @param {Function} decorators.response
 * @param {Function} decorators.payload
 * @param {Function} decorators.message
 */
exports.setResponseDecorators = require('./response').setResponseDecorators;


/**
 * @todo to be documented
 * @type {Function}
 */
exports.bootstrapMiddleware = require('./bootstrap');
