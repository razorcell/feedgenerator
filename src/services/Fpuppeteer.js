const puppeteer = require('puppeteer-extra')
const pluginStealth = require('puppeteer-extra-plugin-stealth')
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker')
const UserAgent = require('user-agents')

const RequestInterceptor = require('puppeteer-request-spy').RequestInterceptor
const RequestSpy = require('puppeteer-request-spy').RequestSpy
// const minimatch = require('minimatch');
// const assert = require('assert');

const captchasolve = require(`./captchasolve`)
const tools = require(`./tools`)

const lg = tools.lg
const { clg } = require(`./tools`)

let browser = false

let requestInterceptor = new RequestInterceptor(KeywordMatcher, console)

module.exports = {
  openBrowser,
  closeBrowser,
  newPage,
  GetProperty,
  getElementContent,
}

function openBrowser(stealthmode, adblocker, use_tor, websecurity, log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        if (!browser) {
          if (stealthmode) puppeteer.use(pluginStealth())
          if (adblocker)
            puppeteer.use(
              AdblockerPlugin({
                blockTrackers: true,
              })
            )
          let args = [
            '--disable-features=IsolateOrigins,site-per-process',
            // '--blink-settings=imagesEnabled=true',//Think this caused issue with Singapore EX
            '--no-sandbox', //For Docker environment
            '--disable-setuid-sandbox', //For Docker environment
          ]
          if (websecurity) args.push('--disable-web-security')
          if (use_tor) args.push(`--proxy-server=socks5://${process.env.TOR_ADDRESS}:${process.env.TOR_PORT}`)
          browser = await puppeteer.launch({
            headless: false,
            slowMo: 0,
            ignoreHTTPSErrors: true,
            args: args,
          })
          lg(`openBrowser: Opened !`, log_tab + 1)
        } else {
          lg(`openBrowser: Already opened !`, log_tab + 1, 'warn')
        }
        resolve(browser)
        return
      } catch (err) {
        lg(`openBrowser:  ${err.message}`, log_tab + 2, 'error')
        reject(`openBrowser: ${err.message}`)
      }
    })()
  })
}

function closeBrowser(log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        if (!browser) {
          lg(`closeBrowser: Already closed !`, log_tab + 1)
        } else {
          await browser.close()
          lg(`closeBrowser: Closed ! !`, log_tab + 1)
        }
        resolve(true)
        return
      } catch (err) {
        lg(`closeBrowser:  ${err.message}`, log_tab + 2, 'error')
        reject(`closeBrowser: ${err.message}`)
      }
    })()
  })
}

// await browser.close();
function KeywordMatcher(testee, keyword) {
  return testee.indexOf(keyword) > -1
}

async function newPage(source, params, log_tab) {
  if (!browser) {
    lg(`Puppeteer instance not found`, 'warn', log_tab + 1, source)
    return false
  }
  return await browser.newPage()
}

function getElementContent(
  url,
  selector,
  attribute = 'innerHTML',
  source,
  waitForFunction,
  solvecaptcha,
  random_UAgent = true,
  extra_headers = false,
  intercept_filter = false,
  log_tab
) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        if (intercept_filter) {
          let Spy = new RequestSpy(intercept_filter) //Use a string from the URL as a filter, or false to not intercept
        }
        let page = null
        let trial = 1
        let page_loaded = false
        while (!page_loaded) {
          try {
            if (trial > gfinalConfig[source].pupeteer_max_trials) {
              lg(`${source}: Chrome Maximum Trials [${gfinalConfig[source].pupeteer_max_trials}] exceeded`, 4)
              resolve([])
              return
            }
            lg(`${source}: Trial [${trial}] Chrome Goto: ${url}`, log_tab + 2)
            trial++
            page = await browser.newPage()
            if (intercept_filter) {
              await page.setRequestInterception(true)
              requestInterceptor.addSpy(Spy)
              page.on('request', requestInterceptor.intercept.bind(requestInterceptor))
            }

            await page.setBypassCSP(true)
            if (random_UAgent) await page.setUserAgent(new UserAgent().toString())
            await page.setExtraHTTPHeaders(extra_headers)
            await page.goto(url, {
              waitUntil: 'load',
              timeout: gfinalConfig[source].puppeteer_timeout,
            })
            if (intercept_filter) {
              clg(Spy.getMatchedRequests())
            }
            lg(`Wait for page Navigation`, log_tab + 2)
            await page.waitForNavigation()
            if (waitForFunction) {
              lg(`Wait for Function...`, log_tab + 2)
              await page.waitForFunction(waitForFunction)
            }
            page_loaded = true
          } catch (err) {
            lg(`getElementContent => LoadPage: ${err.message}`, log_tab + 3, 'error')
            await page.close()
            await tools.pleaseWait(
              gfinalConfig[source].puppeteer_delay_min,
              gfinalConfig[source].puppeteer_delay_max,
              5
            )
          }
        }
        if (solvecaptcha) {
          //Preliminary test failed !
          lg(`Solving Captcha !`, log_tab + 2)
          await captchasolve(page)
        }
        //`document.querySelector("#news-article-content > div.news-article-content-wrapper > div.news-article-content-body").shadowRoot.querySelector("div")`
        lg(`Get element`, log_tab + 2)
        const content = await page.evaluateHandle(`document.querySelector("${selector}")`)
        lg(`Get Property`, log_tab + 2)
        let elementcontent = await GetProperty(content, attribute)
        await page.close()
        resolve(elementcontent)
        return
      } catch (err) {
        tools.catchError(err, 'getElementContent', true, 'general', log_tab + 2)
        reject(`getElementContent: ${err.message}`)
      }
    })()
  })
}

function GetProperty(element, property, log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        resolve(await (await element.getProperty(property)).jsonValue())
        return
      } catch (err) {
        lg(`GetProperty:  ${err.message}`, log_tab + 2, 'error')
        reject(`GetProperty: ${err.message}`)
      }
    })()
  })
}
