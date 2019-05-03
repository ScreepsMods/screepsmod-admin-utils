module.exports = (config) => {
  const { env } = config.common.storage
  config.engine.on('playerSandbox', function (sandbox, userID) {

  })
  let lastTickTime = 0
  config.engine.on('init', type => {
    config.common.storage.pubsub.subscribe('setConstants', (constants) => {
      for (const [k, v] of Object.entries(constants)) {
        config.common.constants[k] = v
      }
    })
    if (type === 'main') {
      env.get('tickRate').then(setTickRate)
      config.common.storage.pubsub.subscribe('tickStarted', handleTick)
      config.common.storage.pubsub.subscribe('setTickRate', setTickRate)
    }
  })

  async function handleTick () {
    const { env } = config.common.storage
    const now = Date.now()
    const tick = now - lastTickTime
    if (lastTickTime) {
      const lastTicks = JSON.parse(await env.get('lastTicks') || '[]')
      await env.set('lastTicks', JSON.stringify([tick, ...lastTicks.slice(0, 249)]))
    }
    lastTickTime = now
  }

  function setTickRate (value) {
    value = parseInt(value)
    if (typeof value === 'number' && !Number.isNaN(value)) {
      config.engine.mainLoopMinDuration = value || 200
      env.set('tickRate', value)
      console.log(`Tick Rate set to ${value}ms`)
    } else {
      setTickRate(200)
      // console.log(`Tick Rate failed to set ${value} ${typeof value}`)
    }
  }
}
