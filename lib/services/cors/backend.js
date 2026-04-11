/*  config.yml
    cors:
      origins: string[]        # list of allowed origins; absent/empty = CORS disabled
      allowedHeaders: string[] # optional override
      exposedHeaders: string[] # optional override
*/

const cors = require('cors')

const DEFAULT_ALLOWED_HEADERS = ['Authorization', 'Content-Type', 'X-Token', 'X-Username', 'X-Server-Password']
const DEFAULT_EXPOSED_HEADERS = ['X-Token', 'X-Username', 'X-Server-Password']
const ALLOWED_METHODS = 'GET,HEAD,PUT,PATCH,POST,DELETE'

module.exports = function (config) {
  config.cors = {
    origins: [],
    allowedHeaders: DEFAULT_ALLOWED_HEADERS.slice(),
    exposedHeaders: DEFAULT_EXPOSED_HEADERS.slice()
  }

  config.utils.on('config:update:cors', function (v) {
    if (!v || typeof v !== 'object') return
    config.cors.origins = Array.isArray(v.origins) ? v.origins : []
    config.cors.allowedHeaders = v.allowedHeaders || DEFAULT_ALLOWED_HEADERS.slice()
    config.cors.exposedHeaders = v.exposedHeaders || DEFAULT_EXPOSED_HEADERS.slice()
  })

  const corsMiddleware = cors(function (req, cb) {
    const { origins, allowedHeaders, exposedHeaders } = config.cors
    if (!origins || !origins.length) return cb(null, { origin: false })
    cb(null, {
      origin: origins,
      methods: ALLOWED_METHODS,
      allowedHeaders,
      exposedHeaders,
      preflightContinue: false
    })
  })

  config.backend.on('expressPreConfig', function (app) {
    app.use(corsMiddleware)
  })
}
