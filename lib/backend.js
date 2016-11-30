module.exports = function(config){
  config.cli.on('cliSandbox', function(sandbox) {
    sandbox.example = function() {
      return 'Example Response'
    };
  });
}