# screepsmod-admin-utils

## This is a Collection of utilities for Screeps Private Server admins

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![License](https://img.shields.io/npm/l/screepsmod-admin-utils.svg)](https://npmjs.com/package/screepsmod-admin-utils)
[![Version](https://img.shields.io/npm/v/screepsmod-admin-utils.svg)](https://npmjs.com/package/screepsmod-admin-utils)
[![Downloads](https://img.shields.io/npm/dw/screepsmod-admin-utils.svg)](https://npmjs.com/package/screepsmod-admin-utils)
[![CircleCI](https://circleci.com/gh/screepsmods/screepsmod-admin-utils/tree/master.svg?style=shield)](https://circleci.com/gh/screepsmods/screepsmod-admin-utils/tree/master)

![npm](https://nodei.co/npm/screepsmod-admin-utils.png "NPM")

## Commands

### utils.addNPCTerminals(interval = 10)

Creates NPC Terminals.

The `interval` defines how often they are added, with the default value of `10` matching the behavior of the public server.

A simple way to understand the `interval` is that it will place rooms where `x % interval === 0 && y % interval === 0`.

### utils.removeNPCTerminals()

Removes all NPC Terminals.

### utils.removeBots()

Removes all Bots.

### utils.setTickRate(value)

Sets the tick rate to value (in milliseconds)

### utils.getTickRate()

Gets the current tick rate

### utils.setSocketUpdateRate(value)

Sets socket update rate (in ms)

### utils.getSocketUpdateRate() 

Returns current socket update rate

### utils.setShardName(value)

Sets the shard name

### utils.reloadConfig() 

Reloads the serverConfig section of a screeps-launcher config.yml

## Config file

config.yml example: (This can be the same file as screeps-launcher's config.yml)
```yaml
# Most of these fields will live reload on save. 
# Values set here will override any saved via CLI on server startup
serverConfig: 
  tickRate: 200
  socketUpdateRate: 200
  whitelist: # Does not restrict login, only restricts spawning
  - ags131
  - zeswarm
  shardName: 'screepsplus1'
  constants:
    UPGRADE_POWER: 10
  welcomeText: |
    <h1>Welcome</h1>
    <div>Powered by screepsmod-admin-utils</div>
```