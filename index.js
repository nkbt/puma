module.exports = process.env.PUMA_COV
  ? require('./lib-cov/puma')
  : require('./lib/puma');