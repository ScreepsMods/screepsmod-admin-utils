module.exports = (config) => {
  const { common: { storage: { env } } } = config

  config.utils.on('config:update:map', async (urlOrMapId) => {
    const currentMap = await env.get(env.keys.MAP_URL)
    if (currentMap && currentMap !== urlOrMapId) {
      console.log(`Map value in config.yml has changed to ${urlOrMapId}, current map is ${currentMap}`)
      console.log(`If you wish to apply this then call utils.importMap('${urlOrMapId}') manually or system.resetAllData() then restart server.`)
      return
    }
    await config.utils.importMap(urlOrMapId)
  })

  config.utils.on('config:update:mapFile', async (filePath) => {
    const currentMap = await env.get(env.keys.MAP_URL)
    if (currentMap && currentMap !== filePath) {
      console.log(`Map value in config.yml has changed to ${filePath}, current map is ${currentMap}`)
      console.log(`If you wish to apply this then call utils.importMapFile('${filePath}') manually or system.resetAllData() then restart server.`)
      return
    }
    await config.utils.importMapFile(filePath)
  })
}
