module.exports = (config) => {
  config.cronjobs.gcltocpu = [10, async () => {
    const { db } = config.common.storage
    if (!db) return
    const gclToCPU = config.utils.gclToCPU
    if (!gclToCPU) return
    const { maxCPU = 300, baseCPU = 20, stepCPU = 10 } = config.utils
    const { GCL_MULTIPLY: gclMultiply = 1000000, GCL_POW: gclPow = 2.4 } = config.common.constants

    db.users.find({ active: 10000 }).then(users => {
      for (var user of users) {
        const gclLevel = Math.floor(Math.pow((user.gcl || 0) / gclMultiply, 1 / gclPow)) + 1
        const newCPU = Math.min(gclLevel * stepCPU + baseCPU, maxCPU)
        if (user.cpu !== newCPU) {
          db.users.update({ _id: user._id }, { $set: { cpu: newCPU } })
        }
      }
    })
  }]
}
