module.exports = config => {
  config.utils.on('config:update:market', v => {
    config.market = v
  })
  config.backend.on('expressPreConfig', () => {
    if (config.market && !config.backend.features.find(f => f.name === 'market')) {
      config.backend.features.push({
        name: 'market',
        version: 1,
        menuData: [
          {
            section: 0,
            after: 'World',
            item: {
              label: 'Market',
              routerLink: '/market',
              svg: 'market'
            }
          }
        ]
      })
    }
  })
}
