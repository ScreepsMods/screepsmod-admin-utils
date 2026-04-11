module.exports = config => {
  config.cronjobs.stats = [15, async () => {
    const { env } = config.common.storage
    if (!config.utils.statsToken) return // Don't run if no token
    try {
      const shard = await env.get(env.keys.SHARD_NAME)
      if (!shard) console.log('Stats cannot be submitted without shardname set')
      const stats = await config.utils.getStats()
      if (stats.users) {
        stats.users = stats.users.reduce((ret, user) => {
          ret[user.username.toLowerCase()] = user
          return ret
        }, {})
      }
      delete stats.ticks.ticks
      fetch('https://screepspl.us/api/stats/submit', {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`token:${config.utils.statsToken}`).toString('base64'),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ servers: { [shard]: stats } })
      })
    } catch (e) {
      console.error(e)
    }
  }]
}
