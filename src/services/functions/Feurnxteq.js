const cheerio = require('cheerio')
const Ffetch = require(`../Ffetch`)
const Faxios = require(`../Faxios`)
const scraping = require(`../scraping`)
const moment = require('moment')
const file = require(`../file`)
const { lg, gFName, catchError, pleaseWait, arrayToChunks } = require(`../tools`)

var euronext_headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:98.0) Gecko/20100101 Firefox/98.0',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
}

module.exports = {
  getEuronextEquitiesUpdates,
  getEuronextEquitiesSecurities,
  getEuronextEquitiesOneSecurityDetails,
  getEuronextEquitiesListInPage,
}

function getEuronextEquitiesUpdates(source, log_tab) {
  return new Promise(function getEuronextEquitiesUpdates(resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${gFName(new Error())}`, log_tab, 'info', source)
        let securities_list = await getEuronextEquitiesSecurities(source, log_tab) // returns Array
        lg(`Extracted  ${securities_list.length} Securities`, log_tab + 1, 'info', source)
        let master_data = await getAllSecuritiesDetails(source, securities_list, log_tab + 1)
        let valid_date_format = await file.getValidDateFormat(master_data, 'ipo_date', log_tab + 1, source)
        master_data = master_data.map(security => {
          security.ipo_date = moment(security.ipo_date, valid_date_format, true).format(`DD/MM/YYYY`)
          if (!moment(security.ipo_date, 'DD/MM/YYYY', true).isValid()) {
            security.ipo_date = 'Invalid date'
          }
          return security
        })
        lg(`END - ${gFName(new Error())}`, log_tab, 'info', source)
        resolve(master_data)
        return
      } catch (err) {
        catchError(err, gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getEuronextEquitiesSecurities(source, log_tab) {
  return new Promise(function getEuronextEquitiesSecurities(resolve, reject) {
    ;(async () => {
      try {
        let all_data = new Array()
        let end_reached = false
        let page_id = 0
        while (!end_reached) {
          lg(`Get Euronext Equities page : ${page_id}`, log_tab + 1, 'info', source)
          let this_page_data = await getEuronextEquitiesListInPage(source, page_id, log_tab + 1)
          all_data = all_data.concat(this_page_data)
          lg(`[${this_page_data.length}] Securities in this page`, log_tab + 1, 'info', source)
          page_id++
          if (this_page_data.length < 1 || page_id >= gfinalConfig[source].maximum_pages) {
            end_reached = true
            lg(`END REACHED`, log_tab + 1, 'info', source)
            break
          }
          await pleaseWait(
            gfinalConfig[source].delay_min,
            gfinalConfig[source].delay_max,
            log_tab + 2,
            source
          )
        }

        let all_data_obj_version = []

        all_data.forEach(security => {
          let new_security = {}
          const $ = cheerio.load(security[0])
          new_security.label = $('a').text().trim()
          new_security.url = 'https://live.euronext.com' + $('a').attr('href')
          new_security.org_link = security[0]
          new_security.isin = security[1]
          new_security.symbol = security[2]
          let regex = new RegExp('(?:-)(.*?)(?:/)')
          new_security.market_symbol = security[0].match(regex)[1]
          new_security.market = security[3]
          all_data_obj_version.push(new_security)
        })
        resolve(all_data_obj_version)
      } catch (err) {
        catchError(err, gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}
function getEuronextEquitiesListInPage(source, pageId, log_tab) {
  return new Promise(function getEuronextEquitiesListInPage(resolve, reject) {
    ;(async () => {
      try {
        let size = gfinalConfig.EurNxtEq.listExtractSize
        pageId = pageId * size
        let URI = `https://live.euronext.com/en/pd/data/stocks?mics=ALXB%2CALXL%2CALXP%2CXPAR%2CXAMS%2CXBRU%2CXLIS%2CXMLI%2CMLXB%2CENXB%2CENXL%2CTNLA%2CTNLB%2CXLDN%2CXESM%2CXMSM%2CXATL%2CVPXB%2CXOSL%2CXOAS%2CMERK&display_datapoints=dp_stocks&display_filters=df_stocks`
        var dataString = `draw=3&columns%5B0%5D%5Bdata%5D=0&columns%5B0%5D%5Bname%5D=&columns%5B0%5D%5Bsearchable%5D=true&columns%5B0%5D%5Borderable%5D=true&columns%5B0%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B0%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B1%5D%5Bdata%5D=1&columns%5B1%5D%5Bname%5D=&columns%5B1%5D%5Bsearchable%5D=true&columns%5B1%5D%5Borderable%5D=false&columns%5B1%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B1%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B2%5D%5Bdata%5D=2&columns%5B2%5D%5Bname%5D=&columns%5B2%5D%5Bsearchable%5D=true&columns%5B2%5D%5Borderable%5D=false&columns%5B2%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B2%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B3%5D%5Bdata%5D=3&columns%5B3%5D%5Bname%5D=&columns%5B3%5D%5Bsearchable%5D=true&columns%5B3%5D%5Borderable%5D=false&columns%5B3%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B3%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B4%5D%5Bdata%5D=4&columns%5B4%5D%5Bname%5D=&columns%5B4%5D%5Bsearchable%5D=true&columns%5B4%5D%5Borderable%5D=false&columns%5B4%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B4%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B5%5D%5Bdata%5D=5&columns%5B5%5D%5Bname%5D=&columns%5B5%5D%5Bsearchable%5D=true&columns%5B5%5D%5Borderable%5D=false&columns%5B5%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B5%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B6%5D%5Bdata%5D=6&columns%5B6%5D%5Bname%5D=&columns%5B6%5D%5Bsearchable%5D=true&columns%5B6%5D%5Borderable%5D=false&columns%5B6%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B6%5D%5Bsearch%5D%5Bregex%5D=false&order%5B0%5D%5Bcolumn%5D=0&order%5B0%5D%5Bdir%5D=asc&start=20&length=20&search%5Bvalue%5D=&search%5Bregex%5D=false&args%5BinitialLetter%5D=&iDisplayLength=${size}&iDisplayStart=${pageId}&sSortDir_0=asc`
        var response = await Faxios.down(
          {
            id: 'getEuronextEquitiesListInPage',
            source,
            url: URI,
            headers: euronext_headers,
            method: 'POST',
            data: dataString,
            responseType: 'json',
          },
          log_tab + 1
        )

        resolve(response.data.aaData)
      } catch (err) {
        catchError(err, gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getAllSecuritiesDetails(source, all_shares, log_tab) {
  return new Promise(function getAllSecuritiesDetails(resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${gFName(new Error())}`, log_tab, 'info', source)
        let chunks = arrayToChunks(all_shares, gfinalConfig[source].chunck_size, log_tab + 1, source)
        let all_data = []
        for (let i = 0; i < chunks.length; i++) {
          if (i >= gfinalConfig[source].chunks_limit) {
            lg(
              `${gFName(new Error())} : Chunk limit [ ${gfinalConfig[source].chunks_limit} ] reached !`,
              log_tab + 1,
              'info',
              source
            )
            lg(`END - ${gFName(new Error())}`, log_tab + 1, 'info', source)
            all_data = [].concat.apply([], all_data) //flattern array
            resolve(all_data)
            return
          }
          await pleaseWait(
            gfinalConfig[source].delay_min,
            gfinalConfig[source].delay_max,
            log_tab + 2,
            source
          )
          lg(``, log_tab + 1, 'info', source)
          lg(
            `${gFName(new Error())} : Process chunk = ${i} | remaining = ${chunks.length - (i + 1)}`,
            log_tab + 2,
            'info',
            source
          )
          all_data = all_data.concat(await getEuronextChunkSecuritiesDetails(source, chunks[i], log_tab + 3))
        }
        all_data = [].concat.apply([], all_data) //flattern array
        lg(`END - ${gFName(new Error())}`, log_tab, 'info', source)
        resolve(all_data)
        return
      } catch (err) {
        catchError(err, gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}
function getEuronextChunkSecuritiesDetails(source, chunk, log_tab) {
  return new Promise(function getEuronextChunkSecuritiesDetails(resolve, reject) {
    ;(async () => {
      try {
        let this_chunck_data = await Promise.all(
          chunk.map(async security => {
            let one_security_details = await getEuronextEquitiesOneSecurityDetails(
              source,
              security.isin,
              security.market_symbol,
              log_tab + 1
            )
            return {
              isin: security.isin,
              issuer: one_security_details.issuer_name,
              label: security.label,
              symbol: security.symbol,
              nominal_value: one_security_details.nominal_value,
              freefloat: one_security_details.freefloat,
              ipo_date: one_security_details.ipo_date,
              yearend: one_security_details.yearend,
              shares_outstanding: one_security_details.shares_outstanding,
              market: one_security_details.market_name,
              market_symbol: security.market_symbol,
              instrument_type: one_security_details.instrument_type,
              currency: one_security_details.currency,
              url: `<a href="${security.url}" target="_blank">Link</a>`,
            }
          })
        )
        resolve(this_chunck_data)
        return
      } catch (err) {
        catchError(err, gFName(new Error()), undefined, undefined, log_tab)
        reject(`${gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

/**
 * It takes a URL, downloads the HTML, parses it, and returns an object with two properties.
 * @param source - 'euronext'
 * @param isin - "FR0013176526"
 * @param market_symbol - "XPAR"
 * @param log_tab - 0
 * @returns An object with two properties: instrument_type and market_name.
 */
async function getTypeAndMarket(source, isin, market_symbol, log_tab) {
  let html = await Ffetch.down(
    {
      id: isin,
      source: source,
      url: `https://live.euronext.com/ajax/getFactsheetInfoBlock/STOCK/${isin}-${market_symbol}/fs_info_block`,
      headers: euronext_headers,
      savetofile: true,
    },
    log_tab + 1
  )
  const trs = await scraping.getTrsFromPage(
    html,
    'tbody tr',
    [
      { id: 0, name: 'label' },
      { id: 1, name: 'value' },
    ],
    undefined,
    'text',
    log_tab + 1,
    true,
    source
  )
  const type =
    trs.filter(row => row.label === 'Type').length === 1
      ? trs.filter(row => row.label === 'Type')[0].value
      : ''
  const sub_type =
    trs.filter(row => row.label === 'Sub type').length === 1
      ? trs.filter(row => row.label === 'Sub type')[0].value
      : ''
  const market_name =
    trs.filter(row => row.label === 'Market').length === 1
      ? trs.filter(row => row.label === 'Market')[0].value
      : ''
  const instrument_type = `${type} (${sub_type})`

  return { instrument_type, market_name }
}

/**
 * It gets the outstanding shares, nominal value and currency from the Euronext website
 * @param source - 'euronext'
 * @param isin - 'NL0000388619'
 * @param market_symbol - "XPAR"
 * @param log_tab - 0
 * @returns An object with three properties: shares_outstanding, nominal_value, and currency.
 */
async function getOutstandingNominalCurrency(source, isin, market_symbol, log_tab) {
  const html = await Ffetch.down(
    {
      id: isin,
      source: source,
      url: `https://live.euronext.com/ajax/getFactsheetInfoBlock/STOCK/${isin}-${market_symbol}/fs_tradinginfo_block`,
      headers: euronext_headers,
      savetofile: false,
    },
    log_tab + 1
  )
  const trs = await scraping.getTrsFromPage(
    html,
    'tbody tr',
    [
      { id: 0, name: 'label' },
      { id: 1, name: 'value' },
    ],
    undefined,
    'text',
    log_tab + 1,
    true,
    source
  )
  let shares_outstanding =
    trs.filter(row => row.label === 'Admitted shares').length === 1
      ? trs.filter(row => row.label === 'Admitted shares')[0].value.replace(/,/g, '')
      : ''
  let nominal_value =
    trs.filter(row => row.label === 'Nominal value').length === 1
      ? trs.filter(row => row.label === 'Nominal value')[0].value
      : ''
  let currency =
    trs.filter(row => row.label === 'Trading currency').length === 1
      ? trs.filter(row => row.label === 'Trading currency')[0].value
      : ''
  return { shares_outstanding, nominal_value, currency }
}

/**
 * It gets the IPO date of a stock from Euronext
 * @param source - 'euronext'
 * @param isin - 'FR0013176526'
 * @param market_symbol - 'XPAR'
 * @param log_tab - the number of tabs to add to the console log
 * @returns An array of objects.
 */
async function getIPODate(source, isin, market_symbol, log_tab) {
  const response = await Ffetch.down(
    {
      id: isin,
      source: source,
      url: `https://live.euronext.com/ajax/getFactsheetInfoBlock/STOCK/${isin}-${market_symbol}/fs_tradingcharacteristics_block`,
      headers: euronext_headers,
      savetofile: false,
    },
    log_tab + 1
  )
  const trs = await scraping.getTrsFromPage(
    response,
    'tbody tr',
    [
      { id: 0, name: 'label' },
      { id: 1, name: 'value' },
    ],
    undefined,
    'text',
    log_tab + 1,
    true,
    source
  )
  const ipo_date =
    trs.filter(row => row.label === 'First listing').length === 1
      ? trs.filter(row => row.label === 'First listing')[0].value
      : ''
  return ipo_date
}

/**
 * It takes a URL, makes a POST request to it, and then scrapes the response for a specific tag
 * @param source - 'euronext'
 * @param isin - 'FR0013176526'
 * @param market_symbol - 'XAMS'
 * @param log_tab - the number of tabs to add to the log message
 * @returns a Promise.
 */
async function getIssuerName(source, isin, market_symbol, log_tab) {
  const response = await Ffetch.down(
    {
      id: isin,
      source: source,
      url: `https://live.euronext.com/en/cofisem-public-address/${isin}-${market_symbol}`,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:82.0) Gecko/20100101 Firefox/82.0',
        Accept: '*/*',
        'Accept-Language': 'en-US,en;q=0.5',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Cache-Control': 'no-cache',
      },
      savetofile: false,
    },
    log_tab + 1
  )
  let result = await scraping.getOneTag('.font-weight-medium', response, 'text', log_tab + 1, source)
  let issuer_name = result.found ? result.content : null
  return issuer_name
}

/**
 * It takes a HTML string, parses it, and returns a string
 * @param source - the url of the page
 * @param html - the html of the page
 * @param log_tab - the number of tabs to add to the log message
 * @returns the value of the variable yearend.
 */
async function getFinancialYearEndDate(source, html, log_tab) {
  const trs = await scraping.getTrsFromPage(
    html,
    '#key-figures-table-en tr',
    [
      { id: 0, name: 'label' },
      { id: 1, name: 'value' },
    ],
    undefined,
    'text',
    log_tab + 1,
    true,
    source
  )
  let ths = await scraping.getTagsFromPage(
    {
      body: html,
      target_block: '#key-figures-table-en thead',
      target_tags: 'th',
    },
    log_tab + 1,
    source
  )

  let yearend_year = ths[1] ? ths[1] : ''
  let yearend_month =
    trs.filter(row => row.label === 'Fiscal year end').length === 1
      ? /**
         * It takes a URL, scrapes the page, and returns the free float figure
         * @param source - the URL of the page
         * @param html - the html of the page
         * @param log_tab - the number of tabs to add to the log message
         * @returns An array of objects.
         */
        trs.filter(row => row.label === 'Fiscal year end')[0].value.replace(/\.\d+/g, '')
      : ''
  yearend_month = yearend_month !== '' ? moment(yearend_month, 'M', true).format('MMMM') : ''
  let yearend = yearend_year !== '' ? `${yearend_month} ${yearend_year}` : ''
  return yearend
}

/**
 * It takes a URL, scrapes the HTML from that URL, and returns the value of the "Free float" row in the
 * table on that page
 * @param source - the URL of the page
 * @param html - the html of the page
 * @param log_tab - the number of tabs to add to the log message
 * @returns An array of objects.
 */
async function getFreeFloatFigure(source, html, log_tab) {
  const trs = await scraping.getTrsFromPage(
    html,
    '#shareholders-table-values-nodrag tbody tr',
    [
      { id: 0, name: 'label' },
      { id: 1, name: 'value' },
    ],
    undefined,
    'text',
    log_tab + 1,
    true,
    source
  )
  let freefloat =
    trs.filter(row => row.label === 'Free float').length === 1
      ? trs.filter(row => row.label === 'Free float')[0].value
      : ''
  return freefloat
}

/**
 * It gets the details of one security from the Euronext website
 * @param source - 'Euronext'
 * @param isin - 'FR0000120172'
 * @param market_symbol - 'AALB'
 * @param log_tab - number of tabs to indent the log
 * @returns An object with the following properties:
 * issuer_name: issuer_name,
 * shares_outstanding: shares_outstanding,
 * instrument_type: instrument_type,
 * nominal_value: nominal_value,
 * freefloat: freefloat,
 * ipo_date: ipo_date,
 * yearend: yearend,
 * market_name
 */
async function getEuronextEquitiesOneSecurityDetails(source, isin, market_symbol, log_tab) {
  try {
    lg(`isin= ${isin} | market_symbol= ${market_symbol}`, log_tab + 1, 'info', source)
    await pleaseWait(0.2, 0.3, log_tab + 1, source)
    const { instrument_type, market_name } = await getTypeAndMarket(source, isin, market_symbol, log_tab + 1)
    await pleaseWait(0.2, 0.3, log_tab + 1, source)
    const { shares_outstanding, nominal_value, currency } = await getOutstandingNominalCurrency(
      source,
      isin,
      market_symbol,
      log_tab + 1
    )
    await pleaseWait(0.2, 0.3, log_tab + 1, source)
    const ipo_date = await getIPODate(source, isin, market_symbol, log_tab + 1)
    await pleaseWait(0.2, 0.3, log_tab + 1, source)
    const issuer_name = await getIssuerName(source, isin, market_symbol, log_tab + 1)
    await pleaseWait(0.2, 0.3, log_tab + 1, source)

    const html = await Ffetch.down(
      {
        id: isin,
        source: source,
        url: `https://live.euronext.com/cofisem-public/${isin}-${market_symbol}`,
        headers: euronext_headers,
        savetofile: false,
      },
      log_tab + 1
    )
    const yearend = await getFinancialYearEndDate(source, html, log_tab + 1)
    const freefloat = await getFreeFloatFigure(source, html, log_tab + 1)

    let url_info = `https://live.euronext.com/en/product/equities/${isin}-${market_symbol}/company-information`
    return {
      issuer_name: issuer_name,
      shares_outstanding: shares_outstanding,
      instrument_type: instrument_type,
      nominal_value: nominal_value,
      freefloat: freefloat,
      ipo_date: ipo_date,
      yearend: yearend,
      market_name: market_name,
      url_info: url_info,
      currency: currency,
    }
  } catch (err) {
    catchError(err, `/getEuronextEquitiesOneSecurityDetails`, undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}
