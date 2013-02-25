'use strict';

var dispatcher = require('./dispatcher');

exports.setModuleRoot = dispatcher.setModuleRoot;
exports.route = dispatcher.route;
exports.routeDefault = dispatcher.routeDefault;
exports.errorHandlerMiddleware = dispatcher.errorHandlerMiddleware;
exports.setRenderer = dispatcher.setRenderer;
exports.setResponseDecorators = require('./response').setResponseDecorators;
exports.bootstrapMiddleware = require('./bootstrap');
