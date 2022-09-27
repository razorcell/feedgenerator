const tools = require(`../tools`)
const Ffetch = require(`../Ffetch`)
const scraping = require(`../scraping`)
const file = require(`../file`)
const moment = require('moment')
const tableify = require('tableify')

//Simplify logging
const lg = tools.lg

const { clg } = require(`../tools`)

module.exports = {
  getSaudiDividendsUpdates,
  getSecuritiesList,
  getOneSecurityDividends,
}

function getSaudiDividendsUpdates(source, log_tab) {
  return new Promise(function getSaudiDividendsUpdates(resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        let auctions = await getSecuritiesList(source, log_tab + 1)
        let all_details = await getAllDividendsDetails(source, auctions, log_tab + 1)
        lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        resolve(all_details)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

async function getSecuritiesList(source, log_tab) {
  try {
    lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
    let json_results = await Ffetch.down(
      {
        id: source,
        source: source,
        url: `https://www.saudiexchange.sa/tadawul.eportal.theme.helper/ThemeSearchUtilityServlet`,
        json: true,
        // savetofile: true,
      },
      log_tab + 1
    )
    // return json_results
    lg(`Extracted ${json_results.length} Saudi securities`, log_tab + 1, 'info', source)
    lg(`END - ${tools.gFName(new Error())}`, log_tab)
    return json_results
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}

function getAllDividendsDetails(source, securities, log_tab) {
  return new Promise(function getAllDividendsDetails(resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        let chunks = tools.arrayToChunks(securities, gfinalConfig[source].chunck_size, 2)
        let all_details = []
        for (let i = 0; i < chunks.length; i++) {
          // if (i < 12) continue;
          if (i >= gfinalConfig[source].chunks_limit) {
            lg(`Chunk limit [ ${gfinalConfig[source].chunks_limit} ] reached !`, log_tab + 1, 'info', source)
            all_details = all_details.filter(row => row != null)
            resolve(all_details)
            return
          }
          lg(``, log_tab + 1, 'info', source)
          lg(`Process chunk = ${i} | remaining = ${chunks.length - (i + 1)}`, log_tab + 1, 'info', source)
          all_details = all_details.concat(
            await Promise.all(
              chunks[i].map(async security => {
                return await getOneSecurityDividends(source, security, log_tab + 2)
              })
            )
          )
          all_details = [].concat.apply([], all_details) //flattern the array
          await tools.pleaseWait(
            gfinalConfig[source].delay_min,
            gfinalConfig[source].delay_max,
            log_tab,
            source
          )
        }
        // Filter Null values corresponding to Table header Trs or Invalid dates
        all_details = all_details.filter(row => row != null)
        lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        resolve(all_details)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getOneSecurityDividends(source, security, log_tab) {
  return new Promise(function getOneSecurityDividends(resolve, reject) {
    ;(async () => {
      try {
        let response = await Ffetch.down(
          {
            id: security.tradingNameEn,
            source: source,
            url: `https://www.saudiexchange.sa/wps/portal/tadawul/market-participants/issuers/issuers-directory/company-details/!ut/p/z1/04_Sj9CPykssy0xPLMnMz0vMAfIjo8zi_Tx8nD0MLIy83V1DjA0czVx8nYP8PI0MDAz0I4EKzBEKDEJDLYEKjJ0DA11MjQzcTfXDyzJTy_XDCSkryE4yBQA8k2I6/?companySymbol=${security.symbol}`,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:86.0) Gecko/20100101 Firefox/86.0',
              Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
              'Upgrade-Insecure-Requests': '1',
              Pragma: 'no-cache',
              'Cache-Control': 'no-cache',
            },
          },
          log_tab + 1
        )
        let dividends = await scraping.getTrsFromPage(
          response,
          `#dividendsTable tbody tr`,
          gfinalConfig[source].target_tds,
          3,
          'text',
          log_tab + 1,
          true,
          source
        )

        if (dividends.length === 0) {
          lg(`No dividends found for this securitiy ${security.tradingNameEn}`, log_tab + 1, 'info', source)
          security['AnnDate'] = 'N/A'
          security['DueDate'] = 'N/A'
          security['DistrDate'] = 'N/A'
          security['DistrWay'] = 'N/A'
          security['Amount'] = 'N/A'
          security['Amount'] = 'N/A'
          dividends.push(security)
        } else {
          dividends = dividends.map(div => {
            return Object.assign({}, security, div)
          })
        }
        resolve(dividends)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}
