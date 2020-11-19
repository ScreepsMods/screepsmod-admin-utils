module.exports = config => {
  config.utils.on('config:update:market', v => {
    config.market = v
  })
}
