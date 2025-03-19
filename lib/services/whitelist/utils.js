module.exports = config => {
  const { storage: { env } } = config.common

  Object.assign(config.utils, {
    async getWhitelist () {
      return JSON.parse(await env.get(env.keys.WHITELIST) || '[]')
    },
    async addWhitelistUser (user) {
      user = user.toLowerCase()
      const whitelist = JSON.parse(await env.get(env.keys.WHITELIST) || '[]')
      whitelist.push(user)
      await env.set(env.keys.WHITELIST, JSON.stringify(whitelist))
      return `${user} added to whitelist`
    },
    async removeWhitelistUser (user) {
      user = user.toLowerCase()
      const whitelist = new Set(JSON.parse(await env.get(env.keys.WHITELIST) || '[]'))
      whitelist.delete(user)
      await env.set(env.keys.WHITELIST, JSON.stringify(Array.from(whitelist)))
      return `${user} removed from whitelist`
    }
  })
  config.utils.getWhitelist._help = 'getWhitelist() - Get the current whitelist object'
  config.utils.addWhitelistUser._help = 'addWhitelistUser(username) - Add the given user to the whitelist'
  config.utils.removeWhitelistUser._help = 'removeWhitelistUser(username) - Remove the give user from the whitelist'
}
