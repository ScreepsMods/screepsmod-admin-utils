module.exports = (config) => {
  config.cronjobs.fixAllowed = [10, async () => {
    const { env, db } = config.common.storage
    if (!db) return // This has a chance of running before database is connected, so skip.
    const WHITELIST = JSON.parse(await env.get(env.keys.WHITELIST) || '[]').map(u => u.toLowerCase())
    const users = await db.users.find()
    for (const user of users) {
      const blocked = !(user.allowed || WHITELIST.length === 0 || (user.username && WHITELIST.includes(user.username.toLowerCase())))
      db.users.update({ _id: user._id }, { $set: { blocked } })
    }
  }]
}
