module.exports = config => {
  const { storage: { db } } = config.common

  Object.assign(config.utils, {
    async spawnBot (botAIName, room, opts = {}) {
      const ret = await this.spawn(botAIName, room, opts)
      if (opts.auto) {
        await Promise.all([
          db['rooms.objects'].removeWhere({ type: 'spawn', room }),
          db['rooms.objects'].update({ type: 'controller', room, autoSpawn: true })
        ])
      }
      return ret
    }
  })
}
