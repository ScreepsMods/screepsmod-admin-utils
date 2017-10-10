const EventEmitter = require('events').EventEmitter
const path = require('path')
const utils = require(path.join(path.dirname(require.main.filename), '../../backend/lib/utils'))

module.exports = function common (config) {
  const { db, env } = config.common.storage
  config.utils = new EventEmitter()
  Object.assign(config.utils, {
    test () {
      console.log('Testing!')
    },
    addNPCTerminals (interval = 10) {
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
      return db.users.find({ $exists: { bot: true } })
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
    }
  })

  config.utils.addNPCTerminals._help = `addNPCTerminals(interval = 10)`
  config.utils.removeNPCTerminals._help = `removeNPCTerminals()`
  config.utils.removeBots._help = `removeBots()`
  let funcs = []
  for (let k in config.utils) {
    let help = config.utils[k] && config.utils[k]._help
    if (help) funcs.push(help)
  }
  config.utils._help = `Admin Utilities\n${funcs.map(f => `* ${f}`).join('\n')}`
}
