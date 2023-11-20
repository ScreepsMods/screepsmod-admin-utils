const authroute = require('@screeps/backend/lib/game/api/auth')
const bodyParser = require('body-parser')

module.exports = (config) => {
  config.backend.on('expressPreConfig', app => {
    const { common: { storage: { env, db }, constants: C } } = config
    app.post('/api/game/place-spawn', authroute.tokenAuth, bodyParser.json(), async (req, res) => {
      try {
        const { body: { name, room }, user } = req
        const x = parseInt(req.body.x)
        const y = parseInt(req.body.y)
        if (typeof name !== 'string' || name.length > 50) {
          throw new Error('invalid params')
        }
        const auto = name === 'auto'
        if (!auto && (x < 0 || x > 49 || y < 0 || y > 49)) {
          throw new Error('invalid params')
        }

        if (user.blocked) {
          throw new Error('blocked')
        }

        const objectsToInsert = []
        if (!auto) {
          objectsToInsert.push({
            type: 'spawn',
            room: room,
            x,
            y,
            name: name,
            user: user._id.toString(),
            store: { energy: C.SPAWN_ENERGY_START },
            storeCapacityResource: { energy: C.SPAWN_ENERGY_CAPACITY },
            hits: C.SPAWN_HITS,
            hitsMax: C.SPAWN_HITS,
            spawning: null,
            notifyWhenAttacked: true
          })
        }

        if (!user.cpu) {
          throw new Error('no cpu')
        }

        if (user.lastRespawnDate && Date.now() - user.lastRespawnDate < 180000) {
          throw new Error('too soon after last respawn')
        }

        await checkGame(req)
        const gameTime = parseInt(await env.get(env.keys.GAMETIME))

        const objectsCnt = await db['rooms.objects'].count({ user: '' + user._id })

        if (objectsCnt > 0) {
          throw new Error('already playing')
        }
        await checkController(room, 'spawn', 'spawn', user._id)
        if (!auto) {
          await checkConstructionSpot(room, 'spawn', x, y)
        }
        await db['rooms.objects'].removeWhere({
          $and: [
            { room: room },
            { user: { $ne: null } },
            { type: { $in: [...Object.keys(C.CONSTRUCTION_COST), 'creep'] } }
          ]
        })
        await db['rooms.objects'].update({
          $and: [{ room: room }, { type: 'controller' }, { level: 0 }]
        }, {
          $set: { user: '' + user._id, level: 1, progress: 0, downgradeTime: null, safeMode: gameTime + 20000, autoSpawn: auto }
        })
        await db['rooms.objects'].update({
          $and: [{ room: room }, { type: 'source' }]
        }, {
          $set: { invaderHarvested: 0 }
        })
        if (objectsToInsert.length) {
          await db['rooms.objects'].insert(objectsToInsert)
        }
        await db.rooms.update({ _id: room }, { $set: { active: true, invaderGoal: 1000000 } })
        await db['rooms.terrain'].findOne({ room })
        await db.users.update({ _id: user._id }, { $set: { active: 10000 } })
        res.json({ ok: 1, newbie: true })
      } catch (e) {
        res.json({
          error: e.message || e
        })
      }
    })

    async function checkGame (req) {
      const room = await db.rooms.findOne({ _id: req.body.room })
      if (!room) {
        throw new Error('invalid room')
      }
      if (/^(W|E)/.test(req.body.room)) {
        if (room.status === 'out of borders' || (room.openTime && room.openTime > Date.now())) {
          throw new Error('out of borders')
        }
        return true
      }
      throw new Error('not supported')
    }

    async function checkController (room, action, structureType, user) {
      if (!/^(W|E)/.test(room)) {
        return true
      }
      const controller = await db['rooms.objects'].findOne({ $and: [{ room }, { type: 'controller' }] })
      if (action === 'spawn' && !controller) {
        throw new Error('invalid room')
      }
      if (action === 'spawn' && controller && controller.user) {
        throw new Error('room busy')
      }
      if (action === 'spawn' && controller && controller.reservation) {
        throw new Error('room busy')
      }
      if (action === 'spawn' && controller && controller.bindUser && controller.bindUser !== '' + user) {
        throw new Error('room busy')
      }
      if (action === 'construct') {
        if (controller && ((controller.user && controller.user !== '' + user) || (controller.reservation && controller.reservation.user !== '' + user))) {
          throw new Error('not a controller owner')
        }

        const roomObjects = await db['rooms.objects'].find({ room })
        if (!checkControllerAvailability(structureType, roomObjects, controller)) {
          throw new Error('RCL not enough')
        }
      }
      return true
    }

    function checkControllerAvailability (type, roomObjects, roomController) {
      const { level: rcl = 0 } = roomController || {}
      const structuresCnt = roomObjects.filter((i) => i.type === type || (i.type === 'constructionSite' && i.structureType === type)).length
      const availableCnt = C.CONTROLLER_STRUCTURES[type][rcl]
      return structuresCnt < availableCnt
    }

    async function checkConstructionSpot (room, structureType, x, y) {
      if (x <= 0 || y <= 0 || x >= 49 || y >= 49) {
        throw new Error('invalid location')
      }

      if (structureType === 'extractor') {
        await checkForObjectPresence({ room, x, y, type: 'mineral' })
      }

      await checkForObjectAbsence({ $and: [{ room }, { x }, { y }, { type: structureType }] })
      await checkForObjectAbsence({ $and: [{ room }, { x }, { y }, { type: 'constructionSite' }] })
      if (structureType !== 'rampart') {
        await checkForObjectAbsence({ $and: [{ room }, { x }, { y }, { type: { $in: ['wall', 'constructedWall', 'spawn', 'extension', 'link', 'storage', 'tower', 'observer', 'powerSpawn'] } }] })
      }
      if (structureType !== 'road') {
        await checkForTerrainAbsence(room, x, y, C.TERRAIN_MASK_WALL)
        await checkForObjectAbsence({ $and: [{ room }, { x: { $gt: x - 2, $lt: x + 2 } }, { y: { $gt: y - 2, $lt: y + 2 } }, { type: 'exit' }] })
      }
      if (structureType !== 'road' && structureType !== 'container' && (x === 1 || x === 48 || y === 1 || y === 48)) {
        let borderTiles
        if (x === 1) borderTiles = [[0, y - 1], [0, y], [0, y + 1]]
        if (x === 48) borderTiles = [[49, y - 1], [49, y], [49, y + 1]]
        if (y === 1) borderTiles = [[x - 1, 0], [x, 0], [x + 1, 0]]
        if (y === 48) borderTiles = [[x - 1, 49], [x, 49], [x + 1, 49]]
        await Promise.all(borderTiles.map(pos => checkForTerrainPresence(room, pos[0], pos[1], C.TERRAIN_MASK_WALL)))
      }

      async function checkForTerrainPresence (room, x, y, mask) {
        const data = await db['rooms.terrain'].findOne({ room })
        const char = data.terrain.charAt(y * 50 + x)
        const code = parseInt(char)
        if (!(code & mask)) {
          throw new Error('invalid location')
        }
      }

      async function checkForTerrainAbsence (room, x, y, mask) {
        const data = await db['rooms.terrain'].findOne({ room })
        const char = data.terrain.charAt(y * 50 + x)
        const code = parseInt(char)
        if (code & mask) {
          throw new Error('invalid location')
        }
      }

      async function checkForObjectPresence (query) {
        const data = await db['rooms.objects'].findOne(query)
        if (!data) {
          throw new Error('invalid location')
        }
      }

      async function checkForObjectAbsence (query) {
        const data = await db['rooms.objects'].findOne(query)
        if (data) {
          throw new Error('invalid location')
        }
      }
    }
  })
}
