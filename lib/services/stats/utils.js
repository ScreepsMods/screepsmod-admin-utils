module.exports = config => {
  const { common: { storage: { db, env }, constants: C } } = config

  Object.assign(config.utils, {
    async getStats () {
      const [gametime, activeUsers, activeRooms, totalRooms, objects] = await Promise.all([
        env.get('gameTime').then(v => +v),
        db.users.find({ active: { $gt: 0 }, bot: { $eq: null } }),
        db.rooms.count({ active: true }),
        db.rooms.count({}),
        db['rooms.objects'].find({ type: { $in: ['controller', 'creep'] }, user: { $ne: null } })
      ])
      const ticks = JSON.parse(await env.get('lastTicks') || '[]')
      const avg = ticks.reduce((a, b) => a + b, 0) / ticks.length
      const min = Math.min(...ticks)
      const max = Math.max(...ticks)
      const maxDeviation = max - min
      const creeps = objects.filter(o => o.type === 'creep')
      const controllers = objects.filter(o => o.type === 'controller')
      const ownedRooms = controllers.filter(c => c.user).length
      const sameUser = (u) => (o) => o.user === u._id
      const users = activeUsers.map(u => ({
        id: u._id,
        username: u.username,
        gcl: u.gcl || 0,
        gclLevel: Math.floor(Math.pow((u.gcl || 0) / C.GCL_MULTIPLY, 1 / C.GCL_POW)) + 1 || 0,
        power: u.power || 0,
        powerLevel: Math.floor(Math.pow((u.power || 0) / C.POWER_LEVEL_MULTIPLY, 1 / C.POWER_LEVEL_POW)) || 0,
        score: u.score || 0,
        rank: u.rank || 0,
        cpu: u.cpu || 0,
        creeps: creeps.filter(sameUser(u)).length || 0,
        rooms: controllers.filter(sameUser(u)).length || 0,
        combinedRCL: controllers.filter(sameUser(u)).map(o => o.level).reduce((a, b) => a + b, 0) || 0,
        rcl: {
          1: controllers.filter(sameUser(u)).filter(o => o.level === 1).length,
          2: controllers.filter(sameUser(u)).filter(o => o.level === 2).length,
          3: controllers.filter(sameUser(u)).filter(o => o.level === 3).length,
          4: controllers.filter(sameUser(u)).filter(o => o.level === 4).length,
          5: controllers.filter(sameUser(u)).filter(o => o.level === 5).length,
          6: controllers.filter(sameUser(u)).filter(o => o.level === 6).length,
          7: controllers.filter(sameUser(u)).filter(o => o.level === 7).length,
          8: controllers.filter(sameUser(u)).filter(o => o.level === 8).length
        }
      }))
      const stages = {}
      for (const timing of config.utils.tickTiming) {
        for (const [k, v] of Object.entries(timing)) {
          stages[k] = (stages[k] || 0) + v
        }
      }
      for (const key of Object.keys(stages)) {
        stages[key] /= config.utils.tickTiming.length
      }
      const stats = {
        activeUsers: activeUsers.length,
        objects: {
          all: objects.length,
          creeps: creeps.length
        },
        activeRooms,
        totalRooms,
        ownedRooms,
        gametime,
        ticks: { avg, min, max, maxDeviation, ticks, stages },
        users
      }
      return stats
    }
  })
  config.utils.getStats._help = 'getStats()'
}
