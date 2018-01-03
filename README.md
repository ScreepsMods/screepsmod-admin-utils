# screepsmod-admin-utils

## This is a Collection of utilities for Screeps Private Server admins

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![License](https://img.shields.io/npm/l/screepsmod-admin-utils.svg)](https://npmjs.com/package/screepsmod-admin-utils)
[![Version](https://img.shields.io/npm/v/screepsmod-admin-utils.svg)](https://npmjs.com/package/screepsmod-admin-utils)
[![Downloads](https://img.shields.io/npm/dw/screepsmod-admin-utils.svg)](https://npmjs.com/package/screepsmod-admin-utils)
[![CircleCI](https://circleci.com/gh/screepsmods/screepsmod-admin-utils/tree/master.svg?style=shield)](https://circleci.com/gh/screepsmods/screepsmod-admin-utils/tree/master)

![npm](https://nodei.co/npm/screepsmod-admin-utils.png "NPM")

## Commands

### addNPCTerminals (interval = 10)

Creates NPC Terminals.

The `interval` defines how often they are added, with the default value of `10` matching the behavior of the public server.

A simple way to understand the `interval` is that it will place rooms where `x % interval === 0 && y % interval === 0`.

### removeNPCTerminals ()

Removes all NPC Terminals.

### removeBots ()

Removes all Bots.
