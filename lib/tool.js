"use strict";

/**
 * @module tool
 */

/**
 * @private
 */
var fs = require('fs');
var async = require('async');

/**
 * @type {*}
 */
exports.cachedFsExists = async.memoize(fs.exists);
