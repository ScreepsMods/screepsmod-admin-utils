const battledetect = require('./battledetect')

let config

module.exports = conf => {
  config = conf
  const { common: { storage: { env, db } } } = config
  require('./wrapper').init(config)
  if (config.backend) {
    config.backend.socketModules.warpath = require('./socket')(config)
    config.backend.on('expressPreConfig', app => {
      app.get('/api/warpath/battles', async (req, res) => {
        const gameTime = parseInt(await env.get(env.keys.GAMETIME))
        const start = parseInt(req.query.start) || 0
        const interval = Math.min(Math.max(parseInt(req.query.interval), 1), 10000) || 1000
        res.json(await config.utils.warpath.getCurrentBattles(gameTime, interval, start))
      })
    })
  }
  config.utils.warpath = {
    async getCurrentBattles (gameTime, interval = 1000, start = 0) {
      const lookback = Math.min(Math.max(parseInt(interval), 1), 10000) || 1000
      const from = parseInt(start) || 0
      const rooms = await db.rooms.find({ lastPvpTime: { $gte: (from || gameTime) - lookback } }, { lastPvpTime: true })
      const shard = await env.get(env.keys.SHARD_NAME)
      const battles = []
      for (const { _id: room, lastPvpTime } of rooms) {
        const details = await battledetect.battleDetails(room, shard, lastPvpTime)
        if (details.classification === false) {
          continue
        }
        battles.push({
          room,
          shard,
          ...details
        })
      }
      return battles
    }
  }
}
