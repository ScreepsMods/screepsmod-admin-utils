module.exports = config => {
  return (listen, emit) => {
    listen(/^roomsDone$/, async gameTime => {
      const stats = await config.utils.getStats()
      console.log(stats)
      emit('stats:full', stats)
      emit('stats:users', stats.users)
    })

    return {
      onSubscribe (channel, user, conn) {
        console.log('sub', channel, user)
        return channel.startsWith('stats')
      },
      onUnsubscribe (channel, user, conn) {

      }
    }
  }
}
