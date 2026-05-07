const backendUtils = require('@screeps/backend/lib/utils.js')
const cronjobsModule = require('@screeps/backend/lib/cronjobs.js')

const log = (...args) => console.log('[cronjobMgr]', ...args)

const isPositiveNumber = value => typeof value === 'number' && Number.isFinite(value) && value > 0

module.exports = config => {
  let cronjobMgrConfig = {}
  /** After reloadConfig emits `config`; blocks cron tick until then (see common.js). */
  let configLoaded = false

  config.utils.on('config', conf => {
    // can't use config:update:cronjobMgr because it might be missing
    if (conf == null || typeof conf !== 'object') return
    cronjobMgrConfig =
      conf.cronjobMgr != null && typeof conf.cronjobMgr === 'object'
        ? conf.cronjobMgr
        : {}
    configLoaded = true
  })

  const listCronjobs = backendUtils.withHelp([
    'listCronjobs() - (admin-utils) List backend cronjobs',
    function listCronjobs () {
      if (!configLoaded) {
        return 'Cronjobs: (no config yet — waiting for first reloadConfig / `config` emit)'
      }
      const jobs = config.cronjobs || {}
      const names = Object.keys(jobs).sort((a, b) => a.localeCompare(b))
      const rows = [['name', 'status', 'interval', 'lastRun']]
      for (const name of names) {
        const entry = jobs[name]
        const jobState = cronjobMgrConfig[name]
        if (!Array.isArray(entry) || typeof entry[1] !== 'function') continue

        const [baselineIntervalSec, , lastTriggered] = entry
        const disabled = jobState === false
        const status = disabled ? 'disabled' : 'enabled'

        const intervalStr =
          !disabled && isPositiveNumber(jobState) && jobState !== baselineIntervalSec
            ? `${jobState}s (${baselineIntervalSec}s)`
            : `${baselineIntervalSec}s`

        const lastRun =
          typeof lastTriggered === 'number' && Number.isFinite(lastTriggered)
            ? new Date(lastTriggered).toISOString()
            : '—'

        rows.push([name, status, intervalStr, lastRun])
      }

      const widths = rows[0].map((_, i) =>
        Math.max(...rows.map(r => String(r[i]).length))
      )
      const lines = rows.map(r =>
        r.map((cell, i) => String(cell).padEnd(widths[i])).join('  ')
      )
      return ['Cronjobs:', ...lines].join('\n')
    }
  ])

  function runCronjobEntry (name, jobData, jobState) {
    if (!Array.isArray(jobData) || typeof jobData[1] !== 'function') return

    const baselineIntervalSec = jobData[0]

    if (jobState === false) {
      if (Date.now() - (jobData[2] || 0) > baselineIntervalSec * 1000) {
        log(`Cronjob '${name}' disabled, skipping...`)
        jobData[2] = Date.now()
      }
      return
    }

    const intervalSec = isPositiveNumber(jobState) ? jobState : baselineIntervalSec
    if (Date.now() - (jobData[2] || 0) > intervalSec * 1000) {
      log(`Running cronjob '${name}'`)
      jobData[2] = Date.now()
      jobData[1]({ utils: backendUtils })
    }
  }

  // for obvious reasons, we need to run this cronjob at all times
  const mandatoryCronjobs = ['screepsLauncherConfig']

  cronjobsModule.run = function cronjobMgrRun () {
    const jobs = config.cronjobs || {}
    const overrides = cronjobMgrConfig

    for (const [name, jobData] of Object.entries(jobs)) {
      if (!configLoaded && !mandatoryCronjobs.includes(name)) continue
      runCronjobEntry(name, jobData, overrides[name])
    }
  }

  config.cli.on('cliSandbox', sandbox => {
    sandbox.system = sandbox.system || {}
    sandbox.system.listCronjobs = listCronjobs
    sandbox.system._help = backendUtils.generateCliHelp('system.', sandbox.system)
  })
}
