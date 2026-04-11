/*  config.yml
    morgan: dev  # any morgan format string; absent or false = disabled
*/

const morgan = require('morgan')

const noop = (req, res, next) => next()

module.exports = function (config) {
  let morganMiddleware = noop

  config.utils.on('config:update:morgan', function (v) {
    morganMiddleware = v ? morgan(v) : noop
  })

  config.backend.on('expressPreConfig', function (app) {
    app.use(function (req, res, next) {
      morganMiddleware(req, res, next)
    })
  })
}
