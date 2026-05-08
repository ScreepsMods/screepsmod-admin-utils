const path = require('path')
const fs = require('fs').promises

const log = (...args) => console.log('[ImportMap]', ...args)

const logResult = (...args) => {
  log(...args)
  return args.join(' ')
}

const loadRooms = async (config, mapId, rooms) => {
  const { common: { dbCollections, storage } } = config
  const { db, env } = storage
  const cliMap = require('@screeps/backend/lib/cli/map')

  const mapDir = path.resolve(process.env.ASSET_DIR, 'map')
  const mapZoomDir = path.resolve(process.env.ASSET_DIR, 'map/zoom2')
  await fs.mkdir(mapDir, { recursive: true })
  await fs.mkdir(mapZoomDir, { recursive: true })

  log('Init DB')
  // We want a fully empty db for this
  await env.set(env.keys.MAIN_LOOP_PAUSED, '1') // Just to make sure
  await Promise.all(dbCollections.map(col => db[col].removeWhere({})))
  await env.flushall() // This wipes all redis state
  await Promise.all([
    env.set(env.keys.MAIN_LOOP_PAUSED, '1'),
    env.set(env.keys.GAMETIME, '1'),
    // This is a screepsmod-mongo key but we require it for importMap to work
    env.set(env.keys.DATABASE_READY, '1'),
    env.set(env.keys.ACCESSIBLE_ROOMS, '[]'),
    env.set(env.keys.MAP_URL, mapId),
    storage.importMinimalDB()
  ])
  // await upgradeDB()

  log('Clear Map Assets')
  // Clear map assets
  const mapAssetFiles = [
    ...(await fs.readdir(mapDir)).map(f => path.join(mapDir, f)),
    ...(await fs.readdir(mapZoomDir)).map(f => path.join(mapZoomDir, f))
  ].filter(f => f.endsWith('png'))
  await Promise.all(mapAssetFiles.map(f => fs.unlink(f)))

  log('Insert Rooms')
  const roomsBulk = []
  const terrainBulk = []
  const objectsBulk = []
  rooms.forEach(
    ({
      terrain,
      room,
      objects,
      status = 'out of bounds',
      bus,
      openTime,
      sourceKeepers,
      novice,
      respawnArea,
      depositType
    }) => {
      roomsBulk.push({
        op: 'insert',
        data: {
          _id: room,
          name: room,
          status,
          bus,
          openTime,
          sourceKeepers,
          novice,
          respawnArea,
          depositType
        }
      })
      terrainBulk.push({ op: 'insert', data: { room, terrain } })
      objects.forEach(o => {
        o.room = room
        objectsBulk.push({ op: 'insert', data: o })
      })
    }
  )
  await Promise.all([
    db.rooms.bulk(roomsBulk),
    db['rooms.terrain'].bulk(terrainBulk),
    db['rooms.objects'].bulk(objectsBulk)
  ])
  log('Updating Room Image Assets')
  await Promise.all(rooms.map(({ room }) => cliMap.updateRoomImageAssets(room)))
  log('Updating Accessible Rooms')
  const accessibleRoomList = rooms.filter(r => r.status === 'normal' && (!r.openTime || r.openTime < Date.now())).map(r => r.room)
  await env.set(env.keys.ACCESSIBLE_ROOMS, JSON.stringify(accessibleRoomList))
  log('Updating Terrain Data')
  await cliMap.updateTerrainData()
  if (config.utils) {
    log('Spawning NPC Terminals')
    await config.utils.addNPCTerminals()
  }
}

const getMapFromUrl = async (urlOrMapId) => {
  let url = urlOrMapId
  if (urlOrMapId.startsWith('random')) {
    const [, size] = urlOrMapId.split('_')
    const [width, height] = size.split('x').map(v => +v || 1)
    const data = await fetch('https://maps.screepspl.us/maps/index.json').then(r => r.json())

    const maps = Object.values(data).filter(m => +m.width === width && +m.height === height)
    if (!maps.length) {
      throw new Error(`Random map with size ${size} requested, but no maps match requirements`)
    }
    url = maps[Math.floor(Math.random() * maps.length)].id
  }
  if (!url.startsWith('http')) {
    url = `https://maps.screepspl.us/maps/map-${url}.json`
  }
  if (url !== urlOrMapId) {
    log(`Importing map from: ${url}`)
  }
  const { rooms } = await fetch(url).then(r => r.json())
  return rooms
}

const getMapFromFile = async (filePath) => {
  const data = await fs.readFile(filePath, { encoding: 'utf8' })
  const { rooms } = JSON.parse(data)
  return rooms
}

async function importMap (config, url, filePath) {
  if (!config.mongo) {
    return logResult('screepsmod-mongo required for map imports')
  }
  log(`Importing map: ${url ?? filePath}`)
  const rooms = url ? await getMapFromUrl(url) : await getMapFromFile(filePath)
  await loadRooms(config, url ?? filePath, rooms)
  const { pubsub } = config.common.storage
  pubsub.publish('restart:runner', '1')
  pubsub.publish('restart:processor', '1')
  // Delay backend restart so this request can finish/log before exiting.
  setTimeout(() => pubsub.publish('restart:backend', '1'), 250)
  return logResult('Map imported! Server processes are gonna restart now. Use system.resumeSimulation() to unpause ticks')
}

const exportMap = async (config) => {
  const { common: { storage: { env, db } } } = config
  if (!config.mongo) {
    return 'screepsmod-mongo required for map imports'
  }
  log('Exporting map')

  // We want to pause the server just in case
  const wasPaused = await env.get(env.keys.MAIN_LOOP_PAUSED)
  if (!wasPaused) {
    await env.set(env.keys.MAIN_LOOP_PAUSED, '1')
  }

  const roomNames = (await db.rooms.find({}, { _id: true })).map(r => r._id)
  const shard = await env.get(env.keys.SHARD_NAME)
  const date = new Date()
  const desc = `${shard}:${date.getUTCFullYear()}-${date.getUTCMonth()}`
  let count = 0
  const allowedObjTypes = ['controller', 'source', 'mineral', 'extractor', 'keeperLair', 'deposit', 'portal']
  const objectOrTypeSpec = allowedObjTypes.map(t => ({ type: t }))
  const rooms = await Promise.all(roomNames.map(async (roomName) => {
    const roomData = await db.rooms.findOne({ _id: roomName }, { projection: { _id: false } })
    const objects = await db['rooms.objects'].find({ room: roomName, $or: objectOrTypeSpec })
    const terrain = await db['rooms.terrain'].findOne({ room: roomName })
    const room = {
      room: roomName,
      terrain: terrain.terrain,
      objects
    }
    Object.assign(room, roomData)
    count++
    return room
  }))

  const fileName = path.join(process.env.ASSET_DIR, `mapExport-${Number(date)}.json`)
  await fs.writeFile(fileName, JSON.stringify({ description: desc, rooms }))

  if (!wasPaused) {
    await env.set(env.keys.MAIN_LOOP_PAUSED, '0')
  }
  return logResult(`Exported ${count} rooms to ${fileName}`)
}

module.exports = (config) => {
  Object.assign(config.utils, {
    async importMap (urlOrMapId) {
      return importMap(config, urlOrMapId)
    },
    async importMapFile (filePath) {
      return importMap(config, null, filePath)
    },
    async exportMap () {
      return exportMap(config)
    }
  })

  config.utils.importMap._help =
    'importMap(urlOrMapId) - import a map from maps.screepspl.us'

  config.utils.importMapFile._help =
    'importMapFile(filePath) - import a map from a json file'

  config.utils.exportMap._help =
  'exportMap() - export the map to a json file in the assets directory'
}
