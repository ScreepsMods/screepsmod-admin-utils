module.exports = (config) => {
  config.cronjobs.fixAllowed = [10, async () => {
    const { env, db } = config.common.storage
    if (!db) return // This has a chance of running before database is connected, so skip.
    const WHITELIST = JSON.parse(await env.get(env.keys.WHITELIST) || '[]')
    db.users.find().then(users => {
      users.map(user => {
        const blocked = !(user.allowed || WHITELIST.length === 0 || WHITELIST.includes(user.username.toLowerCase()))
        db.users.update({ _id: user._id }, { $set: { blocked } })
      })
    })
  }]
}
