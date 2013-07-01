'use strict';

/**
 * @module bootstrap
 */

/**
 * @private
 */
var async = require('async');
var path = require('path');
var fs = require('fs');
var bootstrapDefault = 'bootstrap.html';

var getBootstrapContent = function (res, staticRoot, bootstrapFile, callback) {

	var file = path.join(staticRoot, bootstrapFile || bootstrapDefault);
	async.series(
		{
			'exists': function (callback) {
				fs.exists(file, function (exists) {
					if (exists) {
						callback(null);
					} else {
						callback(new Error("File does not exist: " + file));
					}
				});
			},
			'readFile': async.apply(fs.readFile, file, 'UTF-8')
		},
		function (error, result) {
			if (error) {
				return callback(error);
			}
			return res.send(result.readFile);
		}
	);

};

module.exports = function (staticRoot, bootstrapFile) {

	return function (req, res, next) {
		req = require('./request').extend(req);
		if (req.isAjax()) {
			next(null);
		} else {
			getBootstrapContent(res, staticRoot, bootstrapFile, next);
		}
	};
};