module.exports = function engine(config){
  let storage = config.common.storage
  config.engine.on('playerSandbox', function(sandbox,userID) {
    sandbox.example = function() {
      sandbox.console.log(`Hello from example mod!`);
    };
  });
  config.engine.on('init',function(processType){
    // processType will be 'runner','processor', or 'main'
    // Useful for detecting what module you are in
  })
}