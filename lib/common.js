const EventEmitter = require('events').EventEmitter
const utils = require('@screeps/backend/lib/utils.js')
const YAML = require('yamljs')
const fs = require('fs')
const util = require('util')
const readFile = util.promisify(fs.readFile)

module.exports = (config) => {
  const { storage: { db, env, pubsub }, constants: C } = config.common
  Object.assign(env.keys, {
    SHARD_NAME: 'shardName',
    TICK_RATE: 'tickRate',
    TICK_TIMING: 'tickTiming',
    SOCKET_UPDATE_RATE: 'socketUpdateRate',
    LAST_TICKS: 'lastTicks'
  })

  config.utils = new EventEmitter()
  Object.assign(config.utils, {
    tickTiming: [],
    test () {
      console.log('Testing!')
    },
    errCatch (fn) {
      return (req, res) => {
        fn(req, res).catch(err => {
          console.error(req.url, err)
          res.status(500).send({ error: err.stack })
        })
      }
    },
    async addNPCTerminals (interval = 10) {
      interval = Math.max(interval, 1)
      let count = 0
      const rooms = await db.rooms.find({ bus: true })
      const roomNames = rooms.map(r => r._id)
      const ps = roomNames.map(async room => {
        let [x, y] = utils.roomNameToXY(room)
        if (x < 0) x = 1 + x
        if (y < 0) y = 1 + y
        if (x % interval === 0 && y % interval === 0) {
          const res = await db['rooms.objects'].findOne({ type: 'terminal', room })
          if (res) return
          count++
          await db['rooms.objects'].insert({
            type: 'terminal',
            room,
            x: 0,
            y: 0,
            npc: true,
            store: {},
            storeCapacity: C.TERMINAL_CAPACITY
          })
        }
      })
      await Promise.all(ps)
      return `Added ${count} terminals`
    },
    removeNPCTerminals () {
      return db['rooms.objects'].removeWhere({ type: 'terminal', npc: true })
    },
    removeBots () {
      return db.users.find()
        .then(users => {
          const ids = users.filter(u => u.bot).map(u => u._id)
          const ps = []
          ps.push(...ids.map(utils.respawnUser))
          ps.push(db.users.removeWhere({ _id: { $in: ids } }))
          ps.push(db['users.code'].removeWhere({ user: { $in: ids } }))
          ps.push(...ids.map(id => env.del(env.keys.MEMORY + id)))
          ps.push(...ids.map(id => env.del(env.keys.MEMORY_SEGMENTS + id)))
          return Promise.all(ps)
            .then(() => 'Bots removed successfully')
        })
    },
    setTickRate (value) {
      return 'setTickRate has been deprecated and will be removed in future versions, please use system.setTickDuration instead.'
    },
    getTickRate () {
      return 'getTickRate has been deprecated and will be removed in future versions, please use system.getTickDuration instead.'
    },
    setSocketUpdateRate (value) {
      if (!value) return 'Value required'
      config.common.storage.pubsub.publish('setSocketUpdateRate', value)
      return 'Socket update rate set to ' + value + 'ms'
    },
    getSocketUpdateRate () {
      return env.get(env.keys.SOCKET_UPDATE_RATE).then(value => `Socket update rate is ${value}ms`)
    },
    async setShardName (value) {
      await env.set(env.keys.SHARD_NAME, value)
      pubsub.publish('setShardName', value)
    },
    async reloadConfig () {
      let filename
      const configFiles = ['config.yml', 'config.yaml']
      for (const file of configFiles) {
        try {
          fs.statSync(file)
          filename = file
        } catch (_) { }
      }
      if (!filename) return
      console.log(`Loading config from ${filename}`)
      try {
        const { serverConfig = {} } = YAML.parse(await readFile(filename, 'utf8'))
        const conf = serverConfig
        console.log('Applying config', conf)
        const { common: { storage: { env, pubsub } } } = config
        const { constants, shardName, socketUpdateRate, tickRate, welcomeText, whitelist, statsToken } = conf
        if (config.backend) {
          if (welcomeText) {
            config.backend.welcomeText = welcomeText
          }
        }
        if (config.common) {
          if (constants) {
            const consts = Object.assign({}, config.common.constants, constants)
            pubsub.publish('setConstants', JSON.stringify(consts))
          }
        }
        if (tickRate) {
          env.set(env.keys.MAIN_LOOP_MIN_DURATION, tickRate)
          pubsub.publish('setTickRate', tickRate)
        }
        if (socketUpdateRate) {
          pubsub.publish('setSocketUpdateRate', socketUpdateRate)
        }
        if (whitelist) {
          env.set(env.keys.WHITELIST, JSON.stringify(Array.from(whitelist)))
        }
        if (shardName) {
          await env.set(env.keys.SHARD_NAME, shardName)
          pubsub.publish('setShardName', shardName)
        }
        if (statsToken) {
          config.utils.statsToken = statsToken
        }
        const lastConfig = config.utils.config || {}
        config.utils.config = conf
        config.utils.emit('config', conf)
        for (const [k, v] of Object.entries(conf)) {
          if (lastConfig[k] !== v) {
            config.utils.emit(`config:update:${k}`, v)
          }
        }
      } catch (err) {
      }
    },
    async banUser (username, remove = false) {
      const user = await db.users.findOne({ username: username })
      if (!user) {
        return `Can't find user "${username}"`
      }

      const _id = user._id
      if (!remove) {
        if (user.active === 0) {
          return `User "${username}" ${_id} is already banned.`
        }
        await db.users.update({ _id }, { $set: { active: 0 } })
        console.log(`Suspended user "${username}" ${_id}`)
        return `Suspended user "${username}" ${_id}`
      } else {
        await utils.respawnUser(_id)
        // Remove the bot user from the database
        await db.users.removeWhere({ _id })
        await db['users.code'].removeWhere({ user: _id })
        await env.del(env.keys.MEMORY + _id)
        await env.del(env.keys.MEMORY_SEGMENTS + _id)
        console.log(`Removed user "${username}" ${_id}`)
        return `Removed user "${username}" ${_id}`
      }
    },
    async unbanUser (username) {
      const user = await db.users.findOne({ username: username })
      if (!user) {
        return `Can't find user "${username}"`
      } else if (user.active !== 0) {
        return `User "${username}" ${user._id} is not banned.`
      }

      await db.users.update({ _id: user._id }, { $set: { active: 10000 } })
      console.log(`Unbanned user "${username}" ${user._id}`)
      return `Unbanned user "${username}" ${user._id}`
    }
  })

  config.utils.addNPCTerminals._help = 'addNPCTerminals(interval = 10)'
  config.utils.removeNPCTerminals._help = 'removeNPCTerminals()'
  config.utils.removeBots._help = 'removeBots()'
  config.utils.setTickRate._help = 'setTickRate(value) Sets tick rate (in ms)'
  config.utils.getTickRate._help = 'getTickRate() Returns current tick rate'
  config.utils.setSocketUpdateRate._help = 'setSocketUpdateRate(value) Sets socket update rate (in ms)'
  config.utils.getSocketUpdateRate._help = 'getSocketUpdateRate() Returns current socket update rate'
  config.utils.setShardName._help = 'setShardName(value) Sets the shard name'
  config.utils.banUser._help = 'banUser(username, remove = false) Ban the specified user from the server.\n' +
    '\tPassing `false` will suspend their CPU usage, `true` will delete their data entirely.'
  config.utils.unbanUser._help = 'unbanUser(username) Unban the specified user from the server.'

  Object.defineProperty(config.utils, '_help', {
    get () { // Using a getter here so that loaded services are also included
      const funcs = []
      for (const k in config.utils) {
        const help = config.utils[k] && config.utils[k]._help
        if (help) funcs.push(help)
      }
      return `Admin Utilities\n${funcs.map(f => `* ${f}`).join('\n')}`
    }
  })
}
