'use strict';

var path = require('path');
var async = require('async');
var _ = require('underscore');
var _s = require('underscore.string');
var fileExists = require('./tool').fileExists;

var defaultModule = 'index';
var defaultController = 'index';
var defaultAction = 'index';

var moduleRoot = null;
var getModuleFolder = function (module) {
	return path.join(moduleRoot, module);
};
var getControllerFolder = function (module, controller) {
	return path.join(getModuleFolder(module), controller);
};
var getControllerFile = function (module, controller) {
	return path.join(getControllerFolder(module, controller), controller + '-controller.js');
};
var getActionFile = function (module, controller, action) {
	return path.join(getControllerFolder(module, controller), 'views', controller + '-' + action + '.ejs');
};


/**
 * @param {Request} req
 * @param {Function} callback
 */
var initModule = function (req, callback) {

	var moduleName = req.getModule();
	fileExists(getModuleFolder(moduleName), function (exists) {
		if (exists) {
			callback(null);
		} else {
			callback("Module " + moduleName + " does not exist");
		}
	});
};


/**
 * @param {Request} req
 * @param {Function} callback
 */
var initController = function (req, callback) {

	var moduleName = req.getModule(),
		controllerName = req.getController(),
		controllerFile = getControllerFile(moduleName, controllerName);

	fileExists(controllerFile, function (exists) {
		if (exists) {
			callback(null, require(controllerFile));
		} else {
			callback("Controller " + controllerName + " does not exist");
		}
	});

};


/**
 * @param {Request} req
 * @param {Object} controller
 * @param {Function} callback
 */
var initAction = function (req, controller, callback) {

	var moduleName = req.getModule(),
		controllerName = req.getController(),
		actionName = req.getAction(),
		actionFunctionName = _s.camelize(actionName);

	if (_.isUndefined(controller[actionFunctionName])) {
		callback('Action not implemented: ' + actionFunctionName);
		return;
	}

	fileExists(getActionFile(moduleName, controllerName, actionName), function (exists) {
		if (exists) {
			callback(null, controller[actionFunctionName]);
		} else {
			callback("View file not found: " + req.getRoute());
		}
	});

};


/**
 * @param {Request} req
 * @param {Function} action
 * @param {Function} callback
 */
var runAction = function (req, action, callback) {

	action(req, function (error, viewVars) {
		if (typeof (viewVars) !== 'object') {
			viewVars = {};
		}
		callback(error, viewVars);
	});
};


/**
 * @param {Request} req
 * @param {Response} res
 * @param {Object} viewVars
 * @param {Function} callback
 */
var renderView = function (req, res, viewVars, callback) {
	var view;

	/**
	 * @type {View}
	 */
	view = new (require('./view').View)(req, res, viewVars);
	return view.render(
		path.relative(
			moduleRoot,
			getActionFile(req.getModule(), req.getController(), req.getAction())
		).replace(/\\/g, '/').replace('.ejs', ''),
		callback
	);
};


/**
 * @param {Request} req
 * @param {Response} res
 * @param {Object} viewVars
 * @param {Function} callback
 */
var renderJson = function (req, res, viewVars, callback) {

	return callback(null, viewVars);
};


/**
 * @param {Request} req
 * @param {Response} res
 * @param {Object} viewVars
 * @param {Function} callback
 */
var render = function (req, res, viewVars, callback) {

	if (req.getContext() === 'json') {
		renderJson(req, res, viewVars, callback);
	} else {
		renderView(req, res, viewVars, callback);
	}
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
					response.setResult(false, error);
					request.setRoute(defaultModule, 'error', 'not-found');
					dispatchLoop(request, response);
					return;
				}

				async.waterfall(
					[
						async.apply(runAction, request, action),
						async.apply(render, request, response)
					],
					function (error, html) {
						response.setResult(!error, error);
						if (error && recursionLimit > 0) {
							request.setRoute(defaultModule, 'error', 'index');
							dispatchLoop(request, response);
						} else {
							response.send(html);
						}
					}
				);


			}
		);

		recursionLimit = recursionLimit - 1;
	};

	dispatchLoop(req, res);

};


/**
 * @param {String} root
 */
exports.setModuleRoot = function (root) {
	moduleRoot = root;
};

/**
 * @return {String}
 */
exports.getModuleRoot = function () {
	return moduleRoot;
};

/**
 * @param {String} moduleName
 */
exports.setDefaultModule = function (moduleName) {
	defaultModule = moduleName;
};

/**
 * @return {String}
 */
exports.getDefaultModule = function () {
	return defaultModule;
};

/**
 * @param {String} controllerName
 */
exports.setDefaultController = function (controllerName) {
	defaultController = controllerName;
};

/**
 * @return {String}
 */
exports.getDefaultController = function () {
	return defaultController;
};

/**
 * @param {String} actionName
 */
exports.setDefaultAction = function (actionName) {
	defaultAction = actionName;
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


var init = function(req, res) {
	// Extending request and response objects to support history, controller, action, etc.
	require('./request').extend(req);
	require('./response').extend(res);
};


/**
 * @param {String} module
 * @param {String} controller
 * @param {String} action
 * @return {Function}
 */
exports.route = function (module, controller, action) {

	/**
	 * @param {Request} req
	 * @param {Response} res
	 */
	return function (req, res) {
		init(req, res);

		if (module && controller && action) {
			req.setRoute(module, controller, action);
		} else {
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

	init(req, res);

	router.match(req, function (error, module, controller, action) {

		if (error) {
			res.setResult(false, error);
			req.setRoute(defaultModule, 'error', 'not-found');
		} else {
			req.setRoute(
				module || defaultModule,
				controller || defaultController,
				action || defaultAction
			);
		}

		dispatch(req, res);

	});

};
