const tools = require(`../tools`)
const scraping = require(`../scraping`)
// const Faxios = require(`../Faxios`)
// const FormData = require('form-data')
const { pleaseWait } = require('../tools')
const Fpuppeteer = require(`../Fpuppeteer`)
const file = require(`../file`)
const _ = require('lodash')
// const fs = require('fs')
//Simplify logging
const lg = tools.lg

const { clg } = require(`../tools`)

module.exports = {
  getFISDUpdates,
  getOnePageDetails,
  loginPupe,
}

let browser = null

async function getFISDUpdates(source, log_tab) {
  try {
    lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
    browser = await loginPupe(source, log_tab + 1)
    const data = await goToContactsDirectory(source, browser, log_tab + 1)
    await browser.close()
    lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
    return data
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    await browser.close()
    throw new Error(err)
  }
}

async function loginPupe(source, log_tab) {
  try {
    const browser = await Fpuppeteer.openBrowser(false, false, false, true, log_tab + 1)
    const page = await browser.newPage()
    await page.setViewport({ width: 1920, height: 1080 })
    await page.setDefaultNavigationTimeout(100000)
    await page.goto('https://my.siia.net/Security/Sign-In?returnurl=https%3A%2F%2Fwww.siia.net')
    await page.type('#dnn_ctr773_SignIn_ctl00_txtUsername', 'j.bloch@exchange-data.com')
    await page.type('#dnn_ctr773_SignIn_ctl00_txtPassword', 'j.bloch@exchange-data.com')
    await waitTillHTMLRendered(source, page, 60000, log_tab + 1)
    await page.click('#dnn_ctr773_SignIn_ctl00_btnSignIn')
    await page.close()
    return browser
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}

async function goToContactsDirectory(source, browser, log_tab) {
  try {
    lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
    let data = []
    const page = await browser.newPage()
    await page.setViewport({ width: 1920, height: 1080 })
    await page.setDefaultNavigationTimeout(100000)
    await page.goto('https://my.siia.net/Directories/FISD-Member-Directory')
    await waitTillHTMLRendered(source, page, 60000, log_tab + 1)
    let html = await page.content()
    data.push(await getOnePageDetails(source, html, 1, log_tab + 1))
    data = [].concat.apply([], data)
    await file.writeToFile(`downloads/page0.html`, html)
    await pleaseWait(2, 2, log_tab + 1, source)
    lg(`Waiting for selector #dnn_ctr1657_Find_ctl00_ListPager_lnkNext`, log_tab + 1, 'info', source)
    await page.waitForSelector('#dnn_ctr1657_Find_ctl00_ListPager_lnkNext')
    let pageId = 2
    let nextButton = (await page.$('#dnn_ctr1657_Find_ctl00_ListPager_lnkNext')) || false
    let previousList = []
    while (nextButton && pageId < gfinalConfig[source].maximum_pages) {
      await page.evaluate(() => {
        // this code works fine.
        console.log('scrolling', document.body.scrollHeight)
        window.scrollTo(0, document.body.scrollHeight)
        return true
      })
      lg(`Extracting from pageId ${pageId}`, log_tab + 2, 'info', source)
      await pleaseWait(3, 3, log_tab + 1, source)
      lg(`Clicking`, log_tab + 2, 'info', source)
      await page.click('#dnn_ctr1657_Find_ctl00_ListPager_lnkNext')
      lg(`Waiting for selector #dnn_ctr1657_Find_ctl00_ListPager_lnkNext`, log_tab + 2, 'info', source)
      await page.waitForSelector('#dnn_ctr1657_Find_ctl00_ListPager_lnkNext')
      await waitTillHTMLRendered(source, page, 60000, log_tab + 2)
      html = await page.content()
      let currentPageList = await getOnePageDetails(source, html, pageId, log_tab + 2)
      if (_.isEqual(previousList, currentPageList)) {
        lg(`Duplicate Data, End Reached ${pageId}`, log_tab + 2, 'info', source)
        await page.close()
        return data
      }
      previousList = currentPageList
      data.push(currentPageList)
      data = [].concat.apply([], data)
      lg(`Saving pageId ${pageId}`, log_tab + 2, 'info', source)
      await file.writeToFile(`downloads/page${pageId}.html`, html)
      nextButton = (await page.$('#dnn_ctr1657_Find_ctl00_ListPager_lnkNext')) || false
      pageId++
    }
    await page.close()
    lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
    return data
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}

async function getOnePageDetails(source, html, pageId, log_tab) {
  try {
    let aTags = await scraping.getMultiTags(
      '#dnn_ctr1657_Find_ctl00_lstRecords_pnlItems > a',
      html,
      'object',
      log_tab + 1,
      source,
      999
    )
    if (!aTags.found) {
      lg(`Could not find aTags`, log_tab + 1, 'warn', source)
    }
    lg(`Extracted [${aTags.contents.length}] ptags`, log_tab + 1, 'info', source)

    let $ = aTags.$
    const contactsBasic = aTags.contents.map(a => {
      return {
        pageId: pageId,
        name: $($(a).find('strong').get()[0]).text().trim(),
        job: $($(a).find('p').get()[0]).text().trim(),
      }
    })

    let pTags = await scraping.getMultiTags(
      '#dnn_ctr1657_Find_ctl00_lstRecords_pnlItems > div > div:nth-child(1) > div:nth-child(1)',
      //#\{2F6F4A42-65F3-E411-A723-C81F66BEE662\} > div:nth-child(1) > div:nth-child(1)
      html,
      'text',
      log_tab + 1,
      source,
      999
    )
    if (!pTags.found) {
      lg(`Could not find pTags`, log_tab + 1, 'warn', source)
    }
    lg(`Extracted [${pTags.contents.length}] ptags`, log_tab + 1, 'info', source)
    $ = pTags.$
    const contactsDetails = pTags.contents
      .map(p => {
        const detailsString = p.replace(/(^\t\n|^\t|^\n)/gm, '')
        const detailsArray = detailsString.split('\n')
        const detailsObjects = detailsArray
          .map(detailString => {
            const keyValueArray = detailString.split(': ')
            if (keyValueArray[0].length === 0) return null
            return {
              [keyValueArray[0].trim()]: keyValueArray[1],
            }
          })
          .filter(elm => elm !== null)
        return detailsObjects
      })
      .filter(elm => elm.length !== 0)
    if (contactsBasic.length !== contactsDetails.length) {
      lg(
        `contactsBasic[${contactsBasic.length}] Not equal contactsDetails[${contactsDetails.length}]`,
        log_tab + 1,
        'warn',
        source
      )
      return []
    }
    contactsBasic.forEach((contact, index) => {
      contactsDetails[index].forEach(singleDetails => {
        Object.assign(contactsBasic[index], singleDetails)
      })
    })
    return contactsBasic
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}

async function waitTillHTMLRendered(source, page, timeout = 30000, log_tab) {
  try {
    const checkDurationMsecs = 1000
    const maxChecks = timeout / checkDurationMsecs
    let lastHTMLSize = 0
    let checkCounts = 1
    let countStableSizeIterations = 0
    const minStableSizeIterations = 3

    while (checkCounts++ <= maxChecks) {
      let html = await page.content()
      let currentHTMLSize = html.length
      // let bodyHTMLSize = await page.evaluate(() => document.body.innerHTML.length)
      // console.log('last: ', lastHTMLSize, ' <> curr: ', currentHTMLSize, ' body html size: ')
      if (lastHTMLSize != 0 && currentHTMLSize == lastHTMLSize) countStableSizeIterations++
      else countStableSizeIterations = 0 //reset the counter

      if (countStableSizeIterations >= minStableSizeIterations) {
        lg(`waitTillHTMLRendered: Page rendered fully..`, log_tab + 1, 'info', source)
        break
      }
      lastHTMLSize = currentHTMLSize
      await page.waitFor(checkDurationMsecs)
    }
    return
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}

// async function login(source, log_tab) {
//   try {
//     const form = new FormData()
//     form.append('dnn$ctr773$SignIn$ctl00$txtUsername', 'j.bloch@exchange-data.com')
//     form.append('dnn$ctr773$SignIn$ctl00$txtPassword', 'j.bloch@exchange-data.com')

//     const res = await Faxios.down({
//       source: source,
//       url: 'https://my.siia.net/Security/Sign-In',
//       method: 'POST',
//       headers: {
//         'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Firefox/91.0',
//         Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
//         'Accept-Language': 'en-US,en;q=0.5',
//         'Content-Type': 'multipart/form-data',
//         // 'Upgrade-Insecure-Requests': '1',
//         // 'Sec-Fetch-Dest': 'document',
//         // 'Sec-Fetch-Mode': 'navigate',
//         // 'Sec-Fetch-Site': 'same-origin',
//         // 'Sec-Fetch-User': '?1',
//       },
//       body: form,
//       savetofile: true,
//     })
//     clg(res.headers)
//     clg(res.request._header)
//   } catch (err) {
//     tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
//     throw new Error(err)
//   }
// }
