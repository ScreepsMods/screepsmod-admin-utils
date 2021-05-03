module.exports = (config) => {
  config.cronjobs.gcltocpu = [10, async function gclToCPUCron () {
    const {
      common: {
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

    const gclMultiply = C.GCL_MULTIPLY
    const gclPow = C.GCL_POW

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
