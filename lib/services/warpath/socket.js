module.exports = config => {
  return (listen, emit) => {
    listen(/^roomsDone$/, async gameTime => {
      const battles = await config.utils.warpath.getCurrentBattles(gameTime, 1)
      for (const battle of battles) {
        emit('warpath:battle', battle)
      }
      if (battles.length) {
        emit('warpath:battles', battles)
      }
    })

    return {
      onSubscribe (channel, user, conn) {
        return channel.startsWith('warpath')
      },
      onUnsubscribe (channel, user, conn) {

      }
    }
  }
}
