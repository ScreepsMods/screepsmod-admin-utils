module.exports = (config) => {
  config.backend.on('expressPreConfig', app => {
    const { env, db } = config.common.storage
    config.common.storage.pubsub.subscribe('setConstants', (constants) => {
      for (const [k, v] of Object.entries(constants)) {
        config.common.constants[k] = v
      }
    })
    app.get('/stats', async (req, res) => {
      const ticks = JSON.parse(await env.get('lastTicks') || '[]')
      const avg = ticks.reduce((a, b) => a + b, 0) / ticks.length
      const activeUsers = await db.users.count({ active: 10000 })
      const activeRooms = await db.rooms.count({ active: true })
      const totalRooms = await db.rooms.count({})
      const ownedRooms = await db['rooms.objects'].count({ type: 'controller', user: { $ne: null } })
      const creeps = await db['rooms.objects'].count({ type: 'creep' })
      const objects = await db['rooms.objects'].count({})
      res.json({
        activeUsers,
        objects: {
          all: objects,
          creeps
        },
        activeRooms,
        totalRooms,
        ownedRooms,
        ticks: { avg, last30: ticks }
      })
    })
  })
}
