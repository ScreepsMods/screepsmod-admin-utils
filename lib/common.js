const EventEmitter = require('events').EventEmitter
const path = require('path')
const utils = require(path.join(path.dirname(require.main.filename), '../../backend/lib/utils'))
const YAML = require('yamljs')
const fs = require('fs')
const util = require('util')
const readFile = util.promisify(fs.readFile)

module.exports = (config) => {
  const { db, env } = config.common.storage
  config.utils = new EventEmitter()
  Object.assign(config.utils, {
    test () {
      console.log('Testing!')
    },
    addNPCTerminals (interval = 10) {
      interval = Math.max(interval, 1)
      let count = 0
      return db.rooms.find({ bus: true })
        .then(rooms => rooms.map(r => r._id))
        .then(rooms => {
          let ps = rooms.map(room => {
            let [x, y] = utils.roomNameToXY(room)
            if (x < 0) x = 1 + x
            if (y < 0) y = 1 + y
            if (x % interval === 0 && y % interval === 0) {
              return Promise.resolve()
                .then(() => db['rooms.objects'].findOne({ type: 'terminal', room }))
                .then(res => {
                  if (res) return
                  count++
                  return db['rooms.objects'].insert({
                    type: 'terminal',
                    room,
                    x: 0,
                    y: 0,
                    npc: true
                  })
                })
            }
          })
          return Promise.all(ps)
        })
        .then(() => {
          return `Added ${count} terminals`
        })
    },
    removeNPCTerminals () {
      return db['rooms.objects'].removeWhere({ type: 'terminal', npc: true })
    },
    removeBots () {
      return db.users.find()
        .then(users => {
          let ids = users.filter(u => u.bot).map(u => u._id)
          let ps = []
          ps.push(...ids.map(utils.respawnUser))
          ps.push(db.users.removeWhere({ _id: { $in: ids } }))
          ps.push(db['users.code'].removeWhere({ user: { $in: ids } }))
          ps.push(...ids.map(id => env.del(env.keys.MEMORY + id)))
          ps.push(...ids.map(id => env.del(env.keys.MEMORY_SEGMENTS + id)))
          return Promise.all(ps)
            .then(() => `Bots removed successfully`)
        })
    },
    async getWhitelist () {
      const users = JSON.parse(await env.get('whitelist') || '[]')
      const usersList = users.join(', ')
      return `Whitelisted users: ${usersList}`
    },
    async addWhitelistUser (user) {
      user = user.toLowerCase()
      const whitelist = JSON.parse(await env.get('whitelist') || '[]')
      whitelist.push(user)
      await env.set('whitelist', JSON.stringify(whitelist))
      return `${user} added to whitelist`
    },
    async removeWhitelistUser (user) {
      user = user.toLowerCase()
      const whitelist = new Set(JSON.parse(await env.get('whitelist') || '[]'))
      whitelist.delete(user)
      await env.set('whitelist', JSON.stringify(Array.from(whitelist)))
      return `${user} removed from whitelist`
    },
    setTickRate (value) {
      if (!value) return 'Value required'
      config.common.storage.pubsub.publish('setTickRate', value)
      return 'Tick rate set to ' + value + 'ms'
    },
    getTickRate () {
      return env.get('tickRate').then(value => `Tick rate is ${value}ms`)
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
        const { welcomeText, constants, tickRate, whitelist } = conf
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
          pubsub.publish('setTickRate', tickRate)
        }
        if (whitelist) {
          env.set('whitelist', JSON.stringify(Array.from(whitelist)))
        }
      } catch (err) {
      }
    }
  })

  config.utils.addNPCTerminals._help = `addNPCTerminals(interval = 10)`
  config.utils.removeNPCTerminals._help = `removeNPCTerminals()`
  config.utils.removeBots._help = `removeBots()`
  config.utils.getWhitelist._help = `getWhitelist()`
  config.utils.addWhitelistUser._help = `addWhitelistUser(username)`
  config.utils.removeWhitelistUser._help = `removeWhitelistUser(username)`
  config.utils.setTickRate._help = `setTickRate(value) Sets tick rate (in ms)`
  config.utils.getTickRate._help = `getTickRate() Returns current tick rate`
  let funcs = []
  for (let k in config.utils) {
    let help = config.utils[k] && config.utils[k]._help
    if (help) funcs.push(help)
  }
  config.utils._help = `Admin Utilities\n${funcs.map(f => `* ${f}`).join('\n')}`
}
