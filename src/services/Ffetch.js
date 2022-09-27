const fetch = require('node-fetch')
const fs = require('fs')
const util = require('util')
const streamPipeline = util.promisify(require('stream').pipeline)

const SocksProxyAgent = require('socks-proxy-agent')
var HttpsProxyAgent = require('https-proxy-agent')

const UserAgent = require('user-agents')
const process = require('process')
const moment = require('moment')
const iconv = require('iconv-lite')

const Ffile = require('./file')
const { clg, pleaseWait, catchError, lg, gFName } = require(`./tools`)

global.gCookies = {
  marketwatch: false,
}

module.exports = {
  down,
  getWANIP,
  updateProxies,
  downloadBinaryFile,
}

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
      posttype: undefined, //object or a querystring : adds Content-type: application/x-www-form-urlencoded header.
      json: false, //Use this to intercept a JSON directly
      body: undefined,
      compress: false, // support gzip/deflate content encoding. false to disable
      log_tab: 0,
      get_wan: false,
      followAllRedirects: 'follow', //set to `manual` to extract redirect headers, `error` to reject redirect
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
      public_proxy_type: 'socks5', //Also use socks5
      log_req: false,
      rotate_agent: false,
      disablessl: false,
      id: false,
      returnResObj: false,
      charset: false,
    },
    params
  )

  const {
    source,
    rotate_agent,
    headers,
    method,
    body,
    json,
    compress,
    followAllRedirects,
    use_public_proxy,
    public_proxy_type,
    use_tor,
    use_awsproxy,
    use_ediagadir_proxy,
    get_wan,
    id,
    url,
    log_req,
    disablessl,
    returnResObj,
    charset,
    savetofile,
  } = params

  let trials = 0
  let max_trials = gfinalConfig[source]
    ? gfinalConfig[source].tor_max_download_trials
    : gfinalConfig.default.tor_max_download_trials

  if (rotate_agent) {
    const userAgent = new UserAgent()
    headers['User-Agent'] = userAgent.toString()
  }
  var options = {
    method: method,
    timeout: gfinalConfig[source] ? gfinalConfig[source].tor_timeout : gfinalConfig.default.tor_timeout,
    headers: headers,
    body: body,
    json: json,
    compress: compress,
    redirect: followAllRedirects,
  }
  let download_success = false
  let response = null
  while (!download_success && trials < max_trials) {
    try {
      trials++
      let random_proxy
      if (use_public_proxy) {
        if (
          !gfinalConfig['proxies'] ||
          !Array.isArray(gfinalConfig['proxies']) ||
          gfinalConfig['proxies'].length == 0
        ) {
          await updateProxies(log_tab + 2)
        }
        random_proxy = gfinalConfig['proxies'][Math.floor(Math.random() * gfinalConfig['proxies'].length)]
        if (public_proxy_type === 'http') options['agent'] = new HttpsProxyAgent(`http://${random_proxy}`)
        if (public_proxy_type === 'socks5') options['agent'] = new SocksProxyAgent(`socks5://${random_proxy}`)
        options['last_used_proxy'] = random_proxy
      }
      if (use_tor) {
        options['agent'] = new SocksProxyAgent(`socks5://${process.env.TOR_ADDRESS}:${process.env.TOR_PORT}`)
      }
      if (use_awsproxy) {
        options['agent'] = new HttpsProxyAgent(`http://${process.env.AWS_HTTP_PROXY}`)
        if (parseInt(process.env.AWS_HTTP_PROXY_AUTH))
          options[
            'agent'
          ].proxy.auth = `${process.env.AWS_HTTP_PROXY_USER}:${process.env.AWS_HTTP_PROXY_PASS}`
      }
      if (use_ediagadir_proxy) {
        options['agent'] = new HttpsProxyAgent(`http://${process.env.EDIAGADIR_HTTP_PROXY}`)
        if (parseInt(process.env.EDIAGADIR_HTTP_PROXY_AUTH))
          options[
            'agent'
          ].proxy.auth = `${process.env.EDIAGADIR_HTTP_PROXY_USER}:${process.env.EDIAGADIR_HTTP_PROXY_PASS}`
      }

      if (trials < 10) {
        if (use_tor) {
          lg(
            `ID [${id ? id : ''}] Fetch-Trial=${trials} | TOR_IP= ${!get_wan ? '' : 'GETWAN'} | Url= ${url} `,
            log_tab + 1,
            'info',
            source
          )
        } else if (use_public_proxy) {
          lg(
            `ID [${id ? id : ''}] Fetch-Trial= ${trials} | PUBLIC PROXY= ${random_proxy} | Url= ${url}`,
            log_tab + 1,
            'info',
            source
          )
        } else if (use_awsproxy) {
          lg(
            `ID [${id ? id : ''}] Fetch-Trial= ${trials} | AWSPROXY= ${
              process.env.AWS_HTTP_PROXY
            } | Url= ${url}`,
            log_tab + 1,
            'info',
            source
          )
        } else if (use_ediagadir_proxy) {
          lg(
            `ID [${id ? id : ''}] Fetch-Trial= ${trials} | EDIAGADIR Proxy= ${
              process.env.EDIAGADIR_HTTP_PROXY
            } | Url= ${url}`,
            log_tab + 1,
            'info',
            source
          )
        } else {
          lg(
            `ID [${id ? id : ''}] Fetch-Trial= ${trials} | NO PROXY= ${
              !get_wan ? '' : 'GETWAN'
            } | Url= ${url}`,
            log_tab + 1,
            'info',
            source
          )
        }
      }
      if (trials > 10) {
        if (use_tor) {
          lg(
            `ID [${id ? id : ''}] Fetch-Trial=${trials} | TOR_IP= ${!get_wan ? '' : 'GETWAN'} | Url= ${url} `,
            log_tab + 1,
            'warn',
            source
          )
        } else if (use_public_proxy) {
          lg(
            `ID [${id ? id : ''}] Fetch-Trial= ${trials} | PROXY= ${random_proxy} | Url= ${url}`,
            log_tab + 1,
            'warn',
            source
          )
        } else if (use_awsproxy) {
          lg(
            `ID [${id ? id : ''}] Fetch-Trial= ${trials} | AWSPROXY= ${
              process.env.AWS_HTTP_PROXY
            } | Url= ${url}`,
            log_tab + 1,
            'warn',
            source
          )
        } else if (use_ediagadir_proxy) {
          lg(
            `ID [${id ? id : ''}] Fetch-Trial= ${trials} | EDIAGADIR Proxy= ${
              process.env.EDIAGADIR_HTTP_PROXY
            } | Url= ${url}`,
            log_tab + 1,
            'warn',
            source
          )
        } else {
          lg(
            `ID [${id ? id : ''}] Fetch-Trial= ${trials} | NO PROXY= ${
              !get_wan ? '' : 'GETWAN'
            } | Url= ${url}`,
            log_tab + 1,
            'warn',
            source
          )
        }
      }
      options.url = url
      if (log_req) clg(options)
      if (disablessl) process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0
      response = await fetch(url, options)
      if (disablessl) process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 1
      if (log_req) clg(response)
      if (
        (!response.ok && response.status !== 410 && source !== 'finanzen' && source !== 'maltaan') ||
        (source === 'maltaan' && !response.ok && response.status !== 404)
      ) {
        lg(
          `ID [${id ? id : ''}] Fetch-Download error: code= ${response.status} | Text: ${
            response.statusText
          }`,
          log_tab + 1,
          'error',
          source
        )
        lg(
          `Fetch-Response lenght ${response.headers.get('Content-Length')} | Text: ${response.statusText}`,
          log_tab + 1,
          'error',
          source
        )
        Ffile.writeToFile(
          `${__dirname}/../downloads/${moment().format('YYYYMMDD')}-${source}-ERROR-${makeid(10)}.html`,
          response.body
        )
        await pleaseWait(3, 6, log_tab + 1, source)
      } else if (
        use_public_proxy &&
        response.ok &&
        source === 'belarus' &&
        (await response.text()).includes('big_loader')
      ) {
        lg(
          `ID [${id ? id : ''}] Fetch-Download: Belarus : Loader page received !, retry ...`,
          log_tab + 1,
          'warn',
          source
        )
        if (options['last_used_proxy'] && options['last_used_proxy'].length > 0) {
          gfinalConfig['proxies'] = gfinalConfig['proxies'].filter(
            item => item !== options['last_used_proxy']
          )
          lg(
            `ID [${id ? id : ''}] Fetch-Download: Belarus : DELETED proxy [${options['last_used_proxy']}]`,
            log_tab + 1,
            'warn',
            source
          )
        }
        await pleaseWait(3, 6, log_tab, source)
      } else {
        lg(`ID [${id ? id : ''}] DOWNLOAD SUCCESS: code= ${response.status}`, log_tab + 1, 'verbose', source)
        download_success = true
        if (returnResObj) {
          return response
        }
        let resbody
        if (json) {
          resbody = await response.json()
        } else {
          if (charset) {
            resbody = iconv.decode(await response.buffer(), charset)
          } else {
            resbody = await response.text()
          }
        }
        if (savetofile) {
          const fullName = `${__dirname}/../downloads/${moment().format('YYYYMMDD')}-${source}-${makeid(
            10
          )}.html`
          Ffile.writeToFile(fullName, resbody)
        }
        return resbody
      }
    } catch (err) {
      catchError(err, `[${source}][${id}]`, true, 'error', log_tab + 1, source)
      await pleaseWait(3, 6, log_tab, source)
    }
  }
  try {
    if (!download_success) {
      lg(`Fetch-Trials exceeded ${max_trials} for ${url}`, log_tab + 1, 'error', source)
      throw new Error(`Trials exceeded ${max_trials} for ${url}`)
    }
  } catch (err) {
    catchError(err, `[${source}][${id}]`, true, 'error', log_tab + 1, source)
    return
  }
}

async function downloadBinaryFile(source, params, log_tab) {
  try {
    params = {
      shortFileName: 'shortFileName',
      savePath: process.env.DEFAULT_EXPORTED_FILES_PATH,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
      ...params,
    }
    let response = await down(
      {
        id: 'downloadBinaryFile',
        source: source,
        url: params.url,
        returnResObj: true,
        headers: params.headers,
      },
      log_tab + 1
    )
    let shortName = `${params.prefix ? `${params.prefix}-` : ''}${params.shortFileName}${
      params.extension ? params.extension : ''
    }`
    const dest = fs.createWriteStream(`${params.savePath}${shortName}`)
    if (source === 'maltaan' && response.status === 404) {
      shortName = 'COULD_NOT_DOWNLOAD_FILE' // could not download the file
      lg(`Could not download file from url ${params.url}`, log_tab + 1, 'warn', source)
    } else {
      await streamPipeline(response.body, dest)
    }
    return { shortName: shortName, res: response }
  } catch (err) {
    catchError(err, gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}

async function updateProxies(log_tab) {
  try {
    clg('START - Update proxies', log_tab + 1)
    let res = await down(
      {
        source: 'proxylist',
        url: `https://api.proxyscrape.com/?request=getproxies&proxytype=socks5&timeout=${process.env.FETCH_PROXIES_MAX_MS}&country=all&ssl=yes&anonymity=elite`,
      },
      log_tab + 1
    )
    let proxies = res.split(/\r?\n/)
    if (Array.isArray(proxies) && proxies.length > 0) {
      proxies.pop()
      gfinalConfig['proxies'] = proxies
    } else {
      lg(`Something is wrong, invalid data extracted for proxies`, log_tab + 1, 'warn')
    }
    clg(JSON.stringify(proxies))
    clg('END - Update proxies', log_tab + 1)
    return proxies
  } catch (err) {
    catchError(err, 'getProxy', log_tab + 1)
    return
  }
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

async function getWANIP() {
  // let ip = await downloadUrlUsingTor(
  //   "GETWAN_IP",
  //   "https://api.ipify.org",
  //   undefined,
  //   "GET",
  //   undefined,
  //   use_tor,
  //   undefined,
  //   undefined,
  //   undefined,
  //   undefined,
  //   undefined,
  //   undefined,
  //   undefined,
  //   undefined,
  //   undefined,
  //   true
  // );
  // resolve(ip.body);
  return true
}
