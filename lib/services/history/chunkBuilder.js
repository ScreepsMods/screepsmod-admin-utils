const { parentPort } = require('worker_threads')
const path = require('path')
const requireOpts = {
  paths: require.resolve.paths('@screeps/common')
}
requireOpts.paths.push(path.resolve(process.cwd(), 'node_modules'))
const common = require(require.resolve('@screeps/common', requireOpts))

parentPort.on('message', ({ room, time: baseTime, data }) => {
  const historyChunkSize = Object.keys(data).length
  let curObjects = JSON.parse(data['' + baseTime] || '{}')
  const result = {
    timestamp: Date.now(),
    room,
    base: baseTime,
    ticks: {
      [baseTime]: curObjects
    }
  }

  for (let i = 1; i < historyChunkSize; i++) {
    const curTick = baseTime + i
    if (data['' + curTick]) {
      const objects = JSON.parse(data['' + curTick])
      const diff = common.getDiff(curObjects, objects)
      result.ticks[curTick] = diff
      curObjects = objects
    } else {
      result.ticks[curTick] = {}
    }
  }

  parentPort.postMessage(result)
})
