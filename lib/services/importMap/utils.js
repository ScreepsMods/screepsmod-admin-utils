const path = require('path')
const axios = require('axios')
const fs = require('fs').promises
const mapDir = path.resolve(process.env.ASSET_DIR, 'map')
const mapZoomDir = path.resolve(process.env.ASSET_DIR, 'map/zoom2')
const cliMap = require(path.join(
  path.dirname(require.main.filename),
  '../lib/cli/map'
))

module.exports = config => {
  const { common: { dbCollections, storage: { db, env, pubsub } } } = config

  Object.assign(config.utils, {
    async importMap (map) {
      const log = (...a) => console.log('[ImportMap]', ...a)
      if (!config.mongo) {
        log('Error: screepsmod-mongo required for map imports')
        return 'screepsmod-mongo required for map imports'
      }
      log(`Map: ${map}`)
      let url = map
      if (map.startsWith('random')) {
        const [, size] = map.split('_')
        const [width, height] = size.split('x').map(v => +v || 1)
        const { data } = await axios.get('https://maps.screepspl.us/maps/index.json')

        const maps = Object.values(data).filter(m => +m.width === width && +m.height === height)
        if (!maps.length) {
          log(`Random map with size ${size} requested, but no maps match requirements.`)
          return `Random map with size ${size} requested, but no maps match requirements.`
        }
        url = maps[Math.floor(Math.random() * maps.length)].id
      }
      if (!url.startsWith('http')) {
        url = `https://maps.screepspl.us/maps/map-${url}.json`
      }
      log(`Map import started for ${map} from ${url}`)
      const { data: { rooms } } = await axios.get(url)

      log('Init DB')
      // We want a fully empty db for this
      await env.set(env.keys.MAIN_LOOP_PAUSED, '1') // Just to make sure
      await Promise.all(dbCollections.map(col => db[col].removeWhere({})))
      await env.flushall()
      await Promise.all([
        env.set(env.keys.MAIN_LOOP_PAUSED, '1'),
        env.set(env.keys.GAMETIME, '1'),
        env.set(env.keys.ACCESSIBLE_ROOMS, '[]'),
        env.set(env.keys.MAP_URL, url),
        db.users.update({ _id: '2' }, { $set: { _id: '2', username: 'Invader', usernameLower: 'invader', cpu: 100, cpuAvailable: 10000, gcl: 13966610.2, active: 0 } }, { upsert: true }),
        db.users.update({ _id: '3' }, { $set: { _id: '3', username: 'Source Keeper', usernameLower: 'source keeper', cpu: 100, cpuAvailable: 10000, gcl: 13966610.2, active: 0 } }, { upsert: true }),
        db.users.update({ username: 'Screeps' }, { username: 'Screeps', usernameLower: 'screeps', gcl: 0, cpi: 0, active: false, cpuAvailable: 0, badge: { type: 12, color1: '#999999', color2: '#999999', color3: '#999999', flip: false, param: 26 } }, { upsert: true }),
        env.set(env.keys.DATABASE_VERSION, '8')
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
          return true
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
      log('Restart Runners')
      pubsub.publish(pubsub.keys.RUNTIME_RESTART, '1')
      log('Done')
      return `Map imported from ${map}`
    }
  })
  config.utils.importMap._help = 'importMap(urlOrMapId) - can also use `random_WxH` for a random map, ex: `random_1x2`'
}
