module.exports = config => {
  Object.assign(config.common.storage.env.keys, {
    WHITELIST: 'whitelist'
  })
}
