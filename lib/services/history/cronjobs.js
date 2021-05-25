module.exports = config => {
  config.cronjobs.historyCleanup = [60 * 5, async function historyCleanup() {
    await config.history.cleanup()
  }]
}
