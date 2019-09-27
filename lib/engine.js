module.exports = (config) => {
  let shardName = ''
  config.engine.on('playerSandbox', function (sandbox, userID) {
    sandbox.run(`Game.shard = Object.create(null, {
      name: {
        value: "${shardName}",
        writable: true,
        enumerable: true
      },
      type: {
        value: 'normal',
        writable: true,
        enumerable: true
      },
      ptr: {
        value: false,
        enumerable: true
      }
    });`)
  })
  let lastTickTime = 0
  config.engine.on('init', type => {
    const { storage: { env, pubsub }, constants: C } = config.common
    env.get(env.keys.SHARD_NAME).then(val => { shardName = val || '' })
    pubsub.subscribe('setConstants', (constants) => {
      for (const [k, v] of Object.entries(constants)) {
        config.common.constants[k] = v
      }
    })
    if (type === 'runner') {
      pubsub.subscribe('setShardName', name => {
        shardName = name
        pubsub.publish(pubsub.keys.RUNTIME_RESTART, '1')
      })
    }
    if (type === 'main') {
      env.get(env.keys.TICK_RATE).then(setTickRate)
      pubsub.subscribe('tickStarted', handleTick)
      pubsub.subscribe('setTickRate', setTickRate)
    }
    if (type === 'processor') {
      config.engine.on('processObject', (object, roomObjects, roomTerrain, gameTime, roomInfo, bulk, bulkUsers) => {
        if (object.type === 'constructionSite' && object.structureType === 'spawn') {
          const controller = Object.values(roomObjects).find(o => o.type === 'controller')
          if (!controller || !controller.autoSpawn) return
          const spawn = {
            type: 'spawn',
            room: object.room,
            x: object.x,
            y: object.y,
            name: object.name,
            user: object.user,
            energy: C.SPAWN_ENERGY_START,
            energyCapacity: C.SPAWN_ENERGY_CAPACITY,
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

  async function handleTick () {
    const { env } = config.common.storage
    const now = Date.now()
    const tick = now - lastTickTime
    if (lastTickTime) {
      const lastTicks = JSON.parse(await env.get(env.keys.LAST_TICKS) || '[]')
      await env.set(env.keys.LAST_TICKS, JSON.stringify([tick, ...lastTicks.slice(0, 249)]))
    }
    lastTickTime = now
  }

  function setTickRate (value) {
    const { env } = config.common.storage
    value = parseInt(value)
    if (typeof value === 'number' && !Number.isNaN(value)) {
      config.engine.mainLoopMinDuration = value || 200
      env.set(env.keys.TICK_RATE, value)
      console.log(`Tick Rate set to ${value}ms`)
    } else {
      setTickRate(200)
      // console.log(`Tick Rate failed to set ${value} ${typeof value}`)
    }
  }
}
