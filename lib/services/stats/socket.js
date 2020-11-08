module.exports = config => {
  return (listen, emit) => {
    listen(/^roomsDone$/, async gameTime => {
      const stats = await config.utils.getStats()
      emit('stats:full', stats)
      emit('stats:users', stats.users)
    })

    return {
      onSubscribe (channel, user, conn) {
        return channel.startsWith('stats')
      },
      onUnsubscribe (channel, user, conn) {

      }
    }
  }
}
