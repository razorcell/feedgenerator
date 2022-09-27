const cheerio = require('cheerio')
const Faxios = require('../Faxios')
const { lg, arrayToChunks, catchError, pleaseWait } = require(`../tools`)

module.exports = {
  getItalyEtfUpdates,
  getOneETFDetails,
  getItalyEtfs,
  getItalyEtfsInPage,
}

async function getItalyEtfUpdates(source, logTab) {
  try {
    lg(`START - getItalyEtfUpdates`, logTab, 'info', source)
    const etfList = await getItalyEtfs(source, logTab)
    lg(`Extracted  ${etfList.length} ETFs`, logTab + 1, 'info', source)
    const masterData = await getAllETFDetails(source, etfList, logTab + 1)
    return masterData
  } catch (err) {
    catchError(err, 'getItalyEtfUpdates', undefined, undefined, logTab, source)
    throw new Error(err)
  }
}

async function getAllETFDetails(source, etfList, logTab) {
  try {
    lg(`START - getAllETFDetails`, logTab, 'info', source)
    let chunks = arrayToChunks(etfList, gfinalConfig[source].chunck_size, logTab + 1, source)
    let all_details = []
    for (let i = 0; i < chunks.length; i++) {
      if (i >= gfinalConfig[source].chunks_limit) {
        lg(`Chunk limit [ ${gfinalConfig[source].chunks_limit} ] reached !`, logTab + 1, 'info', source)
        all_details = all_details.filter(row => row != null)
        return all_details
      }
      lg(``, logTab + 1, 'info', source)
      lg(`Process chunk = ${i} | remaining = ${chunks.length - (i + 1)}`, logTab + 1, 'info', source)
      all_details = all_details.concat(
        await Promise.all(
          chunks[i].map(async ({ label, url }) => {
            return await getOneETFDetails(source, label, url, logTab + 2)
          })
        )
      )
      all_details = [].concat.apply([], all_details) //flattern the array
      await pleaseWait(gfinalConfig[source].delay_min, gfinalConfig[source].delay_max, logTab, source)
    }
    // Filter Null values corresponding to Table header Trs or Invalid dates
    all_details = all_details.filter(row => row != null)
    return all_details
  } catch (err) {
    catchError(err, 'getAllETFDetails', undefined, undefined, logTab, source)
    throw new Error(err)
  }
}

// async function getItalyOneChunckDetails(source, chunk, logTab) {
//   try {
//     lg('START - getItalyOneChunckDetails', logTab, 'info', source)
//     let this_chunck_data = await Promise.all(
//       chunk.map(async security => {
//         return await getOneETFDetails(source, security.label, security.url, logTab)
//       })
//     )
//     return this_chunck_data
//   } catch (err) {
//     catchError(err, 'getItalyOneChunckDetails', undefined, undefined, logTab, source)
//     throw new Error(err)
//   }
// }

async function getOneETFDetails(source, label, url, logTab) {
  try {
    const response = await Faxios.down(
      {
        id: `getItalyEtfsInPage[${label}]`,
        source,
        url: url,
      },
      logTab + 1
    )
    const $ = cheerio.load(response.data)
    let trs_ignore_first_two = $('table.m-table > tbody > tr').get()
    let filter = new RegExp('[\\t\\n\\r\\f\\v]', 'gm')
    let isin = null
    let symbol = null
    let dividend_freq = null
    let local_dividend = null
    trs_ignore_first_two.forEach(tr => {
      let col1 = $(tr).find('td:nth-child(1) span strong').text().replace(filter, '')
      let col2 = $(tr).find('td:nth-child(2) span').text().replace(filter, '')
      if (col1 === 'Alphanumeric Code') symbol = col2
      if (col1 === 'Isin Code') isin = col2
      if (col1 === 'Dividends') dividend_freq = col2
    })
    //Get local last dividend
    let divs = $('div.h-bg--gray').get()
    divs.forEach(div => {
      let first_div_title = $(div).find('div:nth-child(1) h3').text().replace(filter, '').trim()
      if (first_div_title === 'Dividends') {
        local_dividend = $(div)
          .find('div:nth-child(2) li:nth-child(1) span')
          .text()
          .replace(filter, '')
          .trim()
      }
    })
    let details = {
      isin: isin,
      label: label,
      symbol: symbol,
      dividend_freq: dividend_freq,
      local_dividend: local_dividend,
      url: `<a href="${url}" target="_blank">Link</a>`,
    }
    return details
  } catch (err) {
    catchError(err, 'getOneETFDetails', undefined, undefined, logTab, source)
    throw new Error(err)
  }
}

async function getItalyEtfs(source, logTab) {
  try {
    lg(`START - getItalyEtfs`, logTab, 'info', source)
    let all_data = new Array()
    let end_reached = false
    let page_id = 1
    while (!end_reached) {
      lg(`Get Italy ETFs page : ${page_id}`, logTab + 1, 'info', source)
      let this_page_data = await getItalyEtfsInPage(source, page_id, logTab)
      //Somehow the previous line returns an Object instead of array, so this line is necessary
      lg(`[${this_page_data.length}] ETFs in this page`, logTab + 1, 'info', source)
      if (this_page_data.length < 1 || page_id > gfinalConfig[source].maximum_pages) {
        end_reached = true
        lg(`END REACHED`, logTab + 1, 'info', source)
        lg(`Total rows extracted=${all_data.length}`, logTab + 1, 'info', source)
        return all_data
      } else {
        all_data = all_data.concat(this_page_data)
        page_id++
      }
      await pleaseWait(gfinalConfig[source].delay_min, gfinalConfig[source].delay_max, logTab, source)
    }
  } catch (err) {
    catchError(err, 'getItalyEtfs', undefined, undefined, logTab, source)
    throw new Error(err)
  }
}

async function getItalyEtfsInPage(source, page_id, logTab) {
  try {
    let URI = `https://www.borsaitaliana.it/borsa/etf/search.html?comparto=ETF&idBenchmarkStyle=&idBenchmark=&indexBenchmark=&sectorization=&lang=en&page=${page_id}`
    const response = await Faxios.down(
      {
        id: `getItalyEtfsInPage[${page_id}]`,
        source,
        url: URI,
      },
      logTab + 1
    )
    const $ = cheerio.load(response.data)
    let trs_ignore_first_two = $('table.m-table > tbody > tr').get().slice(2)
    let filter = new RegExp('[\\t\\n\\r\\f\\v]', 'gm')
    let label_href_array = $(trs_ignore_first_two).map((i, tr) => {
      let label = $(tr).find('td:nth-child(1) a').attr('title').replace(filter, '')
      let href = $(tr).find('td:nth-child(1) a').attr('href')
      return {
        label: label.trim(),
        url: 'https://www.borsaitaliana.it' + href,
      }
    })
    return label_href_array.get()
  } catch (err) {
    catchError(err, 'getItalyEtfsInPage', undefined, undefined, logTab, source)
    throw new Error(err)
  }
}
