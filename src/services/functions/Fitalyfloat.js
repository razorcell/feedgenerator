const cheerio = require('cheerio')
const tor = require(`../tor`)
const file = require(`../file`)
const tools = require(`../tools`)
var path = require('path')

const { clg, typeOf } = require(`../tools`)

var italy_headers = {
  Connection: 'keep-alive',
  Accept: 'text/html, */*; q=0.01',
  // 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.130 Safari/537.36',
  'Sec-Fetch-Site': 'same-origin',
  'Sec-Fetch-Mode': 'cors',
  Referer: 'https://www.borsaitaliana.it/borsa/etf.html?lang=en',
  'Accept-Encoding': 'gzip, deflate, br',
  'Accept-Language': 'en-US,en;q=0.9',
  Cookie: 'bit_observer=1579783481-0.5427794686986065',
}

module.exports = {
  getItalyFloatUpdates,
  getItalyShares,
  getItalySharesInPage,
  getItalySharesInLetter,
  getShareID,
  getShareFreeFloat,
}

function getItalyFloatUpdates() {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        let etf_list = await getItalyEtfs()
        tools.lg(`Extracted  ${etf_list.length} ETFs`)
        let chunks = tools.arrayToChunks(etf_list, gfinalConfig.italyetf.get_securities_details_chunck_size)
        let master_data = new Array()
        for (let i = 0; i < chunks.length; i++) {
          tools.lg(`Process chunk = ${i} | remaining = ${chunks.length - (i + 1)}`)
          await tools.pleaseWait(5, 10)
          master_data = master_data.concat(await getItalyOneChunckDetails(chunks[i]))
        }
        resolve(master_data)
      } catch (err) {
        tools.lg(`Italy: getItalyEtfs ${err.message}`)
        reject(`Italy: getItalyEtfs`)
      }
    })()
  })
}

// function getItalyOneChunckDetails(chunk) {
//     return new Promise(function (resolve, reject) {
//         (async () => {
//             try {
//                 let this_chunck_data = await Promise.all(
//                     chunk.map(async (security, index) => {
//                         return await getOneETFDetails(security.label, security.url);
//                     })
//                 );
//                 resolve(this_chunck_data);
//             } catch (err) {
//                 tools.catchError(err, "getItalyOneChunckDetails");
//                 reject();
//             }
//         })();
//     });
// }

// function getOneETFDetails(label, url) {
//     return new Promise(function (resolve, reject) {
//         (async () => {
//             try {
//                 var response = await tor.downloadUrlUsingTor('ItalyETF', url, italy_headers, 'GET', undefined, undefined, undefined, undefined, true);
//                 file.writeToFile(`downloads/Italy_ETF_page.html`, response.body);
//                 const $ = cheerio.load(response.body);
//                 let trs_ignore_first_two = $("table.m-table > tbody > tr").get();
//                 let filter = new RegExp("[\\t\\n\\r\\f\\v]", "gm");
//                 let isin = null;
//                 let symbol = null;
//                 let dividend_freq = null;
//                 let local_dividend = null;
//                 trs_ignore_first_two.forEach((tr) => {
//                     let col1 = $(tr).find("td:nth-child(1) span strong").text().replace(filter, "");
//                     let col2 = $(tr).find("td:nth-child(2) span").text().replace(filter, "");
//                     if (col1 === 'Alphanumeric Code') symbol = col2;
//                     if (col1 === 'Isin Code') isin = col2;
//                     if (col1 === 'Dividends') dividend_freq = col2;
//                 });
//                 //Get local last dividend
//                 let divs = $("div.h-bg--gray").get();
//                 divs.forEach((div) => {
//                     let first_div_title = $(div).find("div:nth-child(1) h3").text().replace(filter, "").trim();
//                     if (first_div_title === 'Dividends') {
//                         local_dividend = $(div).find("div:nth-child(2) li:nth-child(1) span").text().replace(filter, "").trim();
//                     }
//                 });
//                 //Get marketwatch dividend
//                 let marketwatch_details = await marketwatch.getMarketwatchOneSecurityDetails(isin, symbol, 'it', 'ETF');
//                 let details = {
//                     isin: isin,
//                     label: label,
//                     symbol: symbol,
//                     dividend_freq: dividend_freq,
//                     local_dividend: local_dividend,
//                     marketwatch_div_amount: marketwatch_details.dividend_amount,
//                     marketwatch_exdate: marketwatch_details.dividend_exdate,
//                     url: `<a href="${url}" target="_blank">Link</a>`,
//                     url_marketwatch: `<a href="https://www.marketwatch.com/investing/fund/${symbol}?countrycode=it" target="_blank">Link</a>`

//                 };
//                 // console.log(`${details.isin} - ${details.symbol} - ${details.dividend_freq} - ${details.marketwatch_div_amount} - ${details.marketwatch_exdate}`);
//                 resolve(details);
//             } catch (err) {
//                 tools.lg(`Italy: getItalyEtfs ${err.message}`);
//                 reject(`Italy: getItalyEtfs`);
//             }
//         })();
//     });
// }

function getShareFreeFloat(id) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        let URI = `https://www.borsaitaliana.it/companyprofile/htm/en/${id}-corporateGov.htm`
        var response = await tor.downloadUrlUsingTor(
          'ItalyFloat',
          URI,
          italy_headers,
          'GET',
          undefined,
          undefined,
          undefined,
          undefined,
          true
        )
        // file.writeToFile(`downloads/getShareFreeFloat${id}.html`, response.body);
        const $ = cheerio.load(response.body)
        let src = $('#companyprofileframe').attr('src')
        if (src) {
          resolve(path.parse(path.basename(src)).name) //get the share ID
        } else {
          resolve(false)
        }
        return
      } catch (err) {
        tools.lg(`getShareFreeFloat : ${err.message}`)
        reject(`getShareFreeFloat : ${err.message}`)
      }
    })()
  })
}
//GET ITALY COMPANIES - CONSOB

//GET ITALY SHARES - BORSAITALIANA
function getItalyShares() {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        let letters = [
          'a',
          'b',
          'c',
          'd',
          'e',
          'f',
          'g',
          'h',
          'i',
          'j',
          'k',
          'l',
          'm',
          'n',
          'o',
          'p',
          'q',
          'r',
          's',
          't',
          'u',
          'v',
          'w',
          'x',
          'y',
          'z',
        ]
        let chunks = tools.arrayToChunks(letters, gfinalConfig.italyfloat.getshares_chunck_size)
        let all_shares = new Array()
        for (let i = 0; i < chunks.length; i++) {
          if (i >= gfinalConfig.italyfloat.getshares_chunks_limit) {
            tools.lg(`Chunk limit [ ${gfinalConfig.italyfloat.getshares_chunks_limit} ] reached !`)
            resolve(all_shares.flat())
            return
          }
          tools.lg(``)
          tools.lg(`Process chunk = ${i} | remaining = ${chunks.length - (i + 1)} | ${chunks[i].toString()}`)
          all_shares = all_shares.concat(
            await Promise.all(
              chunks[i].map(async (letter, index) => {
                return await getItalySharesInLetter(letter)
              })
            )
          )
          await tools.pleaseWait(5, 10)
        }
        resolve(all_shares.flat())
      } catch (err) {
        tools.lg(`Italy: getItalyEtfs ${err.message}`)
        reject(`Italy: getItalyEtfs`)
      }
    })()
  })
}

function getItalySharesInLetter(letter) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        let all_data = new Array()
        let end_reached = false
        let page_id = 1
        while (!end_reached) {
          if (page_id > gfinalConfig.italyfloat.getshares_pages_per_letter_limit) {
            tools.lg(
              `Max pages per letter limit [ ${gfinalConfig.italyfloat.getshares_pages_per_letter_limit} ] reached ! `
            )
            resolve(all_data)
            return
          }
          tools.lg(`Get Italy Shares Letter ${letter} page : ${page_id}`)
          let this_page_data = await getItalySharesInPage(letter, page_id)
          //Somehow the previous line returns an Object instead of array, so this line is necessary
          tools.lg(`[${this_page_data.length}] Shares in this page`)
          if (this_page_data.length < 1) {
            resolve(all_data)
            return
          }
          // console.log(`elem  = ${this_page_data[0].label}`);
          // console.log(`All table = `);
          // console.log(all_data);

          if (all_data.filter(company => company.label === this_page_data[0].label).length > 0) {
            end_reached = true
            tools.lg(`END REACHED`)
            // clg(all_data);
            tools.lg(`Total Shares extracted=${all_data.length}`)
            // clg(all_data);
            resolve(all_data)
          } else {
            // clg("this_page_data=");
            // clg(this_page_data);
            all_data = all_data.concat(this_page_data)
            // tools.lg(`temp total=${all_data.length}`);
            page_id++
          }
        }
      } catch (err) {
        tools.lg(`getItalySharesInLetter : ${err.message}`)
        reject(`getItalySharesInLetter : ${err.message}`)
      }
    })()
  })
}

function getItalySharesInPage(letter, page_id) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        let URI = `https://www.borsaitaliana.it/borsa/azioni/listino-a-z.html?initial=${letter}&lang=en&page=${page_id}`
        var response = await tor.downloadUrlUsingTor(
          'ItalyFloat',
          URI,
          italy_headers,
          'GET',
          undefined,
          undefined,
          undefined,
          undefined,
          true
        )
        // file.writeToFile(`downloads/ItalyFloat${letter}-${page_id}.html`, response.body);
        const $ = cheerio.load(response.body)
        let trs_ignore_first_two = $('table.m-table > tbody > tr').get().slice(2)
        let filter = new RegExp('[\\t\\n\\r\\f\\v]', 'gm')
        if (trs_ignore_first_two.length < 1) {
          resolve([])
          return
        }
        let label_href_array = $(trs_ignore_first_two).map((i, tr) => {
          let label = $(tr).find('td:nth-child(1) a').attr('title').replace(filter, '')
          let href = $(tr).find('td:nth-child(1) a').attr('href')
          return {
            label: label.trim(),
            url: 'https://www.borsaitaliana.it' + href,
          }
        })
        resolve(label_href_array.get())
      } catch (err) {
        tools.lg(`getItalyEtfsInPage : ${err.message}`)
        reject(`getItalyEtfsInPage : ${err.message}`)
      }
    })()
  })
}

function getShareID(isin) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        let URI = `https://www.borsaitaliana.it/borsa/azioni/profilo-societa-dettaglio.html?isin=${isin}&lang=en`
        var response = await tor.downloadUrlUsingTor(
          'ItalyFloat',
          URI,
          italy_headers,
          'GET',
          undefined,
          undefined,
          undefined,
          undefined,
          true
        )
        // file.writeToFile(`downloads/ItalyFloat${isin}.html`, response.body);
        const $ = cheerio.load(response.body)
        let src = $('#companyprofileframe').attr('src')
        if (src) {
          resolve(path.parse(path.basename(src)).name) //get the share ID
        } else {
          resolve(false)
        }
        return
      } catch (err) {
        tools.lg(`getShareID : ${err.message}`)
        reject(`getShareID : ${err.message}`)
      }
    })()
  })
}

// let isinRegex = new RegExp("([A-Z]{2})([A-Z0-9]{9,11})", "gm");
// let isins_labels_objects = $(trs_ignore_first_two).map((i, tr) => {
//     let isin = $(tr)
//         .find("td:nth-child(2)")
//         .text()
//         .replace(filter, "")
//         .match(isinRegex)[0];
//     let label = $(tr)
//         .find("td:nth-child(1) a").attr('name')
//         .replace(filter, "");
//     return {
//         isin: isin,
//         label: label
//     };
// });
