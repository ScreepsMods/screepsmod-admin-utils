const authroute = require.main.require('@screeps/backend/lib/game/api/auth')
const util = require('util')
const fs = require('fs')

const readFile = util.promisify(fs.readFile)

module.exports = (config) => {
  config.backend.features = config.backend.features || []
  config.backend.features.push({
    name: 'screepsmod-admin-utils',
    version: require('../package.json').version
  })
  config.backend.on('expressPreConfig', app => {
    const { common: { storage: { env, db, pubsub } } } = config
    env.get(env.keys.TICK_RATE).then(async val => {
      if (val) {
        env.del(env.keys.TICK_RATE)
        await env.set(env.keys.MAIN_LOOP_MIN_DURATION, val)
        pubsub.publish('setTickRate', val)
      }
    })
    config.common.storage.pubsub.subscribe('setSocketUpdateRate', setSocketUpdateRate)
    config.common.storage.pubsub.subscribe('setConstants', (constants) => {
      for (const [k, v] of Object.entries(constants)) {
        config.common.constants[k] = v
      }
    })
    config.common.storage.pubsub.subscribe('tickTiming', timing => {
      config.utils.tickTiming = [JSON.parse(timing), ...config.utils.tickTiming.slice(0, 99)]
    })
    app.get('/', (req, res) => res.redirect('/web'))
    app.use('/web', require('screepsmod-admin-utils-ui'))
    app.get('/api/mods', async (req, res) => {
      const { mods = [] } = JSON.parse(await readFile('mods.json')) || {}
      const ret = []
      for (const mod of mods) {
        const [name] = mod.match(/screepsmod-[\w-]+/) || []
        if (name) {
          ret.push(name)
        }
      }
      res.json(ret)
    })
    app.get('/api/version', config.utils.errCatch(async (req, res) => {
      const users = await db.users.count({ $and: [{ active: { $ne: 0 } }, { cpu: { $gt: 0 } }, { bot: { $aeq: null } }] })
      const { welcomeText, customObjectTypes, historyChunkSize, socketUpdateThrottle, renderer, features = [], additionalServerData = {} } = config.backend
      const packageVersion = require.main.require('screeps').version
      const shards = [await env.get(env.keys.SHARD_NAME)]
      const useNativeAuth = !process.env.STEAM_KEY
      const result = {
        ok: 1,
        packageVersion,
        protocol: 14,
        useNativeAuth,
        users,
        serverData: {
          shards,
          welcomeText,
          customObjectTypes,
          historyChunkSize,
          socketUpdateThrottle,
          renderer,
          features,
          ...additionalServerData
        }
      }
      res.json(result)
    }))
    app.get('/api/game/room-objects', config.utils.errCatch(async (req, res) => {
      const { room } = req.query
      const objects = await db['rooms.objects'].find({ room })
      const userIds = new Set(objects.map(o => o.user).filter(Boolean))
      userIds.add('2')
      userIds.add('3')
      const users = _.keyBy(await db.users.find({ _id: { $in: Array.from(userIds) } }, { username: 1, badge: 1 }), '_id')
      return { users, objects }
    }))
    app.get('/api/game/shards/info', config.utils.errCatch(async (req, res) => {
      const lastTicks = JSON.parse((await env.get(env.keys.LAST_TICKS)) || '[]').slice(0, 30)
      const shard = {
        cpuLimit: 0,
        lastTicks,
        name: await env.get(env.keys.SHARD_NAME),
        rooms: await db.rooms.count(),
        tick: lastTicks.reduce((a, b) => a + b, 0) / lastTicks.length
      }
      res.json({
        ok: 1,
        shards: [shard]
      })
    }))
    app.get('/api/user/world-start-room', authroute.tokenAuth, config.utils.errCatch(async (req, res) => {
      const controllers = await db['rooms.objects'].find({ $and: [{ user: '' + req.user._id }, { type: 'controller' }] })
      let room = ''
      if (controllers.length) {
        room = controllers[Math.floor(Math.random() * controllers.length)].room
      }
      if (!room) {
        const rooms = await db.rooms.find({ _id: { $regex: '^[EW]\\d*5[NS]\\d*5$' } })
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
    app.get('/api/experimental/pvp', config.utils.errCatch(async (req, res) => {
      const start = parseInt(req.query.start)
      const interval = Math.min(Math.max(parseInt(req.query.interval), 1), 10000) || 1000
      const time = parseInt(await env.get(env.keys.GAMETIME))
      const rooms = await db.rooms.find({ lastPvpTime: { $gte: (start || time) - interval } }, { lastPvpTime: true })
      const shard = await env.get(env.keys.SHARD_NAME)
      res.send({ ok: 1, time, pvp: { [shard]: { rooms } } })
    }))
    app.get('/api/experimental/nukes', config.utils.errCatch(async (req, res) => {
      const nukes = await db['rooms.objects'].find({ type: 'nuke' })
      const shard = await env.get(env.keys.SHARD_NAME)
      res.send({ ok: 1, nukes: { [shard]: nukes } })
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
