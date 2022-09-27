const tools = require(`../tools`)
const Ffetch = require(`../Ffetch`)
const scraping = require(`../scraping`)
const moment = require('moment')

//Simplify logging
const lg = tools.lg

const { clg } = require(`../tools`)

module.exports = {
  getSloveniaUpdates,
  getAllSecuritiesDetails,
  getAllSecurities,
  getOneSecurityDetails,
}

function getSloveniaUpdates(source, log_tab) {
  return new Promise(function getSloveniaUpdates(resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        let all_data = []
        all_data = await getAllSecurities(source, log_tab + 1)
        all_data = await getAllSecuritiesDetails(source, all_data, log_tab + 1)
        lg(`Extracted ${all_data.length} sec from slovenia ljse.si`, log_tab + 1, 'info', source)
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
        security.url = `https://ljse.si/en/papir-311/310?isin=${security.isin}&tab=stock_publisher`
        let page = await Ffetch.down(
          {
            source,
            url: security.url,
            id: security.isin,
          },
          log_tab + 1
        )
        security.url = `<a href="${security.url}" target="_blank">Source</a>`
        let res = await scraping.getOneTag(`.issuer-full-name`, page, `text`, log_tab + 1, source)
        if (!res.found) {
          lg(`Could not find [IssuerName] tag`, log_tab + 2, 'warn', source)
          security.issuername = ''
          resolve(security)
          return
        }
        security.issuername = res.content
        delete security.model
        delete security.sector_id
        security = Object.assign(
          {},
          {
            isin: '',
            symbol: '',
            issuername: '',
            name: '',
            listed_quantity: '',
            segment_listing_date: '',
            segment_delisting_date: '',
            nominal_value: '',
            nominal_currency_id: '',
            segment: '',
            security_class: '',
            security_type: '',
            url: '',
          },
          security
        )
        resolve(security)
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
        let json_obj = await Ffetch.down(
          {
            source,
            url: `https://rest.ljse.si/web/Bvt9fe2peQ7pwpyYqODM/securities/XLJU/json?status=LISTED_SECURITIES&model=ALL&type=EQTY`,
            id: `sloveniaAllSec`,
            json: true,
          },
          log_tab + 1
        )

        resolve(json_obj.securities)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}
