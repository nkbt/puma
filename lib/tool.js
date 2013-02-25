"use strict";

var fs = require('fs');
var async = require('async');

exports.cachedFsExists = async.memoize(fs.exists);
