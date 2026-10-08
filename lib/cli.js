module.exports = (config) => {
  config.cli.on('cliSandbox', function (sandbox) {
    sandbox.utils = config.utils
    // Compat
    sandbox.getTickRate = config.utils.getTickRate
    sandbox.setTickRate = config.utils.setTickRate

    // Swap bots.removeUser for a safer version
    const original = sandbox.bots.removeUser
    sandbox.bots.removeUser = async function removeUser (username) {
      const user = await config.common.storage.db.users.findOne({ username })
      if (!user) {
        return Promise.reject('User not found')
      }
      if (!user.bot) {
        return Promise.reject('User is not a bot')
      }
      await config.utils.removeUserData(user._id)
      return 'User removed successfully'
    }
    sandbox.bots.removeUser._help = original._help
  })
}
