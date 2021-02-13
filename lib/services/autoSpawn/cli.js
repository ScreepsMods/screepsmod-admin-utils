module.exports = (config) => {
  config.cli.on('cliSandbox', function (sandbox) {
    sandbox.bots.spawn = config.utils.spawnBot.bind({ spawn: sandbox.bots.spawn })
  })
}
