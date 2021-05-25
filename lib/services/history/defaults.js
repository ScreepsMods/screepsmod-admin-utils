module.exports = {
  config: {
    enabled: false,
    chunkSize: 100,
    keepTicks: 200000,
    dbOptions: {
      logging: false
    },
    uri: 'sqlite:history.db'
  }
}