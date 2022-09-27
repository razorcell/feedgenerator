const { clg } = require(`../tools`)

const Ffetch = require(`../Ffetch`)

const tools = require(`../tools`)
const scraping = require(`../scraping`)

//Simplify logging
const lg = tools.lg

module.exports = {
  getKASEUpdates,
  getSecuritiesFromHTML,
}

function getKASEUpdates(source, log_tab) {
  return new Promise(function getKASEUpdates(resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${tools.gFName(new Error())}`, log_tab)
        let securities = await getSecuritiesFromHTML(source, log_tab + 1)
        lg(`END - ${tools.gFName(new Error())}`, log_tab + 1)
        resolve(securities)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getSecuritiesFromHTML(source, log_tab) {
  return new Promise(function getSecuritiesFromHTML(resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${tools.gFName(new Error())}`, log_tab)
        let html = await Ffetch.down(
          {
            source: source,
            url: `https://kase.kz/en/tickers/`,
            savetofile: true,
          },
          log_tab + 1
        )
        let categories = [
          `#ticker-container-3 > div:nth-child(2) > div:nth-child(1) > table:nth-child(1) > tbody:nth-child(2) > tr`,
          `#ticker-container-4 > div:nth-child(2) > div:nth-child(1) > table:nth-child(1) > tbody:nth-child(2) > tr`,
          `#ticker-container-7 > div:nth-child(2) > div:nth-child(1) > table:nth-child(1) > tbody:nth-child(2) > tr`,
          `#ticker-container-8 > div:nth-child(2) > div:nth-child(1) > table:nth-child(1) > tbody:nth-child(2) > tr`,
          `#ticker-container-10 > div:nth-child(2) > div:nth-child(1) > table:nth-child(1) > tbody:nth-child(2) > tr`,
          `#ticker-container-11 > div:nth-child(2) > div:nth-child(1) > table:nth-child(1) > tbody:nth-child(2) > tr`,
          `#ticker-container-12 > div:nth-child(2) > div:nth-child(1) > table:nth-child(1) > tbody:nth-child(2) > tr`,
          `#ticker-container-15 > div:nth-child(2) > div:nth-child(1) > table:nth-child(1) > tbody:nth-child(2) > tr`,
        ]
        // clg(categories.join());
        let Trs = await scraping.getTrsFromPage(
          html,
          categories.join(),
          gfinalConfig[source].target_tds,
          9999999,
          'text',
          log_tab + 1
        )
        lg(`END - ${tools.gFName(new Error())}`, log_tab)
        resolve(Trs)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab + 2)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}
// function getAllSecurities(source, log_tab) {
//   return new Promise(function getAllSecurities(resolve, reject) {
//     (async () => {
//       try {
//         lg(`START - ${tools.gFName(new Error())}`, log_tab);
//         let all_data = new Array();
//         let end_reached = false;
//         let page_id = 1;
//         while (!end_reached) {
//           // if (page_id < 56) {
//           //   page_id++;
//           //   continue;
//           // }
//           if (page_id > gfinalConfig[source].maximum_pages) {
//             lg(
//               `Max pages [ ${gfinalConfig[source].maximum_pages} ] reached ! `,
//               log_tab + 2
//             );
//             lg(`Total Notices extracted= ${all_data.length}`, log_tab + 2);
//             resolve(all_data);
//             return;
//           }
//           lg(`Get [${source}] Notices from page : ${page_id}`, log_tab + 2);
//           let this_page_data = await getSecuritiesFromPage(
//             source,
//             page_id,
//             log_tab + 3
//           );
//           await tools.pleaseWait(gfinalConfig[source].delay_min, gfinalConfig[source].delay_max, log_tab + 3);
//           //Somehow the previous line returns an Object instead of array, so this line is necessary
//           lg(`[${this_page_data.length}] Notices in this page`, log_tab + 2);
//           if (this_page_data.length < 1) {
//             end_reached = true;
//             lg(`END REACHED`, log_tab + 2);
//             lg(`Total Notices extracted= ${all_data.length}`, log_tab + 2);
//             resolve(all_data);
//             return;
//           } else {
//             all_data = all_data.concat(this_page_data);
//             page_id++;
//           }
//         }
//         lg(`END - ${tools.gFName(new Error())}`, log_tab);
//       } catch (err) {
//         tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab);
//         reject(`${tools.gFName(new Error())} : ${err.message}`);
//       }
//     })();
//   });
// }

// function getSecuritiesFromPage(source, page_id, log_tab) {
//   return new Promise(function getSecuritiesFromPage(resolve, reject) {
//     (async () => {
//       try {
//         lg(`START - ${tools.gFName(new Error())}`, log_tab);
//         let html = await Ffetch.down({
//           source: source,
//           url: `http://www.kacd.kz/en/stats/fi/${page_id}/`,
//           // savetofile: true,
//         }, log_tab + 1);
//         let securities = await getSecuritiesFromHTML(html, source, log_tab + 1);
//         lg(`END - ${tools.gFName(new Error())}`, log_tab);
//         resolve(securities);
//         return;
//       } catch (err) {
//         tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab);
//         reject(`${tools.gFName(new Error())} : ${err.message}`);
//       }
//     })();
//   });
// }
