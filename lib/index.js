module.exports = function (config) {
  require('./common')(config) // This is for adding stuff ALL the mods/modules will see
  if (config.cli) require('./cli')(config) // CLI Stuff
  if (config.cronjobs) require('./cronjobs')(config) // Cronjobs
  if (config.backend) require('./backend')(config) // API stuff
  if (config.engine) require('./engine')(config) // Engine stuff
  require('./services')(config) // Services
}
