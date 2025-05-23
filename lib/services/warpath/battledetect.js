// Copied and modified from Voight-Kampff
const { api, users } = require('./wrapper.js')
const BATTLE_PARTS = [
  'attack',
  'ranged_attack',
  'heal',
  'tough'
]
const POWERS = {
  operator: ['PADDING', 'GENERATE_OPS', 'OPERATE_SPAWN', 'OPERATE_TOWER', 'OPERATE_STORAGE', 'OPERATE_LAB', 'OPERATE_EXTENSION', 'OPERATE_OBSERVER', 'OPERATE_TERMINAL', 'DISRUPT_SPAWN', 'DISRUPT_TOWER', 'DISRUPT_SOURCE', 'SHIELD', 'REGEN_SOURCE', 'REGEN_MINERAL', 'DISRUPT_TERMINAL', 'OPERATE_POWER', 'FORTIFY', 'OPERATE_CONTROLLER', 'OPERATE_FACTORY']
}

const ROOM_NEUTRAL = 0
const ROOM_UNDEFENDED = 1
const ROOM_DEVELOPING = 2
const ROOM_ESTABLISHED = 3
const ROOM_FORTIFIED = 4

class BattleDetect {
  async battleDetails (room, shard, lastPvpTime = false) {
    const roomObjects = await api.roomobjects(room, shard)
    const userBreakdown = await this.getUserBreakdown(roomObjects)
    if (!lastPvpTime && roomObjects.creep) {
      lastPvpTime = roomObjects.creep[0].ageTime - 1500
    }
    let defender = false
    const attackers = []
    for (const userId in userBreakdown) {
      const username = userBreakdown[userId].username
      if (userBreakdown[userId].owner || userBreakdown[userId].reserver) {
        defender = username
      } else {
        attackers.push(username)
      }
    }

    let nukeModifier = 0
    if (roomObjects.nuke && roomObjects.nuke.length > 0) {
      const time = (await api.time(shard)).time
      for (const nuke of roomObjects.nuke) {
        if (nuke.landTime <= time + 120) {
          nukeModifier = 1
          break
        }
      }
    }
    const powerCreeps = []
    if (roomObjects.powerCreep) {
      for (const pc of roomObjects.powerCreep) {
        if (defender === userBreakdown[pc.user].username) continue
        const { name, className, level } = pc
        const powers = Object.entries(pc.powers).map(([id, { level }]) => ({
          power: (POWERS[className] && POWERS[className][+id]) || 'UNKNOWN',
          level
        }))
        powerCreeps.push({
          name,
          className,
          level,
          powers
        })
        nukeModifier = 1
      }
    }
    let stronghold = 0
    if (roomObjects.invaderCore) {
      stronghold = roomObjects.invaderCore[0].level
    }

    const classification = await this.classify(roomObjects, userBreakdown, nukeModifier)
    return {
      classification,
      defender,
      attackers,
      lastPvpTime,
      powerCreeps,
      stronghold
    }
  }

  async classify (roomObjects, userBreakdown, nukeModifier) {
    const userIds = Object.keys(userBreakdown)
    const roomDevelopmentLevel = this.getRoomDevelopmentLevel(roomObjects)

    if (userIds.length <= 1) {
      return nukeModifier ? 1 : false
    }

    let roomType = false
    if (roomObjects.controller && roomObjects.controller[0].user) {
      roomType = 'claimed'
    } else if (roomObjects.controller && roomObjects.controller[0].reservation) {
      roomType = 'reserved'
    }

    let majorSquads = 0
    let attackerCreeps = 0
    let attackers = 0

    for (const userId of userIds) {
      const userData = userBreakdown[userId]
      if (!userData.username) {
        continue
      }
      if (userData.owner || userData.reserver) {
        continue
      }
      attackers++

      if (userData.boosts && userData.creeps.length >= 2) {
        majorSquads++
      } else if (userData.parts.heal && (userData.parts.heal / 25) >= 4) {
        majorSquads++
      }
      let attackParts = 0
      for (const part of ['ranged_attack', 'attack', 'work']) {
        if (userData.parts[part]) {
          attackParts += userData.parts[part]
        }
      }
      attackerCreeps += Math.ceil(attackParts / 25)
    }

    if (attackerCreeps < 1) {
      return 0
    }

    if (!roomType) {
      return (majorSquads ? 1 : 0) + nukeModifier
    } else if (roomType === 'reserved' || roomDevelopmentLevel <= ROOM_UNDEFENDED) {
      if (!majorSquads) {
        return 1 + nukeModifier
      }
      if (attackers === 1) {
        return 2 + nukeModifier
      }
      // Major Squad and multiple attackers.
      return 3 + nukeModifier
    }

    // Everything below is for claimed rooms.

    // Either 2 or 3 depending on attack size.
    if (roomDevelopmentLevel < ROOM_ESTABLISHED) {
      return (!majorSquads ? 2 : 3) + nukeModifier
    }

    // Only high level- ROOM_ESTABLISHED and higher- below

    // If the room has no major squads at all.
    if (!majorSquads) {
      return 3 + nukeModifier
    }

    const base = roomDevelopmentLevel >= ROOM_FORTIFIED ? 4 : 3

    // If the room has multiple attackers
    if (attackers > 1 || attackerCreeps >= 10) {
      return base + nukeModifier + 1
    }

    // High level room with single major attacker.
    return base + nukeModifier
  }

  getRoomDevelopmentLevel (roomObjects) {
    if (!roomObjects.controller || !roomObjects.controller[0].level) {
      return ROOM_NEUTRAL
    }
    if (!roomObjects.tower) {
      return ROOM_UNDEFENDED
    }
    const roomLevel = roomObjects.controller[0].level
    if (roomLevel < 6) {
      return ROOM_DEVELOPING
    }
    if (!roomObjects.storage && !roomObjects.terminal) {
      return ROOM_DEVELOPING
    }
    const towers = roomObjects.tower.length
    if (towers.length < 2) {
      return ROOM_DEVELOPING
    }
    if (roomLevel < 8 || roomObjects.tower.length < 5) {
      return ROOM_ESTABLISHED
    }
    return ROOM_FORTIFIED
  }

  async getUserBreakdown (roomObjects) {
    if (!roomObjects.creep) {
      return {}
    }
    const userData = {}
    for (const creep of roomObjects.creep) {
      if (!userData[creep.user]) {
        const username = await users.getUsername(creep.user)
        if (!username || username === 'Screeps') {
          continue
        }
        userData[creep.user] = {
          username,
          owner: false,
          boosts: false,
          heal: 0,
          work: 0,
          attack: 0,
          ranged_attack: 0,
          tough: 0,
          claim: 0,
          move: 0,
          parts: {},
          creeps: []
        }
        if (roomObjects.controller && roomObjects.controller[0].user) {
          userData[creep.user].owner = creep.user === roomObjects.controller[0].user
        }
        if (roomObjects.controller && roomObjects.controller[0].reservation) {
          userData[creep.user].reserver = creep.user === roomObjects.controller[0].reservation.user
        }
      }
      const processedParts = {}
      const boostedParts = {}
      let isAttacker = false
      for (const part of creep.body) {
        if (!userData[creep.user].parts[part.type]) {
          userData[creep.user].parts[part.type] = 0
        }
        userData[creep.user].parts[part.type]++
        if (!processedParts[part.type]) {
          processedParts[part.type] = 0
        }
        if (BATTLE_PARTS.includes(part.type)) {
          isAttacker = true
        }
        if (part.boost) {
          if (!boostedParts[part.type]) {
            boostedParts[part.type] = 0
            if (BATTLE_PARTS.includes(part.type)) {
              userData[creep.user].boosts = true
            }
          }
          boostedParts[part.type]++
        }
        processedParts[part.type]++
      }
      if (!isAttacker) {
        continue
      }
      if (Object.keys(boostedParts).length > 0) {
        creep.boosts = boostedParts
      }
      const hasParts = Object.keys(processedParts)
      for (const partType of hasParts) {
        userData[creep.user][partType]++
      }
      delete creep.body
      creep.parts = processedParts
      userData[creep.user].creeps.push(creep)
    }

    const userIds = Object.keys(userData)
    for (const userId of userIds) {
      if (userData[userId].creeps.length <= 0) {
        delete userData[userId]
      }
    }

    if (roomObjects.controller && roomObjects.controller[0].user) {
      if (!userData[roomObjects.controller[0].user]) {
        const username = await users.getUsername(roomObjects.controller[0].user)
        userData[roomObjects.controller[0].user] = {
          owner: true,
          boosts: false,
          username,
          heal: 0,
          work: 0,
          attack: 0,
          ranged_attack: 0,
          tough: 0,
          claim: 0,
          move: 0,
          creeps: []
        }
      }
      userData[roomObjects.controller[0].user].owner = true
    }
    if (roomObjects.controller && roomObjects.controller[0].reservation) {
      if (!userData[roomObjects.controller[0].reservation.user]) {
        const username = await users.getUsername(roomObjects.controller[0].reservation.user)
        userData[roomObjects.controller[0].reservation.user] = {
          owner: false,
          reserver: true,
          username,
          boosts: false,
          heal: 0,
          work: 0,
          attack: 0,
          ranged_attack: 0,
          tough: 0,
          claim: 0,
          move: 0,
          creeps: []
        }
      }

      userData[roomObjects.controller[0].reservation.user].reserver = true
    }

    return userData
  }
}

module.exports = new BattleDetect()
