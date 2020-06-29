/*  config.yml
    gclToCPU
    maxCPU
    baseCPU
    stepCPU
 */

module.exports = config => {
  config.utils.gclToCPU = {
    enabled: false,
    maxCPU: 300,
    baseCPU: 20,
    stepCPU: 10
  }
  const set = (k, v) => { config.utils.gclToCPU[k] = v }
  config.utils.on('config:update:gclToCPU', v => set('enabled', !!v))
  for (const k of ['maxCPU', 'baseCPU', 'stepCPU']) {
    config.utils.on(`config:update:${k}`, v => set(k, v))
  }
}
