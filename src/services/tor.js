/* global gCookies */

const requestpromise = require('request-promise')
// require('request-debug')(requestpromise)
var querystring = require('querystring')

const SocksProxyAgent = require('socks-proxy-agent')
const UserAgent = require('user-agents')
const process = require('process')
const cheerio = require('cheerio')

const filemodule = require('./file.js')
const tools = require(`./tools`)
const lg = tools.lg

global.gCookies = {
  marketwatch: false,
}

module.exports = {
  downloadUrlUsingTor,
  getSGXMASCookie,
}

const default_headers = {
  // "User-Agent": "Mozilla/5.0 (Windows NT 6.2; Win64; x64; rv:67.0) Gecko/20100101 Firefox/67.0",
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
}

async function downloadUrlUsingTor(
  label,
  url,
  headers = default_headers,
  method = 'GET',
  post_param = undefined, //object or a querystring : adds Content-type: application/x-www-form-urlencoded header.
  use_tor = true,
  json = false, //Use this to intercept a JSON directly
  raw_body = undefined, //Use this to sent raw body request | send object instead of string
  gzip = false,
  jar = undefined,
  rejectUnauthorized = false, //For Bolivia to fix SSl issue
  strictSSL = false, //For Bolivia to fix SSl issue
  file = true,
  simple = false, //False to avoid throwing error in case statusCode != 200, We manage error manually
  log_tab = 0,
  get_wan = false,
  followAllRedirects = false
) {
  let proxy = `socks5://${process.env.TOR_ADDRESS}:${process.env.TOR_PORT}`
  let agent = new SocksProxyAgent(proxy)
  let trials = 0
  let max_trials = gfinalConfig.default.tor_max_download_trials
  // if (label == 'Marketwatch') {
  //   lg(`This is a Marketwatch request`, log_tab, 'info', 'download')
  //   if (!gCookies.marketwatch) jar = await getMarketwatchCookie()
  //   else jar = gCookies.marketwatch
  // }
  if (label == 'Bolivia') {
    rejectUnauthorized = true
  }
  if (label == 'BourseDirect') {
    gzip = true
    json = true
  }
  if (label == 'HypoBank') {
    gzip = true
    json = true
    use_tor = false
  }
  if (label != 'Denmark_one_bond' && label != 'Denmark' && label != 'ireland') {
    const userAgent = new UserAgent()
    headers['User-Agent'] = userAgent.toString()
  }

  var options = {
    method: method,
    timeout: gfinalConfig.default.tor_timeout,
    uri: url,
    headers: headers,
    resolveWithFullResponse: true,
    form: post_param,
    body: raw_body,
    json: json,
    gzip: gzip,
    jar: jar,
    rejectUnauthorized: rejectUnauthorized,
    strictSSL: strictSSL,
    simple: simple,
    followAllRedirects: followAllRedirects,
  }
  if (file) options.encoding = 'binary'
  if (
    label === 'jse' ||
    label === 'maltaan_file' ||
    label === 'investigate_pdf' ||
    label === 'malasiaann_pdf'
  ) {
    options.encoding = 'binary'
    // options.timeout = gfinalConfig.jse.tor_timeout;
    options.headers['Content-type'] = 'application/pdf'
    use_tor = false
  }
  if (label === 'Belarus') {
    use_tor = false
  }
  if (label === 'Londonse') {
    options.timeout = gfinalConfig.londonse.req_timeout
  }
  if (use_tor) {
    options.agent = agent
    options.tunnel = true
  }
  // console.log(label);
  // console.log(gfinalConfig[label]);
  if (gfinalConfig[label] != undefined && gfinalConfig[label]['tor_timeout'] != undefined) {
    // lg(`Set Timeout = ${gfinalConfig[label]["tor_timeout"]}`);
    options.timeout = gfinalConfig[label]['tor_timeout']
  }
  if (label === 'ireland') {
    if (!gCookies.EuronextIreland) {
      lg(`EuronextIreland Cookie is empty`, 1, 'warn', 'general')
      await updateEuronextIrelandCookie(2)
      headers.Cookie = gCookies.EuronextIreland.cookie
      headers.RequestVerificationToken = gCookies.EuronextIreland.token
      headers['user-agent'] = gCookies.EuronextIreland.user_agent
      // lg(`EuronextIreland Cookie Updated !`);
      // let reg = new RegExp(/(?:citrix_ns_id=)(\S*)(?:;)/);
      // let token = reg.exec(gCookies.EuronextIreland[1])[1];
      // lg(
      //   `Updated: Token=${headers.RequestVerificationToken} Cookie=${headers.Cookie}`,
      //   2
      // );
    } else {
      headers.Cookie = gCookies.EuronextIreland.cookie
      // let reg = new RegExp(/(?:citrix_ns_id=)(\S*)(?:;)/);
      // let token = reg.exec(gCookies.EuronextIreland[1])[1];
      headers.RequestVerificationToken = gCookies.EuronextIreland.token
      headers['user-agent'] = gCookies.EuronextIreland.user_agent
      // lg(
      //   `Using: Token=${headers.RequestVerificationToken} Cookie=${headers.Cookie}`,
      //   2
      // );
    }
  }
  if (label === 'sgxmas') {
    let { new_headers, new_post_params } = await checkSGXMASCookieAndSecurity(
      options.headers,
      options.body,
      log_tab + 2
    )
    options.headers = new_headers
    options.body = new_post_params
  }
  let download_success = false
  let response = null
  while (!download_success && trials < max_trials) {
    try {
      // tools.download_log.info(`Final Headers used`);
      // tools.download_log.info(JSON.stringify(headers));
      trials++

      if (trials < 10) {
        if (!get_wan) {
          //Don't log if you want to get WAN IP
          if (use_tor) {
            lg(
              `Trial=${trials} | TOR_IP= ${!get_wan ? '' : 'GETWAN'} | Url= ${url} `,
              log_tab,
              'info',
              'download'
            )
          } else {
            lg(
              `Trial= ${trials} | WAN_IP= ${!get_wan ? '' : 'GETWAN'} | Url= ${url}`,
              log_tab,
              'info',
              'download'
            )
          }
        }
      }
      if (trials > 10) {
        if (use_tor) {
          lg(
            `Trial=${trials} | TOR_IP= ${!get_wan ? '' : 'GETWAN'} | Url= ${url} `,
            log_tab,
            'warn',
            'download'
          )
        } else {
          lg(
            `Trial= ${trials} | WAN_IP= ${!get_wan ? '' : 'GETWAN'} | Url= ${url}`,
            log_tab,
            'warn',
            'download'
          )
        }
      }
      // console.log(options);
      response = await requestpromise(options)
      //SGX MAX Session check
      if (
        label === 'sgxmas' &&
        response.statusCode === 200 &&
        response.body.includes(
          'The page you requested could have been moved to a different address or permanently removed'
        )
      ) {
        lg(`SGXMAS Session probably expired = ${response.statusCode}`, log_tab, 'error', 'download')
        gCookies.SGXMAS = false
        let { new_headers, new_post_params } = await checkSGXMASCookieAndSecurity(
          options.headers,
          options.body,
          log_tab + 2
        )
        options.headers = new_headers
        options.body = new_post_params
        // await checkSGXMASCookieAndSecurity(options.headers, options.body, log_tab + 3);
        await tools.pleaseWait(3, 6, 2)
      } else if (label === 'ireland' && response.statusCode == 403) {
        lg(`Ireland Cookie maybe expired HTTP Code = ${response.statusCode}`, log_tab, 'error', 'download')
        await updateEuronextIrelandCookie()
        await tools.pleaseWait(3, 6, 2)
      } else if (
        (response.statusCode != 200 &&
          label != 'maltaan_file' &&
          label != 'irelandbondsmstr_file' &&
          label != 'BourseDirect') ||
        (response.statusCode != 200 && label === 'irelandbondsmstr_file' && trials < 5) ||
        (label === 'maltaan_file' && response.statusCode != 400 && response.statusCode != 200) ||
        (response.headers['content-length'] < 200 &&
          label != 'Euronext' &&
          label != 'BourseDirect' &&
          label != 'AFED Files' &&
          label != 'GETWAN_IP' &&
          label != 'sgxmas_json' &&
          label != 'msrb') ||
        (label === 'Denmark_one_bond' && response.body.includes('Error getting json data from'))
      ) {
        lg(`Download error: code= ${response.statusCode}`, log_tab, 'error', 'download')
        lg(`Response lenght ${response.headers['content-length']}`, log_tab, 'error', 'download')
        filemodule.writeToFile(`downloads/error-${makeid(10)}.html`, response.body)
        await tools.pleaseWait(3, 6, 2)
      } else if (label === 'irelandbondsmstr_file' && response.statusCode != 200) {
        return response
      } else {
        download_success = true
        if (label === 'ireland') {
          filemodule.writeToFile(`downloads/ireland-${makeid(10)}.html`, response.body)
        }
        return response
      }
    } catch (err) {
      tools.catchError(err, label, false, 'download')
      await tools.pleaseWait(4, 7, 2)
    }
  }
  try {
    if (!download_success) {
      lg(`Trials exceeded ${max_trials} for ${url}`, log_tab, 'error', 'download')
      throw new Error(`Trials exceeded ${max_trials} for ${url}`)
    }
  } catch (err) {
    tools.catchError(err, label, false, 'download')
    // tools.lg(`generateAllAFEDFiles : ${err.message}`);
    throw new Error(err)
  }
}

async function checkSGXMASCookieAndSecurity(original_headers, post_params, log_tab = 1) {
  try {
    lg(`Check SGXMAS Cookie !`, log_tab + 1)
    post_params = querystring.decode(post_params)
    if (!gCookies.SGXMAS) {
      lg(`SGXMAS Cookie is empty`, log_tab + 2, 'warn', 'general')
      gCookies.SGXMAS = await getSGXMASCookie(log_tab + 1)
      original_headers.Cookie = gCookies.SGXMAS.cookie
      original_headers['user-agent'] = gCookies.SGXMAS.user_agent
      gCookies.SGXMAS.asp_security.map(param => {
        if (post_params[param.id]) {
          post_params[param.id] = param.value
        }
      })
      post_params = querystring.encode(post_params)
      lg(`SGXMASCookie Cookie updated`, log_tab)
    } else {
      lg(`SGXMAS Cookie is OK !`, log_tab + 2, 'warn', 'general')
      original_headers.Cookie = gCookies.SGXMAS.cookie
      original_headers['user-agent'] = gCookies.SGXMAS.user_agent
      post_params = querystring.encode(post_params)
    }
    return {
      new_headers: original_headers,
      new_post_params: post_params,
    }
  } catch (err) {
    tools.catchError(err, `updateSGXMASCookie`, true, undefined, log_tab + 3)
    throw new Error(err)
  }
}

async function getSGXMASCookie(log_tab = 1) {
  try {
    lg(`START - getSGXMASCookie`, log_tab + 1)
    const userAgent = new UserAgent().toString()
    var sgxmas_headers = {
      'User-Agent': userAgent,
      Accept: '*/*',
      Connection: 'keep-alive',
    }
    let response = await downloadUrlUsingTor(
      'sgxmas_cookie',
      'https://eservices.mas.gov.sg/Statistics/fdanet/AmountOutstanding.aspx',
      sgxmas_headers,
      'GET',
      undefined,
      false,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      log_tab + 1
    )
    let resp_setcookie = response.headers['set-cookie']
    let ASP_Security = await getASPSecurity(response.body, log_tab + 1)
    lg(`END - getSGXMASCookie`, log_tab + 1)
    return {
      cookie: resp_setcookie,
      user_agent: userAgent,
      asp_security: ASP_Security,
    }
  } catch (err) {
    tools.catchError(err, 'getSGXMASCookie', undefined, 'download', log_tab + 1)
    throw new Error(err)
  }
}

async function getASPSecurity(body, log_tab = 1) {
  try {
    lg(`START - getASPSecurity`, log_tab + 1)
    let $ = cheerio.load(body)
    let sec_div = $('div.aspNetHidden input').get()
    let ASPSecurity = sec_div.map(input => {
      return {
        id: $(input).attr('id'),
        value: $(input).attr('value'),
      }
    })
    lg(`END - getASPSecurity`, log_tab + 1)
    return ASPSecurity
  } catch (err) {
    tools.catchError(err, `updateSGXMASCookie`, undefined, 'download', log_tab + 2)
    throw new Error(err)
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

async function updateEuronextIrelandCookie(tab_level = 1) {
  try {
    lg(`Update EuronextIreland Cookie !`, tab_level)
    gCookies.EuronextIreland = await getEuronextIrelandCookie(tab_level + 1)
    lg(`EuronextIreland Cookie updated`, tab_level)
    lg(``, tab_level)
    return gCookies.EuronextIreland
  } catch (err) {
    tools.catchError(err, `updateEuronextIrelandCookie`)
    throw new Error(err)
  }
}

async function getEuronextIrelandCookie(tab_level = 1) {
  try {
    const userAgent = new UserAgent()
    // let user_agent = userAgent.toString();
    var ireland_headers = {
      'User-Agent': userAgent.toString(),
      Accept: '*/*',
      Connection: 'keep-alive',
      //   Referer:
      //     "https://www.londonstockexchange.com/news?tab=news-explorer&headlinetypes=&excludeheadlines=&period=custom&beforedate=20200721&afterdate=20200719&headlines=,16,75,79",
    }
    // tools.download_log.info(`Get getEuronextIrelandCookie`);
    let response = await downloadUrlUsingTor(
      'ireland_cookie',
      'https://direct.euronext.com/Announcements/View-Announcements/RIS-Announcements/#page-1',
      ireland_headers,
      'GET',
      undefined,
      false,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      tab_level + 1
    )
    let resp_setcookie = response.headers['set-cookie']
    let rege = new RegExp(/(?:RequestVerificationToken", ')(\S*)'/)
    let token = rege.exec(response.body)[1]
    // lg(`New Cookie=${resp_setcookie}`, tab_level);
    // lg(`New RequestVerificationToken=${token}`, tab_level);
    // lg(`New UserAgent=${user_agent}`, tab_level);
    return {
      cookie: resp_setcookie,
      token: token,
      user_agent: userAgent.toString(),
    }
  } catch (err) {
    tools.catchError(err, 'getEuronextIrelandCookie', tab_level + 1)
    throw new Error(err)
  }
}
