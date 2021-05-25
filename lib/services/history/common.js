const { Sequelize, DataTypes, Model, Op } = require('sequelize')
const childProcess = require('child_process')
const zlib = require('zlib')
const util = require('util')

const gzip = util.promisify(zlib.gzip)
const gunzip = util.promisify(zlib.gunzip)

const defaults = require('./defaults')

class HistoryService {
  constructor (config) {
    this._config = config
    config.utils.once('config', conf => {
      // this.init().catch(err => {
      //   console.error('History failed to initialize!', err)
      // })
    })
  }
  get config() {
    const conf = this._config.utils.config
    const c = Object.assign({}, defaults.config, conf.history)
    c.chunkSize = +c.chunkSize
    Object.assign(conf.history, c)
    return conf.history
  }
  get enabled() {
    return this.config.enabled
  }
  async init() {
    const { common: { storage: { env } } } = this._config
    if (this._config.engine) {
      this.engineHook()
    }
    if (!this.enabled) {
      console.log('History init abort: Not Enabled')
      return
    }
    console.log(`History DB: ${this.config.uri}`)
    const sequelize = this.sequelize = new Sequelize(process.env.HISTORY_URI || this.config.uri, this.config.dbOptions)
    const History = require('./models/history')(sequelize, DataTypes)

    this.History = History
    await sequelize.sync()
    const time = +(await env.get(env.keys.GAME_TIME))
    // if (time <= config.history.chunkSize) {
    //   await History.truncate()
    // }
    await this.cleanup()
    console.log('History Initialized')
  }
  engineHook() {
    const config = this._config
    const { common: { storage: { env } } } = config
    if (this.enabled) {
      config.engine.driver.history.saveTick = async (roomId, gameTime, data) => {
        const baseTime = gameTime - gameTime % this.config.chunkSize
        const key = `${env.keys.ROOM_HISTORY}${baseTime}:${roomId}`
        await env.hmset(key, { [gameTime]: data })
        await env.expire(key, 60 * this.config.chunkSize)
      }
      config.engine.driver.history.upload = async (roomId, baseTime) => {
        // Do nothing hooking roomDone to trigger actual saving and cleanup
      }
    } else {
      this._config.engine.driver.history.saveTick = async (roomId, gameTime, data) => {
        const key = `${env.keys.ROOM_HISTORY}:${roomId}`
        await env.del(key)
      }
    }
  }
  async beginGroup() {
    this.trans = await this.sequelize.transaction()
  }
  async endGroup() {
    await this.trans.commit()
    this.trans = undefined
  }
  async read(room, tick) {
    const record = await this.History.findOne({ where: { room, tick } })
    if (!record) {
      throw new Error('Record not found')
    }
    const data = JSON.parse(await gunzip(record.data, 'utf8'))
    return data
  }
  async write(room, tick, data) {
    await this.History.create({
      room,
      tick,
      data: await gzip(JSON.stringify(data))
    }, { transaction: this.trans })
  }
  async cleanup() {
    if (!this.History) return
    const time = +(await this._config.common.storage.env.get('gameTime'))
    const beforeTick = time - this.config.keepTicks
    await this.History.destroy({ where: { tick: { [Op.gt]: time } } }) // Cleanup future records, useful for resets.
    await this.History.destroy({ where: { tick: { [Op.lt]: beforeTick } } })
  }
  startWorker () {
    const child = childProcess.fork(`${__dirname}/worker.js`, [], {
      cwd: process.cwd(),
      execArgv: ['--experimental-worker'],
      env: process.env,
      stdio: ['ignore', process.stdout, process.stderr, 'ipc']
    })
    child.on('exit', () => this.startWorker())
    this.config.worker = child
  }
}

module.exports = config => {
  config.history = new HistoryService(config)
  config.utils.initHooks.history = () => config.history.init()
}