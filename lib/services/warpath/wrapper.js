const _ = require('lodash')

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

module.exports = {
  init,
  users,
  api
}
