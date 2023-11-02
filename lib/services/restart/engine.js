module.exports = config => {
  config.engine.on('init', (type) => {
    config.common.storage.pubsub.subscribe(`restart:${type}`, () => process.exit(0))
  })
}