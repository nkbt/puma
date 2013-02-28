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
						callback("File does not exist: " + file);
					}
				});
			},
			'readFile': async.apply(fs.readFile, file, 'UTF-8')
		},
		function (error, result) {
			if (error) {
				return callback();
			}
			return res.send(result.readFile);
		}
	);

};

module.exports = function (staticRoot, bootstrapFile) {

	return function (req, res, next) {
		if (req.xhr || !!req.query.ajax) {
			next();
		} else {
			getBootstrapContent(res, staticRoot, bootstrapFile, next);
		}
	};
};