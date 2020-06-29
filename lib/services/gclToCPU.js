/*  config.yml
    gclToCPU
    maxCPU
    baseCPU
    stepCPU
 */

let config

module.exports = _config => {
  config = _config
  if (!config.backend) return
  config.cronjobs.gcltocpu = [10, gclToCPUCron]
  config.utils.gclToCPU = {
    enabled: false,
    maxCPU: 300,
    baseCPU: 20,
    stepCPU: 10
  }
  const set = (k, v) => { config.utils.gclToCPU[k] = v }
  config.utils.on('config:update:gclToCPU', v => set('enabled', !!v))
  for (const k of ['maxCPU', 'baseCPU', 'stepCPU']) {
    config.utils.on(`config:update:${k}`, v => set(k, v))
  }

  Object.assign(config.utils, {
    async getCPULimit(username) {
      if (!username) return 'Username required'
      const usernameLower = username.toLowerCase()
      const user = await db.users.findOne({ usernameLower })
      if (!user) return 'Username not found'
      return `CPU limit is ${user.cpu} for user ${user.username}`
    },
    async setCPULimit(username, cpuLimit) {
      if (!username) return 'Username required'
      if (!cpuLimit || cpuLimit <= 0) return 'Please set a value > 0'
      const usernameLower = username.toLowerCase()
      const user = await db.users.findOne({ usernameLower })
      if (!user) return 'Username not found'
      await db.users.update({ _id: user._id }, { $set: { cpu: cpuLimit, fixedCPU: cpuLimit } })
      return `Updated maximum cpu to ${cpuLimit} for user ${user.username}`
    },
    async resetCPULimit(username) {
      if (!username) return 'Username required'
      const usernameLower = username.toLowerCase()
      const user = await db.users.findOne({ usernameLower })
      if (!user) return 'Username not found'
      await db.users.update({ _id: user._id }, { $set: { cpu: 100 }, $unset: { fixedCPU: true } })
      return `Updated maximum cpu to ${cpuLimit} for user ${user.username}`
    },
    enableGCLToCPU(maxCPU, baseCPU, stepCPU) {
      config.utils.gclToCPU.enabled = true
      if (maxCPU) {
        config.utils.gclToCPU.maxCPU = maxCPU
      }
      if (baseCPU) {
        config.utils.gclToCPU.baseCPU = baseCPU
      }
      if (stepCPU) {
        config.utils.gclToCPU.stepCPU = stepCPU
      }
      return 'Warning, enableGCLToCPU() changes just the running state of the server and does not persist between restarts. Update your config.yml if you want the settings to be enabled at every server (re)start.'
    },
    disableGCLToCPU() {
      config.utils.gclToCPU.enabled = false
      return 'Warning, disableGCLToCPU() changes just the running state of the server and does not persist between restarts. Update your config.yml if you want the settings to be disabled at every server (re)start.'
    }
  })
  config.utils.getCPULimit._help = 'getCPULimit(username) Returns the current CPU limit for <username>'
  config.utils.setCPULimit._help = 'setCPULimit(username, value) Sets the CPU limit for <username> to <value>'
  config.utils.resetCPULimit._help = 'setCPULimit(username) Resets the CPU limit for <username> to default (100)'
  config.utils.enableGCLToCPU._help = 'enableGCLToCPU(maxCPU, baseCPU, stepCPU) Turns on CPU scaling based on GCL; changes running state and does not persist between server restarts'
  config.utils.disableGCLToCPU._help = 'disableGCLToCPU() Disables CPU scaling based on GCL; changes running state and does not persist between server restarts'
}

async function gclToCPUCron () {
  const { 
    common: { 
      constants: {
        GCL_MULTIPLY: gclMultiply = 1000000, 
        GCL_POW: gclPow = 2.4
      },
      storage: {
        db 
      }
    },
    utils: {
      gclToCPU: {
        enabled = false,
        maxCPU = 300,
        baseCPU = 20,
        stepCPU = 10
      }
    }
  } = config
  if (!db || !enabled) return
  
  const users = await db.users.find({ active: 10000 })
  for (const user of users) {
    const gclLevel = Math.floor(Math.pow((user.gcl || 0) / gclMultiply, 1 / gclPow)) + 1
    const newCPU = user.fixedCPU || Math.min(gclLevel * stepCPU + baseCPU, maxCPU)
    if (user.cpu !== newCPU) {
      db.users.update({ _id: user._id }, { $set: { cpu: newCPU } })
    }
  }
}