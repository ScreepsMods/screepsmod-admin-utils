module.exports = function (config) {
  config.cronjobs.inactiveUserCleanup = [60, () => inactiveUserCleanup(config)]
}

async function inactiveUserCleanup (config) {
  const { common: { storage: { db } } } = config
  const [users, creeps, controllers] = await Promise.all([
    db.users.find({}),
    db['rooms.objects'].find({ type: 'creep' }),
    db['rooms.objects'].find({ type: 'controller' })
  ])
  for (let user of users) {
    const hasCreeps = !!creeps.find(c => c.user === user._id)
    const hasController = !!controllers.find(c => c.user === user._id)
    if ((!user.rooms || !user.rooms.length) && (!hasCreeps && !hasController)) {
      db.users.update({ _id: user._id }, { $set: { active: 0 } })
    }
  }
}
