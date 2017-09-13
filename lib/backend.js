module.exports = function backend (config) {
  config.cli.on('cliSandbox', function (sandbox) {
    sandbox.utils = config.utils
  })
}
