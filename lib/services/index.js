const fs = require('fs')
module.exports = (config) => {
  const files = fs.readdirSync(__dirname).filter(f => f !== 'index.js')
  files.forEach(file => require(`./${file}`)(config))
}
