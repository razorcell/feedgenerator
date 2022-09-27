const axios = require('axios')

const SocksProxyAgent = require('socks-proxy-agent')
var HttpsProxyAgent = require('https-proxy-agent')

// const logger = require("./logger.js");
const filemodule = require('./file')
const UserAgent = require('user-agents')
const process = require('process')
const moment = require('moment')
const { omit } = require('lodash')

const tools = require(`./tools`)
const lg = tools.lg

global.gCookies = {
  marketwatch: false,
}

module.exports = {
  down,
}

/**
 * It downloads a page using a proxy, and if it fails, it tries again until it succeeds or until it
 * reaches the maximum number of trials
 * @param params - {
 * @param log_tab - This is the number of tabs to add to the log.
 * @returns The response object
 */
async function down(params, log_tab) {
  params = Object.assign(
    {},
    {
      source: 'general',
      method: 'GET',
      headers:
        gfinalConfig[params.source] && gfinalConfig[params.source].defheaders
          ? gfinalConfig[params.source].defheaders
          : gfinalConfig.default.defheaders,
      timeout: gfinalConfig[params.source]
        ? gfinalConfig[params.source].tor_timeout
        : gfinalConfig.default.tor_timeout,
      //Use this to intercept a JSON directly
      //options are: 'arraybuffer' (Binary file down), 'document', 'json', 'text', 'stream'
      responseType: false,
      data: undefined,
      log_tab: 0,
      get_wan: false,
      savetofile: false,
      use_tor: gfinalConfig[params.source]
        ? gfinalConfig[params.source].use_tor
        : gfinalConfig.default.use_tor,
      use_awsproxy: gfinalConfig[params.source]
        ? gfinalConfig[params.source].use_awsproxy
        : gfinalConfig.default.use_awsproxy,
      use_public_proxy: gfinalConfig[params.source]
        ? gfinalConfig[params.source].use_public_proxy
        : gfinalConfig.default.use_public_proxy,
      use_ediagadir_proxy: gfinalConfig[params.source]
        ? gfinalConfig[params.source].use_ediagadir_proxy
        : gfinalConfig.default.use_ediagadir_proxy,
      log_req: false,
      rotate_agent: true,
      id: false,
    },
    params
  )
  let trials = 0
  let max_trials = gfinalConfig[params.source]
    ? gfinalConfig[params.source].tor_max_download_trials
    : gfinalConfig.default.tor_max_download_trials

  if (params.rotate_agent) {
    const userAgent = new UserAgent()
    params.headers['User-Agent'] = userAgent.toString()
  }
  const delayMin = gfinalConfig[params.source] ? gfinalConfig[params.source].delay_min : 3
  const delayMax = gfinalConfig[params.source] ? gfinalConfig[params.source].delay_max : 6
  let download_success = false
  let response = null
  let ID = params.id ? params.id : ''
  while (!download_success && trials < max_trials) {
    try {
      trials++
      params = await applyProxy(params.source, params, log_tab + 1)
      let gateway = 'No PROXY'
      let logType = 'info'
      if (params.use_tor) gateway = 'TOR'
      if (params.use_awsproxy) gateway = 'AWS'
      if (params.use_public_proxy) gateway = 'PUBLIC PXY'
      if (params.use_ediagadir_proxy) gateway = 'AGADIR PXY'
      if (trials < 10) {
        logTrial(ID, params, gateway, trials, logType, log_tab)
      } else {
        logType = 'warn'
        logTrial(ID, params, gateway, trials, logType, log_tab)
      }
      const start = Date.now()
      response = await axios(paramsCleanUp(params))
      const time = Math.floor((Date.now() - start) / 1000)
      if (response.status !== 200) {
        logError(ID, params, response, log_tab + 1, time)
        if (params.savetofile) {
          filemodule.writeToFile(
            `downloads/${moment().format('YYYYMMDD')}-${params.source}-ERROR-${makeid(10)}.html`,
            response.data
          )
        }
        await tools.pleaseWait(delayMin, delayMax, log_tab + 1, params.source)
      } else {
        logSuccess(ID, params, response, log_tab + 1, time)
        download_success = true
        if (params.savetofile) {
          await filemodule.writeToFile(
            `downloads/${moment().format('YYYYMMDD')}-${params.source}-${makeid(10)}.html`,
            response.data
          )
        }
        return response
      }
    } catch (err) {
      tools.catchError(err, `[${params.source}][${params.id}]`, true, 'error', log_tab + 1, params.source)
      await tools.pleaseWait(delayMin, delayMax, log_tab + 1, params.source)
    }
  }
  try {
    if (!download_success) {
      lg(`ID[${ID}] Trials exceeded ${max_trials} URL[${params.url}]`, log_tab + 1, 'error', params.source)
      throw new Error(`ID[${ID}] Trials exceeded ${max_trials} URL[${params.url}]`)
    }
  } catch (err) {
    tools.catchError(err, `[${params.source}][${params.id}]`, true, 'error', log_tab + 1, params.source)
    return
  }
}

async function logTrial(ID, params, gateway, trials, logType, log_tab) {
  lg(`<b>Trial:${trials}</b> ID[${ID}] =>${gateway}=> Url=${params.url}`, log_tab + 1, logType, params.source)
}

async function logSuccess(ID, params, response, log_tab = 1, time) {
  lg(
    `ID[${ID}] DOWN SUCCESS: code=${response.status} in <b>${time} sec</b>`,
    log_tab + 1,
    'verbose',
    params.source
  )
}

async function logError(ID, params, response, log_tab = 1, time) {
  lg(
    `ID[${ID}] DOWN ERROR: code=${response.status} in <b>${time} sec</b> | Text: ${response.statusText}`,
    log_tab + 1,
    'error',
    params.source
  )
}

async function applyProxy(source, params) {
  if (params.use_tor) {
    params['httpAgent'] = new SocksProxyAgent(`socks5://${process.env.TOR_ADDRESS}:${process.env.TOR_PORT}`)
  }
  if (params.use_awsproxy) {
    params['httpAgent'] = new HttpsProxyAgent(`http://${process.env.AWS_HTTP_PROXY}`)
    if (parseInt(process.env.AWS_HTTP_PROXY_AUTH))
      params['httpAgent'].proxy.auth = `${process.env.AWS_HTTP_PROXY_USER}:${process.env.AWS_HTTP_PROXY_PASS}`
  }
  if (params.use_ediagadir_proxy) {
    params['httpAgent'] = new HttpsProxyAgent(`http://${process.env.EDIAGADIR_HTTP_PROXY}`)
    if (parseInt(process.env.EDIAGADIR_HTTP_PROXY_AUTH))
      params[
        'httpAgent'
      ].proxy.auth = `${process.env.EDIAGADIR_HTTP_PROXY_USER}:${process.env.EDIAGADIR_HTTP_PROXY_PASS}`
  }
  return params
}

const paramsCleanUp = params => {
  return omit(params, [
    'source',
    'log_tab',
    'get_wan',
    'savetofile',
    'use_tor',
    'use_awsproxy',
    'use_public_proxy',
    'use_ediagadir_proxy',
    'log_req',
    'rotate_agent',
    'id',
  ])
}

function makeid(length) {
  var result = ''
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  var charactersLength = characters.length
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
  }
  return result
}
