const _ = require('lodash')

import configFile from './config.json'

export default function config() {
  const defaultConfig = configFile.DEV
  const environment = process.env.NODE_ENV || 'DEV'
  const environmentConfig = configFile[environment]
  global.gfinalConfig = _.merge(defaultConfig, environmentConfig)
  const finalConfig = _.merge(defaultConfig, environmentConfig)
  return finalConfig
  //   if (!global.gfinalConfig.default.enable_download_log) {
  //     silenceLogger(download_log)
  //   }
  //   if (!global.gfinalConfig.default.enable_general_log) {
  //     silenceLogger(general_log)
  //   }
  // global.Loggers.set('general', createLog('general'))
  // console.log(`GlobalFinalConfig: ${JSON.stringify(gfinalConfig)}`);
}
