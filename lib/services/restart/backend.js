module.exports = config => {
  config.backend.on('expressPreConfig', (type) => {
    config.common.storage.pubsub.subscribe(`restart:backend`, () => process.exit(0))
  })
}