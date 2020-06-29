const fs = require('fs')
const path = require('path')

module.exports = (config) => {
  const modules = ['backend', 'cli', 'common', 'cronjobs', 'engine', 'socket', 'utils']
  const files = fs.readdirSync(__dirname).filter(f => f !== 'index.js')
  files.forEach(file => {
    const filepath = path.join(__dirname, file)
    const stat = fs.statSync(filepath)
    if (stat.isDirectory()) {
      const files = fs.readdirSync(filepath)
      if (!files.includes('index.js')) {
        for (const mod of modules) {
          if (config[mod] && (files.includes(`${mod}.js`) || files.includes(mod))) {
            require(`./${file}/${mod}`)(config)
          }
        }
        return
      }
    }
    require(`./${file}`)(config)
  })
}
