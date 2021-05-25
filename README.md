# screepsmod-admin-utils

## This is a Collection of utilities for Screeps Private Server admins

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![License](https://img.shields.io/npm/l/screepsmod-admin-utils.svg)](https://npmjs.com/package/screepsmod-admin-utils)
[![Version](https://img.shields.io/npm/v/screepsmod-admin-utils.svg)](https://npmjs.com/package/screepsmod-admin-utils)
[![Downloads](https://img.shields.io/npm/dw/screepsmod-admin-utils.svg)](https://npmjs.com/package/screepsmod-admin-utils)
[![CircleCI](https://circleci.com/gh/screepsmods/screepsmod-admin-utils/tree/master.svg?style=shield)](https://circleci.com/gh/screepsmods/screepsmod-admin-utils/tree/master)

![npm](https://nodei.co/npm/screepsmod-admin-utils.png "NPM")

## Commands

### utils.importMap(urlOrId)

<span style="color:orange">NOTE: [screepsmod-mongo](https://github.com/screepsmods/screepsmod-mongo) required for map imports</span>

Imports a map from a url or [maps.screepspl.us](https://maps.screepspl.us)

If the id is `random` or `random_WxH` a map will be randomly selected.
1x1 is assumed if size isn't specified.

The server will be paused on tick one, use `system.resumeSimulation()` to unpause

### utils.addNPCTerminals(interval = 10)

Creates NPC Terminals.

The `interval` defines how often they are added, with the default value of `10` matching the behavior of the public server.

A simple way to understand the `interval` is that it will place rooms where `x % interval === 0 && y % interval === 0`.

### utils.removeNPCTerminals()

Removes all NPC Terminals.

### utils.removeBots()

Removes all Bots.

### utils.setTickRate(value) <span style="color:red">DEPRECATED</span>

Deprecated in favor of `system.setTickDuration(value)`   
~~Sets the tick rate to value (in milliseconds)~~

### utils.getTickRate() <span style="color:red">DEPRECATED</span>

Deprecated in favor of `system.getTickDuration()`   
~~Gets the current tick rate~~

### utils.setSocketUpdateRate(value)

Sets socket update rate (in ms)

### utils.getSocketUpdateRate() 

Returns current socket update rate

### utils.setShardName(value)

Sets the shard name

### utils.getCPULimit(username)

Returns current cpu limit for username.

### utils.setCPULimit(username, value)

Sets cpu limit to value for username. Will be overriden if GCLToCPU scaling is enabled.

### utils.enableGCLToCPU([maxCPU], [baseCPU], [stepCPU])

Enables GCLToCPU scaling which raises all user's CPU limit based on their GCL. The formula is "Math.min( (gclLevel * stepCPU + baseCPU), maxCPU )". Parameters are optional and default to maxCPU = 300, baseCPU = 20, stepCPU = 10. Enabling through the CLI will not persist after a server restart. Update the values in your config.yml to persist the settings.

### utils.disableGCLToCPU()

Disables GCLToCPU scaling. Disabling through the CLI will not persist after a server restart. Update the values in your config.yml to persist the setting.

### utils.reloadConfig() 

Reloads the serverConfig section of a screeps-launcher config.yml

## Config file

config.yml example: (This can be the same file as screeps-launcher's config.yml)
```yaml
# Most of these fields will live reload on save. 
# Values set here will override any saved via CLI on server startup
serverConfig: 
  map: random_1x2 # utils.importMap will be called automatically with this value, see utils.importMap above
  tickRate: 200
  socketUpdateRate: 200
  whitelist: # Does not restrict login, only restricts spawning
  - ags131
  - zeswarm
  shardName: 'screepsplus1'
  constants:
    UPGRADE_POWER: 10
    POWER_CREEP_SPAWN_COOLDOWN: 3600000 # 1 Hour
    POWER_CREEP_DELETE_COOLDOWN: 3600000
  welcomeText: |
    <h1>Welcome</h1>
    <div>Powered by screepsmod-admin-utils</div>
  statsToken: ...splusToken... # This enables submitting stats to S+ Grafana. Note: shardName MUST be set
  gclToCPU: true
  maxCPU: 100
  baseCPU: 20
  stepCPU: 10
  history: # Builtin history support. Does not require screepsmod-history
    enabled: false
    chunkSize: 100
    uri: sqlite:history.db # Sequelize connection string
    dbOptions: # Sequelize options
      logging: false
```

## Endpoints

A few extra endpoints are implemented enabling some extra debuging and tools

`GET /stats` Lots of useful stats on server performance
`GET /api/user/world-start-room` Dynamically returns a start room for the client
`GET /api/experimental/pvp` Same as on mmo, returns active pvp rooms.
`GET /api/experimental/nukes` Same as on mmo, returns nukes.
