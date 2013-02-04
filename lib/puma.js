'use strict';

var express = require('express');
var http = require('http');

var app = express();
exports.express = express;
exports.app = app;


var dispatcher = require('./dispatcher');
var staticRoot = null;


var defaultConfiguration = function () {

	app.set('port', process.env.PORT || 3000);
	app.set('case sensitive routing', true);
	app.set('view engine', 'ejs');
	app.set('views', dispatcher.getModuleRoot());

	app.use(express.logger('dev'));
	app.use(express.compress());
	app.use(express.static(staticRoot));
	app.use(express.bodyParser()); // {keepExtensions: true}
	app.use(express.methodOverride());
	app.use(app.router);
	app.use(express.errorHandler({dumpExceptions: true, showStack: true}));
};


/**
 * @param {String} moduleRoot
 */
exports.setModuleRoot = dispatcher.setModuleRoot;


/**
 * @param {String} root
 */
exports.setStaticRoot = function (root) {
	staticRoot = root;
};


/**
 * @param {String} method
 * @param {String} match
 * @param {String} module
 * @param {String} controller
 * @param {String} action
 */
exports.addRoute = function (method, match, module, controller, action) {
	app[method](match, dispatcher.route(module, controller, action));
};


exports.run = function () {
	app.configure(defaultConfiguration);

	app.all('*', dispatcher.routeDefault);

	http.createServer(app).listen(app.get('port'), function () {
		console.log("Express server listening on port " + app.get('port'));
	});
};


