module.exports = function (config) {
  config.cronjobs.genPowerBanks = [5 * 60, () => genPowerBanks(config).catch(console.error)]
}
async function genPowerBanks (config) {
  const { constants: C, storage: { db, env } } = config.common
  const gameTime = parseInt(await env.get('gameTime'))
  const rooms = await db.rooms.find({ $and: [{ bus: true }, { status: 'normal' }] })
  await Promise.all(rooms.map(async room => {
    const respawnTime = Math.round(Math.random() * C.POWER_BANK_RESPAWN_TIME / 2 + C.POWER_BANK_RESPAWN_TIME * 0.75)
    if (!room.powerBankTime) {
      room.powerBankTime = gameTime + respawnTime
      return db.rooms.update({ _id: room._id }, { $set: room })
    }
    if (gameTime >= room.powerBankTime) {
      room.powerBankTime = gameTime + respawnTime
      room.active = true

      const { terrain } = await db['rooms.terrain'].findOne({ room: room._id })
      let cnt = 100

      let x, y, isWall, hasExit
      do {
        x = Math.floor(Math.random() * 40 + 5)
        y = Math.floor(Math.random() * 40 + 5)
        isWall = parseInt(terrain.charAt(y * 50 + x)) & 1
        hasExit = false
        for (var dx = -1; dx <= 1; dx++) {
          for (var dy = -1; dy <= 1; dy++) {
            if (!(parseInt(terrain.charAt((y + dy) * 50 + x + dx)) & 1)) {
              hasExit = true
            }
          }
        }
      } while ((!isWall || !hasExit) && cnt--)
      let power = Math.floor(Math.random() * (C.POWER_BANK_CAPACITY_MAX - C.POWER_BANK_CAPACITY_MIN) + C.POWER_BANK_CAPACITY_MIN)
      if (Math.random() < C.POWER_BANK_CAPACITY_CRIT) {
        power += C.POWER_BANK_CAPACITY_MAX
      }

      await db['rooms.objects'].insert({
        type: 'powerBank',
        x,
        y,
        room: room._id,
        power,
        hits: C.POWER_BANK_HITS,
        hitsMax: C.POWER_BANK_HITS,
        decayTime: gameTime + C.POWER_BANK_DECAY
      })
      await db.rooms.update({ _id: room._id }, { $set: room })
    }
  }))
}
