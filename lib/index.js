module.exports = function(config){
  require('./common')(config)  // This is for adding stuff ALL the mods/modules will see
  if(config.backend) require('./backend')(config) // API and CLI stuff
  if(config.engine) require('./engine')(config) // Engine stuff
}