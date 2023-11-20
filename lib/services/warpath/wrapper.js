const _ = require('lodash')

// const ACTIVE_THRESHOLD = 0.5 * (60)
// const DELETE_THRESHOLD = 5 * (60)

let config
let db
let env

function init (conf) {
  config = conf
  db = config.common.storage.db
  env = config.common.storage.env
}

const api = {
  async roomobjects (room, shard) {
    return _.groupBy(await db['rooms.objects'].find({ room }), 'type')
  },
  async time (shard) {
    const gameTime = await env.get('gameTime')
    return { time: +gameTime }
  }
}

const users = {
  async getUsername (_id) {
    const { username } = await db.users.findOne({ _id })
    return username
  }
}

const battlenet = {
  async getBattleNotificationRecord (room, shard, service) {
    return db['warpath.notifications'].findOne({ room, shard, service })
  },
  async recordBattleNotification (room, shard, service, classification) {
    const lastNotification = Date.now()
    await db['warpath.notifications'].update({ room, shard, service }, { room, shard, service, classification, lastNotification }, { upsert: true })
  },
  async recordBattle (room, shard, details) {
    const now = Date.now()
    const { attackers, classification, defender, lastPvpTime } = details
    const rec = (await db['warpath.battles'].findOne({ room, shard })) || { room, shard, firstPvpTick: lastPvpTime, firstSeen: now }
    Object.assign(rec, {
      classification,
      lastPvpTick: lastPvpTime,
      lastSeen: now,
      attackers,
      defender
    })
    await db['warpath.battles'].update({ _id: rec._id }, rec, { upsert: true })
  },
  cleanBattles () {

  }
}

module.exports = {
  init,
  users,
  api,
  battlenet
}
