module.exports = function (config) {
  config.cronjobs.inactiveUserCleanup = [60, () => inactiveUserCleanup(config)]
}

async function inactiveUserCleanup (config) {
  const { common: { storage: { db } } } = config
  const [users, creeps] = await Promise.all([
    db.users.find({}),
    db['rooms.objects'].find({ type: 'creep' })
  ])
  for (let user of users) {
    if ((!user.rooms || !user.rooms.length) && !creeps.find(c => c.user === user._id)) {
      db.users.update({ _id: user._id }, { $set: { active: 0 } })
    }
  }
}
