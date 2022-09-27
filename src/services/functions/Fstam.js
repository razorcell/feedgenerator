const cheerio = require('cheerio')
const tor = require(`../tor`)
const tools = require(`../tools`)
const fileModule = require(`../file`)
const scraping = require(`../scraping`)
const moment = require('moment')
const file = require('../file')

//Simplify logging
const lg = tools.lg

// const { clg, typeOf } = require(`../tools`);

module.exports = {
  getStamSecuritiesForCountry,
  getStamUpdates,
}

var Stamdata_headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:78.0) Gecko/20100101 Firefox/78.0',
  Accept: `text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8`,
  'Accept-Language': 'en-US,en;q=0.5',
  //   "Content-Type": "application/json",
  //   Origin: "https://www.londonstockexchange.com",
  // Connection: "close",
  // Referer: "https://www.investegate.co.uk/Archive.aspx",
  // Cookie: "__cfduid=d67cff1cd6516bcc85ad92efe4bba93621597931753; Inv_DisplayControl=1,2,3,4; IGUserSession=f165993f-46a1-4162-8db1-7b5ecabf7d97; ai_user=IfoMu|2020-08-20T14:54:08.591Z; utype=PI; uflag=yes; ai_session=SR7Bc|1597935249407|1597935249407; _ga=GA1.3.2130213174.1597935251; _gid=GA1.3.1196724521.1597935251; _gat_UA-10589217-1=1; __hstc=51450998.3e686c8455ae49b8af556db72fbd02c1.1597935251897.1597935251897.1597935251897.1; hubspotutk=3e686c8455ae49b8af556db72fbd02c1; __hssrc=1; __hssc=51450998.2.1597935251897; sc_is_visitor_unique=rx11968045.1597935278.9EBD5E42CEA64F623338DA004E3C699E.1.1.1.1.1.1.1.1.1",
  //   Referer:
  //     "https://www.londonstockexchange.com/news?tab=news-explorer&headlinetypes=&excludeheadlines=&period=custom&beforedate=20200721&afterdate=20200719&headlines=,16,75,79",
}

function getStamUpdates(country) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        lg(`START - getStamUpdates [${country}]`, 1)
        let data = await getStamSecuritiesForCountry(country, 1)
        //Generate Global file
        lg(`END - getStamUpdates`, 1)
        resolve(data)
        return
      } catch (err) {
        tools.catchError(err, `getStamUpdates [${country}]`, undefined, undefined, 3)
        reject(`getStamUpdates : ${err.message}`)
      }
    })()
  })
}

function getStamSecuritiesForCountry(country, log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        lg(`Extracting Stamdata for [${country}]`, log_tab + 1)
        let url = `http://www.stamdata.com/Public.mvc/Issues?market=${country}`
        let page = await tor.downloadUrlUsingTor(
          'stamdata',
          url,
          Stamdata_headers,
          'GET',
          undefined,
          false,
          true,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          log_tab + 2,
          false,
          true
        )
        const $ = cheerio.load(page.body)
        let Trs = await scraping.getTrsFromPage(
          page.body,
          `body > main > article > table > tbody > tr`,
          stamDanish_tds_model,
          undefined,
          undefined,
          log_tab + 1
        )
        let correct_format = await file.getValidDateFormat(Trs, `issue`, log_tab + 1)
        Trs = Trs.map(row => {
          //Standardize the date format
          row.issue = moment(row.issue, correct_format).format('YYYYMMDD')
          row.maturity = moment(row.maturity, correct_format).format('YYYYMMDD')
          if (
            !moment(row.issue, 'YYYYMMDD', true).isValid() ||
            !moment(row.maturity, 'YYYYMMDD', true).isValid()
          ) {
            return null
          } else {
            return row
          }
        }).filter(row => row != null)
        resolve(Trs)
        return
      } catch (err) {
        tools.catchError(err, 'getSecuritiesForCountry', true, 'general', log_tab + 4)
        reject(`getSecuritiesForCountry : ${err.message}`)
      }
    })()
  })
}

let stamDanish_tds_model = [
  {
    id: 0,
    name: 'isin',
  },
  {
    id: 1,
    name: 'ticker',
  },
  {
    id: 2,
    name: 'name',
  },
  {
    id: 4,
    name: 'type',
  },
  {
    id: 5,
    name: 'issue',
  },
  {
    id: 6,
    name: 'maturity',
  },
]
