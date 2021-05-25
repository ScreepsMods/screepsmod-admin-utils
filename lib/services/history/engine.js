module.exports = config => {
  config.engine.on('init', type => {
    if (type === 'main') {
      config.history.startWorker()
    }
  })
}