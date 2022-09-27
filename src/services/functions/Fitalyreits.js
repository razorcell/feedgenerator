const tools = require(`../tools`)
const Ffetch = require(`../Ffetch`)
const scraping = require(`../scraping`)
const moment = require('moment')

//Simplify logging
const lg = tools.lg

const { clg } = require(`../tools`)

module.exports = {
  getItalianReitsUpdates,
  getAllSecuritiesDetails,
  getAllSecurities,
  getOneSecurityDetails,
}

function getItalianReitsUpdates(source, log_tab) {
  return new Promise(function getItalianReitsUpdates(resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        let all_data = []
        all_data = await getAllSecurities(source, log_tab + 1)
        lg(`Extracted ${all_data.length} sec from Italian REITs`, log_tab + 1, 'info', source)
        all_data = await getAllSecuritiesDetails(source, all_data, log_tab + 1)
        lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        resolve(all_data)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getAllSecuritiesDetails(source, all_shares, log_tab) {
  return new Promise(function getAllSecuritiesDetails(resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        let chunks = tools.arrayToChunks(all_shares, gfinalConfig[source].chunck_size, log_tab + 1, source)
        let all_data = []
        for (let i = 0; i < chunks.length; i++) {
          if (i >= gfinalConfig[source].chunks_limit) {
            lg(
              `${tools.gFName(new Error())} : Chunk limit [ ${gfinalConfig[source].chunks_limit} ] reached !`,
              log_tab + 1,
              'info',
              source
            )
            lg(`END - ${tools.gFName(new Error())}`, log_tab + 1, 'info', source)
            all_data = [].concat.apply([], all_data) //flattern array
            resolve(all_data)
            return
          }
          lg(``, log_tab + 1, 'info', source)
          lg(
            `${tools.gFName(new Error())} : Process chunk = ${i} | remaining = ${chunks.length - (i + 1)}`,
            log_tab + 2,
            'info',
            source
          )
          all_data = all_data.concat(
            await Promise.all(
              chunks[i].map(async security => {
                return await getOneSecurityDetails(source, security, log_tab + 3)
              })
            )
          )
          await tools.pleaseWait(
            gfinalConfig[source].delay_min,
            gfinalConfig[source].delay_max,
            log_tab + 2,
            source
          )
        }
        all_data = [].concat.apply([], all_data) //flattern array
        lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        resolve(all_data)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getOneSecurityDetails(source, security, log_tab) {
  return new Promise(function getSecuritiesFromPage(resolve, reject) {
    ;(async () => {
      try {
        let page = await Ffetch.down(
          {
            source,
            url: security.url,
            id: security.symbol,
            // savetofile: true,
          },
          log_tab + 1
        )
        //Get reference data
        security.url = `<a href="${security.url}" target="_blank">mainURL</a>`
        let Trs = await scraping.getTrsFromPage(
          page,
          'div.-prl:nth-child(2) > table:nth-child(1) > tbody:nth-child(1) tr',
          gfinalConfig[source].target_tds,
          9999,
          'text',
          log_tab + 1,
          true,
          source
        )
        for (let data of Trs) {
          if (data.label === 'Codice Isin') security.isin = data.value
          if (data.label === 'Codice Alfanumerico') security.symbol = data.value
          if (data.label === 'Emittente') security.issuer = data.value
        }
        security = Object.assign(
          {},
          {
            isin: '',
            label: '',
            issuer: '',
            symbol: '',
            share: '',
            DpsBod: '',
            currency: '',
            exDate: '',
            payDate: '',
            notice: '',
            url: '',
          },
          security
        )
        //get news
        let dividends = await getOneSecurityDividends(source, security, log_tab + 1)
        dividends = dividends.map(div => {
          return Object.assign({}, security, div)
        })
        resolve(dividends)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getOneSecurityDividends(source, security, log_tab) {
  return new Promise(function getSecuritiesFromPage(resolve, reject) {
    ;(async () => {
      try {
        security.dividendsURL = `https://www.borsaitaliana.it/borsa/fondi/fondi-chiusi/elenco-completo-dividendi.html?isin=${security.isin}&lang=en`
        let page = await Ffetch.down(
          {
            source,
            url: security.dividendsURL,
            id: `dividends-${security.symbol}`,
            // savetofile: true,
          },
          log_tab + 1
        )
        security.dividendsURL = `<a href="${security.dividendsURL}" target="_blank">DivURL</a>`
        let dividends = await scraping.getTrsFromPage(
          page,
          '.m-table > tbody:nth-child(2) tr',
          gfinalConfig[source].targetTdsDiv,
          9999,
          'text',
          log_tab + 1,
          true,
          source
        )
        dividends = dividends.map(div => {
          div.exDate = moment(div.exDate, 'MM/DD/YY', true).isValid()
            ? moment(div.exDate, 'MM/DD/YY').format('YYYY-MM-DD')
            : div.exDate
          div.payDate = moment(div.payDate, 'MM/DD/YY', true).isValid()
            ? moment(div.payDate, 'MM/DD/YY').format('YYYY-MM-DD')
            : div.payDate
          return div
        })
        lg(`Extracted ${dividends.length} for ${security.isin}`, log_tab + 1, 'info', source)
        resolve(dividends)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getAllSecurities(source, log_tab) {
  return new Promise(function getAllSecurities(resolve, reject) {
    ;(async () => {
      try {
        let page = await Ffetch.down(
          {
            source,
            url: `https://www.borsaitaliana.it/borsa/fondi-chiusi.html`,
            id: `italyreitsAllSec`,
            // savetofile: true,
          },
          log_tab + 1
        )
        let res = await scraping.getMultiTags(
          `.m-table > tbody:nth-child(1) tr`,
          page,
          'object',
          log_tab + 1,
          source
        )
        if (!res.found) {
          lg(`Could not find [tr] tags in the page`, log_tab + 2, 'warn', source)
          resolve([])
          return
        }
        let all = res.contents
        all.splice(0, 2)
        let $ = res.$
        all = all.map(sec => {
          return {
            label: $($(sec).find('span').get()[0])
              .text()
              .replace(/[\t|\n]+/g, '')
              .trim(),
            url: `https://www.borsaitaliana.it${$($(sec).find('a').get()[0]).attr('href')}`,
          }
        })
        resolve(all)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}
