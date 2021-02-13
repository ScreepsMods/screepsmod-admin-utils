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
    });
    Object.assign(global, ${JSON.stringify(config.common.constants)});
    `)
  })
  let lastTickTime = 0
  config.engine.on('init', async type => {
    config.utils.reloadConfig()
    const { storage: { db, env, pubsub } } = config.common
    env.get(env.keys.SHARD_NAME).then(val => { shardName = val || '' })
    let lastConstants = ''
    pubsub.subscribe('setConstants', (constants) => {
      const restart = lastConstants !== constants
      lastConstants = constants
      constants = JSON.parse(constants)
      for (const [k, v] of Object.entries(constants)) {
        config.common.constants[k] = v
      }
      if (restart) {
        pubsub.publish(pubsub.keys.RUNTIME_RESTART, '1')
      }
    })
    if (type === 'runner') {
      pubsub.subscribe('setShardName', name => {
        const restart = shardName !== name
        shardName = name
        if (restart) {
          pubsub.publish(pubsub.keys.RUNTIME_RESTART, '1')
        }
      })
    }
    if (type === 'main') {
      pubsub.subscribe('tickStarted', handleTick)
      const times = {}
      let lastTime = Date.now()
      let lastStage = ''
      config.engine.on('mainLoopStage', stage => {
        const now = Date.now()
        if (stage !== 'start') {
          times[lastStage] = now - lastTime
        }
        lastTime = now
        lastStage = stage
        if (stage === 'finish') {
          config.common.storage.pubsub.publish('tickTiming', JSON.stringify(times))
        }
      })
      if (config.auth) {
        const username = 'CaptureBot'
        const user = await db.users.findOne({ username })
        if (!user) {
          const { salt, pass: password } = await config.auth.hashPassword('CaptureBot')
          db.users.insert({
            username,
            usernameLower: username.toLowerCase(),
            email: '',
            cpu: 100,
            cpuAvailable: 0,
            registeredDate: new Date(),
            blocked: true,
            money: 0,
            gcl: 0,
            salt,
            password
          })
        }
      }
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
}
