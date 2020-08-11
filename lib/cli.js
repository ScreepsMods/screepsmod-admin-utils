module.exports = (config) => {
  config.cli.on('cliSandbox', function (sandbox) {
    sandbox.utils = config.utils
    // Compat
    sandbox.getTickRate = config.utils.getTickRate
    sandbox.setTickRate = config.utils.setTickRate
    sandbox.bots.spawn = config.utils.spawnBot.bind({ spawn: sandbox.bots.spawn })
  })
}
