module.exports = config => {
  config.utils.on('config:update:features', features => {
    for (const feature of features) {
      const ind = config.backend.features.findIndex(f => f.name === feature.name)
      if (ind !== -1) {
        config.backend.features.splice(ind, 1, feature)
      } else {
        config.backend.features.push(feature)
      }
    }
  })
}
