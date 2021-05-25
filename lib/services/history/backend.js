const { callbackify } = require('util')
const defaults = require('./defaults')

module.exports = function (config) {
  config.utils.on('config', conf => {
    const history = Object.assign({}, defaults.config, conf.history)
    config.backend.historyChunkSize = history.chunkSize
  })
  config.backend.onGetRoomHistory = callbackify(async (roomName, baseTime) => {
    try {
      return await config.history.read(roomName, baseTime)
    } catch(err) {
      console.error(err)
      throw err.message
    }
  })
}
