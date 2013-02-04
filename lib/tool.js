"use strict";

var fs = require('fs');
var async = require('async');

exports.fileExists = async.memoize(fs.exists);
