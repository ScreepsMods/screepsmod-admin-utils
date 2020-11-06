module.exports = config => {
  config.backend.socketModules.stats = require('./socket')(config)
  config.backend.on('expressPreConfig', app => {
    app.get('/stats', config.utils.errCatch(async (req, res) => {
      const stats = await config.utils.getStats()
      res.json(stats)
    }))
  })
}
