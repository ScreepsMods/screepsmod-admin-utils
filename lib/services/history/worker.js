const path = require('path')
const requireOpts = {
  paths: require.resolve.paths('@screeps/driver')
}
requireOpts.paths.push(path.resolve(process.cwd(), 'node_modules'))
const engine = require(require.resolve('@screeps/driver', requireOpts))
const common = require(require.resolve('@screeps/common', requireOpts))
const config = common.configManager.config

const { StaticPool } = require('node-worker-threads-pool')

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))


function catchErr(fn) {
  return (...a) => fn(...a).catch(console.error)
}

async function run() {
  const pool = new StaticPool({
    size: require('os').cpus().length,
    task: path.join(__dirname, 'chunkBuilder.js')
  })
  const LIMIT = require('os').cpus().length * 2
  await engine.connect('historyWorker')
  const { common: { storage: { pubsub } } } = config
  pubsub.subscribe('roomsDone', catchErr(async (tick) => {
    const { common: { storage: { db, env } }, history } = config
    if (!history.enabled) return
    const hcs = history.config.chunkSize
    if (tick % hcs === 0) {
      const rooms = (await db.rooms.find()).map(r => r._id)
      for (let baseTick = tick - hcs; baseTick > tick - (hcs * 4); baseTick -= hcs) {
        let cnt = 0
        let total = 0
        // log(`[${baseTick}]`)
        const start = Date.now()
        await history.beginGroup()
        for (const room of rooms) {
          const key = `roomHistory:${baseTick}:${room}`
          const data = await env.get(key)
          if (!data) continue
          cnt++
          while (cnt > LIMIT) await sleep(10)
          const result = await pool.exec({ room, time: baseTick, data })
          await env.del(key)
          await history.write(room, baseTick, result)
          .catch(err => error(`Error processing room ${room}@${baseTick}`, err))
          total++
          cnt--
        }
        await history.endGroup()
        const end = Date.now()
        const dur = end - start
        log(`[${baseTick}] Saved ${total} rooms in ${dur}ms`)
      }
    }
  }))
}

run().catch(console.error)

function log(...a) {
  console.log('[historyWorker]', ...a)
}
function error(...a) {
  console.error('[historyWorker]', ...a)
}

process.on('disconnect', () => process.exit())
log('started')
