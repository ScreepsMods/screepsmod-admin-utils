const path = require('path')
const axios = require('axios')
const fs = require('fs').promises

module.exports = config => {
  const { common: { dbCollections, storage: { db, env, pubsub } } } = config

  Object.assign(config.utils, {
    async importMap (map) {
      const mapDir = path.resolve(process.env.ASSET_DIR, 'map')
      const mapZoomDir = path.resolve(process.env.ASSET_DIR, 'map/zoom2')
      const cliMap = require(path.join(
        path.dirname(require.main.filename),
        '../lib/cli/map'
      ))
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
        db.users.update({ _id: '2' }, {
          $set: {
            _id: '2',
            username: 'Invader',
            usernameLower: 'invader',
            cpu: 100,
            cpuAvailable: 10000,
            gcl: 13966610.2,
            active: 0,
            badge: {
              type: {
                path1: 'm 60.493413,13.745781 -1.122536,7.527255 -23.302365,-6.118884 -24.097204,26.333431 6.412507,0.949878 -5.161481,19.706217 26.301441,24.114728 1.116562,-7.546193 23.350173,6.122868 24.097202,-26.318478 -6.462307,-0.95785 5.16845,-19.699243 z m -1.58271,10.611118 -0.270923,1.821013 C 57.330986,25.69819 55.969864,25.331543 54.570958,25.072546 Z m -8.952409,4.554029 c 11.653612,0 21.055294,9.408134 21.055294,21.069735 0,11.661603 -9.401682,21.068738 -21.055294,21.068738 -11.65361,0 -21.055297,-9.407135 -21.055297,-21.068738 0,-11.661601 9.401687,-21.069735 21.055297,-21.069735 z M 26.634018,40.123069 c -0.262324,0.618965 -0.494865,1.252967 -0.708185,1.895768 l -0.0508,-0.104656 -0.194228,-0.417627 c 0.261245,-0.385697 0.631962,-0.909531 0.953211,-1.373485 z m 47.391601,17.714764 0.115539,0.237219 0.214148,0.462479 c -0.380159,0.55986 -0.886342,1.281124 -1.3835,1.988466 0.400298,-0.870957 0.752837,-1.767746 1.053813,-2.688164 z M 41.364458,73.812322 c 0.694434,0.251619 1.40261,0.471895 2.123558,0.662817 l -2.303841,0.558165 z',
                path2: 'm 60.857962,24.035953 -6.397566,1.055531 c 6.084137,1.084905 11.78633,4.394548 15.786244,9.746957 5.741405,7.682749 6.465607,17.544704 2.736121,25.67958 1.511089,-2.147013 2.622575,-3.851337 2.622575,-3.851337 l 1.628526,0.241209 c 0.726895,-2.869027 1.004942,-5.843252 0.811775,-8.806053 l 1.185288,-8.634615 -3.768025,-3.072898 -2.908435,-3.21842 c -0.0103,-0.01383 -0.01958,-0.02805 -0.02988,-0.04186 -3.118009,-4.172293 -7.17889,-7.228662 -11.666624,-9.098091 z M 50.001124,37.965163 A 12.020784,12.029027 0 0 0 37.979913,49.994617 12.020784,12.029027 0 0 0 50.001124,62.024074 12.020784,12.029027 0 0 0 62.022337,49.994617 12.020784,12.029027 0 0 0 50.001124,37.965163 Z M 27.019485,39.55693 c -1.481686,2.114179 -2.5658,3.779575 -2.5658,3.779575 l -1.647451,-0.244197 c -0.69707,2.775045 -0.977606,5.64628 -0.81476,8.511019 l -1.22015,8.890775 3.768021,3.072896 3.422394,3.786551 c 2.921501,3.715734 6.608397,6.499915 10.668588,8.29872 l 5.050921,-1.223973 C 38.324728,73.038607 33.383805,69.887984 29.806406,65.100956 28.655972,63.561522 27.71377,61.932905 26.961715,60.249903 L 24.8272,48.359991 c 0.194234,-3.030146 0.935183,-6.015406 2.192285,-8.803061 z'
              },
              color1: '#735252',
              color2: '#390305',
              color3: '#ff0d39',
              flip: false
            }
          }
        }, { upsert: true }),
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
      log('Reloading config.yml')
      await config.utils.reloadConfig()
      log('Done')
      return `Map imported from ${map}`
    }
  })
  config.utils.importMap._help = 'importMap(urlOrMapId) - can also use `random_WxH` for a random map, ex: `random_1x2`'
}
