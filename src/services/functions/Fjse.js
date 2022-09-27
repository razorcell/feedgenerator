// const cheerio = require("cheerio");
const tor = require(`../tor`)
const file = require(`../file`)
const tools = require(`../tools`)
const puppeteer = require('puppeteer')
var pdf2table = require('pdf2table')
var fs = require('fs').promises
const util = require('util')
const path = require('path')

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
  getJseUpdates,
  getDataFromPDF,
}

function getJseUpdates() {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        //Download JSE file
        let full_file_path = await downloadJSEFile()
        //Convert File to array
        let data = await getDataFromPDF(full_file_path)
        resolve(data)
      } catch (err) {
        tools.lg(`JSE: getJseUpdates ${err.message}`)
        reject()
      }
    })()
  })
}

function getDataFromPDF(full_file_path) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        tools.lg(`Extracting data From PDF : ${full_file_path}`)
        //get Array from PDF
        let buffer = await fs.readFile(full_file_path)
        tools.lg(`Step1`)

        const parseTable = util.promisify(pdf2table.parse)
        tools.lg(`Step2`)
        let data = await parseTable(buffer)

        //Remove rows having less than 6 columns
        tools.lg('before = ' + data.length)
        let real_data = data.filter(row => row.length > 6)
        tools.lg('after = ' + real_data.length)
        //Complete rows to have 22 columns
        let new_data = real_data.map(row => {
          //22
          let trimed = row.map(elem => elem.trim())
          for (let i = 0; i < 22; i++) {
            if (!trimed[i]) trimed.push(null)
          }
          return trimed
        })
        resolve(new_data)
      } catch (err) {
        tools.lg(`JSE: getDataFromPDF ${err.message}`)
        reject()
      }
    })()
  })
}

function downloadJSEFile() {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        tools.lg('Get Today s file')
        //Download JSE file
        let data = []
        let file_name = `${new Date()
          .toISOString()
          .replace(/T/, '_')
          .replace(/(:|-)/g, '')
          .replace(/\..+/, '')}-jse.pdf`
        let full_file_path = path.join(tools.getPath('downloads'), file_name)
        // let file_path_name = `${gTrashPath}JSEData.pdf`;
        // console.log(`full_file_path = ${full_file_path}`);
        //download file
        let URL = 'https://www.jse.co.za/content/JSEDocumentItems/MoneyMarketIsins/ACTIVE%20ISINS.pdf'
        let response = await tor.downloadUrlUsingTor('jse', URL)
        tools.lg('JSE file Downloaded ! Saving to disk...')
        await tools.writeBinaryFile(full_file_path, response.body)
        tools.lg('File saved at: ' + full_file_path)
        resolve(full_file_path)
      } catch (err) {
        tools.lg(`JSE: downloadJSEFile ${err.message}`)
        reject()
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

// function getItalyEtfs() {
//     return new Promise(function (resolve, reject) {
//         (async () => {
//             try {
//                 let all_data = new Array();
//                 let end_reached = false;
//                 let page_id = 1;
//                 while (!end_reached) {
//                     tools.lg(`Get Italy ETFs page : ${page_id}`);
//                     let this_page_data = await getItalyEtfsInPage(page_id);
//                     //Somehow the previous line returns an Object instead of array, so this line is necessary
//                     tools.lg(
//                         `[${this_page_data.length}] ETFs in this page`
//                     );
//                     if (this_page_data.length < 1 || page_id > gfinalConfig.italyetf.page_limit) {
//                         end_reached = true;
//                         tools.lg(`END REACHED`);
//                         // clg(all_data);
//                         tools.lg(`Total rows extracted=${all_data.length}`);
//                         // clg(all_data);
//                         resolve(all_data);
//                     } else {
//                         // clg("this_page_data=");
//                         // clg(this_page_data);
//                         all_data = all_data.concat(this_page_data);
//                         // tools.lg(`temp total=${all_data.length}`);
//                         page_id++;
//                     }
//                 }
//             } catch (err) {
//                 tools.lg(`Italy: getItalyEtfs ${err.message}`);
//                 reject(`Italy: getItalyEtfs`);
//             }
//         })();
//     });
// }

// function getItalyEtfsInPage(page_id) {
//     return new Promise(function (resolve, reject) {
//         (async () => {
//             try {
//                 let URI = `https://www.borsaitaliana.it/borsa/etf/search.html?comparto=ETF&idBenchmarkStyle=&idBenchmark=&indexBenchmark=&lang=en&page=${page_id}`;
//                 var response = await tor.downloadUrlUsingTor('ItalyETF', URI, italy_headers, 'GET', undefined, undefined, undefined, undefined, true);
//                 file.writeToFile(`downloads/italyetfpage${page_id}.html`, response.body);
//                 const $ = cheerio.load(response.body);
//                 let trs_ignore_first_two = $("table.m-table > tbody > tr")
//                     .get()
//                     .slice(2);
//                 let filter = new RegExp("[\\t\\n\\r\\f\\v]", "gm");
//                 // let isinRegex = new RegExp("([A-Z]{2})([A-Z0-9]{9,11})", "gm");

//                 // trs_ignore_first_two.forEach((elem) => {
//                 //     console.log($(elem).text());
//                 // });
//                 //#tableResults > div.w1001.\|.l-box.\|.h-bg--gray > table > tbody > tr:nth-child(3) > td:nth-child(1) > a > span
//                 //#tableResults > div.w1001.\|.l-box.\|.h-bg--gray > table > tbody > tr:nth-child(3) > td:nth-child(1) > a
//                 let label_href_array = $(trs_ignore_first_two).map((i, tr) => {
//                     let label = $(tr)
//                         .find("td:nth-child(1) a")
//                         .attr('title')
//                         .replace(filter, "");
//                     // .match(isinRegex)[0]
//                     let href = $(tr)
//                         .find("td:nth-child(1) a")
//                         .attr('href');
//                     return {
//                         label: label.trim(),
//                         url: 'https://www.borsaitaliana.it' + href
//                     };
//                 });
//                 resolve(label_href_array.get());
//             } catch (err) {
//                 tools.lg(`getItalyEtfsInPage : ${err.message}`);
//                 reject(`getItalyEtfsInPage : ${err.message}`);
//             }
//         })();
//     });
// }
