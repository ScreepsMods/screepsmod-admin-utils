const path = require('path')
const authroute = require(path.join(path.dirname(require.main.filename), '../lib/game/api/auth'))

module.exports = (config) => {
  config.backend.on('expressPreConfig', app => {
    const { common: { storage: { env, db } } } = config
    config.common.storage.pubsub.subscribe('setSocketUpdateRate', setSocketUpdateRate)
    config.common.storage.pubsub.subscribe('setConstants', (constants) => {
      for (const [k, v] of Object.entries(constants)) {
        config.common.constants[k] = v
      }
    })
    app.get('/stats', errCatch(async (req, res) => {
      const stats = config.utils.getStats()
      res.json(stats)
    }))
    app.get('/api/user/world-start-room', authroute.tokenAuth, errCatch(async (req, res) => {
      const controllers = await db['rooms.objects'].find({ $and: [{ user: '' + req.user._id }, { type: 'controller' }] })
      let room = ''
      if (controllers.length) {
        room = controllers[Math.floor(Math.random() * controllers.length)].room
      }
      if (!room) {
        const rooms = await db.rooms.find({ _id: { $regex: '^[EW]\\d*5[NW]\\d*5$' } })
        if (rooms.length) {
          room = rooms[Math.floor(Math.random() * rooms.length)]._id
        }
      }
      if (!room) {
        room = 'W5N5' // Fallback just in case
      }
      res.json({
        ok: 1,
        room: [room]
      })
    }))
    app.get('/api/experimental/pvp', errCatch(async (req, res) => {
      const start = parseInt(req.query.start)
      const interval = Math.min(Math.max(parseInt(req.query.interval), 1), 10000) || 1000
      const time = parseInt(await env.get(env.keys.GAMETIME))
      const rooms = await db.rooms.find({ lastPvpTime: { $gte: (start || time) - interval } }, { lastPvpTime: true })
      const shard = await env.get(env.keys.SHARD_NAME)
      res.send({ ok: 1, time, pvp: { [shard]: { rooms } } })
    }))
  })

  function setSocketUpdateRate (value) {
    value = parseInt(value)
    const { env } = config.common.storage
    if (typeof value === 'number' && !Number.isNaN(value)) {
      config.backend.socketUpdateThrottle = value || 200
      env.set(env.keys.SOCKET_UPDATE_RATE, value)
      console.log(`Socket Update Rate set to ${value}ms`)
    } else {
      setSocketUpdateRate(200)
      // console.log(`Tick Rate failed to set ${value} ${typeof value}`)
    }
  }
}

function errCatch (fn) {
  return (req, res) => {
    fn(req, res).catch(err => {
      console.error(req.url, err)
      res.status(500).send({ error: err.stack })
    })
  }
}
