const EventEmitter = require('event').EventEmitter
module.exports = function(config){
  // This exposes config.example.test to other mods (Note: Its best if the other mods are loaded after this one)
  config.example = new EventEmitter()
  Object.assign(config.example,{
    test: function(){
      console.log('Testing!')
    }
  })
}