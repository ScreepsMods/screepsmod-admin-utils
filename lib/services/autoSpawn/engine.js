module.exports = (config) => {
  config.engine.on('init', type => {
    const { constants: C } = config.common
    if (type === 'processor') {
      config.engine.on('processObject', (object, roomObjects, roomTerrain, gameTime, roomInfo, bulk, bulkUsers) => {
        if (object.type === 'controller' && object.autoSpawn && object.level === 0) {
          bulk.update(object, {
            autoSpawn: false
          })
        }
        if (object.type === 'constructionSite' && object.structureType === 'spawn') {
          const controller = Object.values(roomObjects).find(o => o.type === 'controller')
          if (!controller || !controller.autoSpawn || object.user !== controller.user) return
          const spawn = {
            type: 'spawn',
            room: object.room,
            x: object.x,
            y: object.y,
            name: object.name,
            user: object.user,
            store: { [C.RESOURCE_ENERGY]: C.SPAWN_ENERGY_START },
            storeCapacityResource: { [C.RESOURCE_ENERGY]: C.SPAWN_ENERGY_CAPACITY },
            hits: C.SPAWN_HITS,
            hitsMax: C.SPAWN_HITS,
            spawning: null,
            notifyWhenAttacked: true
          }
          object._skip = true
          controller.autoSpawn = false
          bulk.update(controller, {
            autoSpawn: false
          })
          bulk.remove(object._id)
          bulk.insert(spawn)
        }
      })
    }
  })
}
