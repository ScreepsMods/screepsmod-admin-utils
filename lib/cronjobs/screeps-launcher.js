const fs = require('fs')
const util = require('util')
const os = require('os')

const stat = util.promisify(fs.stat)

let config = null
let lastMTime = 0

module.exports = (c) => {
  config = c
  const configFiles = ['config.yml', 'config.yaml']
  for (const filename of configFiles) {
    try {
      fs.statSync(filename)
      config.cronjobs.screepsLauncherConfig = [3, () => checkConfig()]
    } catch (_) {}
  }
  if (!config.cronjobs.screepsLauncherConfig) {
    config.backend.on('expressPreConfig', () => {
      const { env } = config.common.storage
      if (!env.get(env.keys.SHARD_NAME)) {
        env.set(env.keys.SHARD_NAME, process.env.SHARD_NAME || os.hostname())
      }
    })
  }
}
async function checkConfig () {
  let filename
  const configFiles = ['config.yml', 'config.yaml']
  for (const file of configFiles) {
    try {
      fs.statSync(file)
      filename = file
    } catch (_) {}
  }
  if (!filename) return
  if (!config.common.storage.pubsub.publish) return // Try to catch early tick attempts
  const stats = await stat(filename)
  if (stats.mtimeMs > lastMTime) {
    config.utils.reloadConfig()
    lastMTime = stats.mtimeMs
  }
}
