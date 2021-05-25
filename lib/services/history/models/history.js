const { Model } = require('sequelize')

class History extends Model { }

module.exports = (sequelize, DataTypes) => History.init({
  room: DataTypes.STRING,
  tick: DataTypes.INTEGER,
  data: DataTypes.BLOB
}, {
  sequelize,
  modelName: 'history',
  indexes: [
    { fields: ['room'], unique: false },
    { fields: ['tick'], unique: false },
    { fields: ['room', 'tick'], unique: true }
  ]
})