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
  config.utils.getWhitelist._help = 'getWhitelist()'
  config.utils.addWhitelistUser._help = 'addWhitelistUser(username)'
  config.utils.removeWhitelistUser._help = 'removeWhitelistUser(username)'
}
