module.exports = (config) => {
  config.cronjobs.gcltocpu = [10, async function gclToCPUCron () {
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
  }]
}
