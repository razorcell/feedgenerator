const cheerio = require('cheerio')
const { catchError } = require(`../tools`)
const tor = require(`../tor`)
const tools = require(`../tools`)
const fileModule = require(`../file`)
const puppeteer = require('puppeteer')
const htmlDocx = require('html-docx-js-typescript')
const moment = require('moment')
var HtmlDecode = require('decode-html')
const { exitOnError } = require('winston')

//Simplify logging
const lg = tools.lg

const { clg, typeOf } = require(`../tools`)

module.exports = {
  getArticleBody,
  getIrelandSEUpdates,
  getAnnouncementsFromPage,
  getAllAnnouncements,
}

var LSE_headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:78.0) Gecko/20100101 Firefox/78.0',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.5',
  'Content-Type': 'application/json',
  Origin: 'https://www.londonstockexchange.com',
  Connection: 'keep-alive',
  //   Referer:
  //     "https://www.londonstockexchange.com/news?tab=news-explorer&headlinetypes=&excludeheadlines=&period=custom&beforedate=20200721&afterdate=20200719&headlines=,16,75,79",
}

function getIrelandSEUpdates(datevalue) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        lg(`IrelandAN: Get Updates [${datevalue}]`, 1)
        let desired_date = moment(datevalue, 'YYYYMMDD').format('DD/MM/YYYY')
        let announcements = await getAllAnnouncements(desired_date, desired_date, 2)
        let articles = await getAllArticles(announcements, 2)
        let global_files = await generateGlobalFiles(articles, desired_date, 2)
        // let CON_global_file = await generateGlobalFile(
        //   articles,
        //   "CON",
        //   desired_date
        // );
        // let CAN_global_file = await generateGlobalFile(
        //   articles,
        //   "CAN",
        //   desired_date
        // );
        articles = articles.map(article => {
          delete article.body
          return article
        })
        articles.push(global_files.docx)
        articles.push(global_files.html)

        // articles.push(CON_global_file);
        // articles.push(CAN_global_file);
        lg(`IrelandAN: Finished`, 1)
        resolve(articles)
        return
      } catch (err) {
        tools.catchError(err, 'getIrelandSEUpdates', undefined, undefined, 3)
        reject(`getIrelandSEUpdates : ${err.message}`)
      }
    })()
  })
}
function getAllAnnouncements(start_date, end_date, log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        lg(`Extract announcements from ${start_date} => ${end_date}`, log_tab + 1)
        let all_data = new Array()
        let end_reached = false
        let page_id = 1
        while (!end_reached) {
          if (page_id > gfinalConfig.ireland.maximum_pages) {
            lg(`Max pages [ ${gfinalConfig.ireland.maximum_pages} ] reached ! `, log_tab + 2)
            resolve(all_data)
            return
          }
          lg(`Get IrelandAN Announcements from page : ${page_id}`, log_tab + 2)
          let this_page_data = await getAnnouncementsFromPage(page_id, start_date, end_date, log_tab + 1)
          await tools.pleaseWait(2, 2, log_tab + 3)
          //Somehow the previous line returns an Object instead of array, so this line is necessary
          lg(`[${this_page_data.length}] Announcements in this page`, log_tab + 2)
          if (this_page_data.length < 1) {
            resolve(all_data)
            return
          }
          if (this_page_data.length == 0) {
            end_reached = true
            lg(`END REACHED`, log_tab + 3)
            lg(`Total Announcements extracted= ${all_data.length}`, log_tab + 3)
            resolve(all_data)
            return
          } else {
            all_data = all_data.concat(this_page_data)
            page_id++
          }
        }
      } catch (err) {
        tools.catchError(err, 'getAllArticles', undefined, undefined, log_tab + 4)
        reject(`getAllArticles: ${err.message}`)
      }
    })()
  })
}
function getAnnouncementsFromPage(page_id, start_date, end_date, log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        lg(`Extracting from page [${page_id}]`, log_tab + 1)
        let params = {
          searchRestriction: {
            Letter: 'Full',
            PageSize: '30',
            CurrentPage: page_id,
            CompanyName: '',
            StartDate: start_date,
            EndDate: end_date,
          },
        }
        let page = await tor.downloadUrlUsingTor(
          'ireland',
          'https://direct.euronext.com/WebServices/EcommerceService.asmx/LoadRNSAnnouncement',
          ireland_headers,
          'POST',
          undefined,
          false,
          undefined,
          JSON.stringify(params),
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
        // console.log(page.body);
        let object = JSON.parse(page.body)
        let json_response = JSON.parse(object.d.replace(/\\r?\\n|\\r/g, '').trim())
        let this_page_announcements = []
        if (json_response.CurrentFirstRow > json_response.TotalCount) {
          //END REACHED;
          lg(`End reached at page [${page_id}]`, log_tab + 2)
          resolve(this_page_announcements)
          return
        }

        const $ = cheerio.load(json_response.Html)
        // console.log(json_response.Html);
        let Trs = $(`table tbody tr`).get()
        // let filter = new RegExp("[\\t\\n\\r\\f\\v]", "gm");
        if (Trs.length < 1) {
          lg(`End reached no Trs in table`, log_tab + 2, 'warn')
          resolve(this_page_announcements)
          return
        }
        this_page_announcements = Trs.map((tr, tr_undx) => {
          let tds = $(tr).find('td').get()
          // clg(
          //   `------------------------------------TR [${tr_undx}] has ${tds.length} Tds`
          // );
          // clg(tds);
          return {
            date: $(tds[0]).text().trim(),
            time: $(tds[3]).text().trim().replace(':', ''),
            issuer: $(tds[1]).text().trim(),
            title: $(tds[2]).text().trim().toUpperCase(),
            url: `https://direct.euronext.com${$($(tds[2]).find('a')[0]).attr('href').trim()}`,
          }
        })
        lg(`Extracted ${this_page_announcements.length} Announcements`, log_tab + 3)
        let relevant_titles = [
          'Gem Notice',
          'Admission',
          'Cancellation', //          "Cancellation Notice",
          'Redemption',
          'Repurchase',
          'Delisting',
          'Issue', //Bond Issue
          'Auction', //Bond Auction
        ]
        // console.log(this_page_announcements);
        // console.log("---");
        this_page_announcements = this_page_announcements.filter(announcement =>
          relevant_titles.some(function (relev_title) {
            // console.log(
            //   `${announcement.title} ?= ${relev_title.toUpperCase()}`
            // );
            return announcement.title.includes(relev_title.toUpperCase())
          })
        )
        lg(`Reduced to ${this_page_announcements.length} relevant events`, log_tab + 3)
        resolve(this_page_announcements)
        return
      } catch (err) {
        // lg(`getAnnouncementsFromPage : ${err.message}`, log_tab + 4, "error");
        tools.catchError(err, 'getAnnouncementsFromPage', true, 'general', log_tab + 4)
        reject(`getAnnouncementsFromPage : ${err.message}`)
      }
    })()
  })
}

function generateGlobalFiles(articles, desired_date, log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        let HTML = ''
        let file_name_prefix = 'IE_FI'
        if (articles.length == 0) {
          HTML += `<p style="text-align: center; font-size:17px"><b>London Stock Exchange</b></p>`
          HTML += `<p style="text-align: center">There is no announcements for Fixed income Ireland for ${desired_date}</p>`
        } else {
          articles.forEach(article => {
            HTML +=
              article.body +
              `<p style="text-align: center">-------------------------------------------------</p>`
          })
        }
        let WORD = await htmlDocx.asBlob(HTML) // asBlob() return Promise<Blob|Buffer>
        let size = tools.formatBytes(Buffer.byteLength(HTML, 'utf8'))

        let filename_word = `${file_name_prefix}_${moment(desired_date, `DD/MM/YYYY`).format(
          `YYYYMMDD`
        )}_${size.replace(/\s/gm, `-`).replace(`.`, `-`).replace(/-+/gm, '-')}.docx`
        let filename_html = `${file_name_prefix}_${moment(desired_date, `DD/MM/YYYY`).format(
          `YYYYMMDD`
        )}_${size.replace(/\s/gm, `-`).replace(`.`, `-`).replace(/-+/gm, '-')}.html`
        await fileModule.writeToFile(`${process.env.IRELAND_EXPORTED_FILES_PATH}${filename_word}`, WORD)
        await fileModule.writeToFile(`${process.env.IRELAND_EXPORTED_FILES_PATH}${filename_html}`, HTML)
        /* date: $(tds[0]).text().trim(),
            time: $(tds[3]).text().trim().replace(":", ""),
            issuer: $(tds[1]).text().trim(),
            title: $(tds[2]).text().trim().toUpperCase(),
            url: `https://direct.euronext.com${$($(tds[2]).find("a")[0]) */
        resolve({
          docx: {
            date: moment(desired_date, 'DD/MM/YYYY').format('YYYYMMDD'),
            time: `ALL_WORD`,
            issuer: `ALL_WORD`,
            title: `ALL_WORD`,
            url: `ALL_WORD`,
            filename: filename_word,
            size: size,
          },
          html: {
            date: moment(desired_date, 'DD/MM/YYYY').format('YYYYMMDD'),
            time: `ALL_HTML`,
            issuer: `ALL_HTML`,
            title: `ALL_HTML`,
            url: `ALL_HTML`,
            filename: filename_html,
            size: size,
          },
        })
        return
      } catch (err) {
        // tools.catchError(err, "general", true, "error", 2);
        tools.catchError(err, 'generateGlobalFile', undefined, undefined, log_tab + 1)
        reject(`generateGlobalFile: ${err.message}`)
      }
    })()
  })
}

function getAllArticles(announcements, log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        let chunks = tools.arrayToChunks(announcements, gfinalConfig.ireland.chunck_size, 2)
        let all_details = []
        for (let i = 0; i < chunks.length; i++) {
          if (i >= gfinalConfig.ireland.chunks_limit) {
            lg(`Chunk limit [ ${gfinalConfig.ireland.chunks_limit} ] reached !`, log_tab + 1)
            resolve(all_details)
            return
          }
          lg(``)
          lg(`Process chunk = ${i} | remaining = ${chunks.length - (i + 1)}`, log_tab + 1)

          all_details = all_details.concat(
            await Promise.all(
              chunks[i].map(async announcement => {
                return await getArticleBody(announcement, log_tab + 2)
              })
            )
          )
          all_details = [].concat.apply([], all_details) //flattern the array
          await tools.pleaseWait(gfinalConfig.ireland.delay_min, gfinalConfig.ireland.delay_max, 2)
        }
        resolve(all_details)
        return
      } catch (err) {
        // lg(`getAllArticles:  ${err.message}`, 2, "error");
        tools.catchError(err, 'getAllArticles', undefined, undefined, log_tab + 1)
        reject(`getAllArticles: ${err.message}`)
      }
    })()
  })
}
function getArticleBody(announcement, log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        announcement.date = moment(announcement.date, 'DD/MM/YYYY').format('YYYYMMDD')
        let page = await tor.downloadUrlUsingTor(
          'ireland',
          announcement.url,
          undefined,
          undefined,
          undefined,
          false,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          log_tab + 1
        )
        // let body = "";
        // const $ = cheerio.load(page.body);
        // let article_divs = $(
        //   `body form#aspnetForm div#wrapper div.container div.sub_panel div.common-form > div`
        // ).get();
        // if (article_divs.length < 1) {
        //   lg(`Article Div not found`, log_tab + 2, "warn");
        //   body =
        //     "<p> Could not load this announcement at time of extraction !, please manually check the source link below. Thanks !</p>";
        // } else {
        //   body = HtmlDecode($(article_divs[1]).html());
        // }
        // let body = page.body;

        let body = ''
        const $ = cheerio.load(page.body)
        let article_divs = $(`html body`).get()
        if (article_divs.length < 1) {
          lg(`Article Body not found`, log_tab + 2, 'warn')
          body =
            '<p> Could not load this announcement at time of extraction !, please manually check the source link below. Thanks !</p>'
        } else {
          body = $(article_divs[0]).html()
        }
        let header = `
        <h3>${announcement.title}</h3>
        <h4>${announcement.issuer}</h4>
        <p>Released: ${announcement.date}<p>
        `
        let footer = `<br><p>Source: <a href="${announcement.url}">${announcement.url}</a></p>`
        announcement.body = header + body + footer

        // let data = await htmlDocx.asBlob(announcement.body); // asBlob() return Promise<Blob|Buffer>
        let size = tools.formatBytes(Buffer.byteLength(announcement.body, 'utf8'))
        let filename = `${announcement.date}_${announcement.title
          .replace(/\s/gm, `-`)
          .replace(/[^A-Za-z0-9]/gm, `-`)
          // .toLowerCase()
          .trim()
          .replace(/-+/gm, '-')}_${announcement.time}_${size
          .replace(/\s/gm, `-`)
          .replace(`.`, `-`)
          .replace(/-+/gm, '-')}.html`
        await fileModule.writeToFile(
          `${process.env.IRELAND_EXPORTED_FILES_PATH}${filename}`,
          announcement.body
        )
        announcement.size = size
        announcement.filename = filename
        announcement.url = `<a href="${announcement.url}" target="_blank">GoTo</a>`

        resolve(announcement)
        return
      } catch (err) {
        // lg(`getArticleBody: ${err.message} Stack: ${err.stack}`, 4, "error");
        tools.catchError(err, 'getArticleBody', undefined, undefined, log_tab + 1)
        reject(`getArticleBody: ${err.message}`)
      }
    })()
  })
}

function GetProperty(element, property) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        resolve(await (await element.getProperty(property)).jsonValue())
        return
      } catch (err) {
        lg(`GetProperty:  ${err.message}`, 2, 'error')
        reject(`GetProperty: ${err.message}`)
      }
    })()
  })
}

function getAnnouncementsFromPageUsingPupeteer(browser, page_id) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        // lg(`Extracting from page [${page_id}]`, 1);
        const page = await browser.newPage()
        let url = `https://direct.euronext.com/Announcements/View-Announcements/RIS-Announcements/#page-${page_id}`
        let trial = 1
        let page_loaded = false
        while (!page_loaded) {
          try {
            if (trial > gfinalConfig.ireland.pupeteer_max_trials) {
              lg(`Chrome Maximum Trials [${gfinalConfig.ireland.pupeteer_max_trials}] exceeded`, 4)
              resolve({})
              return
            }
            lg(`Trial [${trial}] Chrome Goto: ${url}`, 3)
            trial++
            await page.goto(url, {
              waitUntil: 'load',
              timeout: gfinalConfig.ireland.puppeteer_timeout,
            })
            page_loaded = true
          } catch (err) {
            lg(`GetArticlesFromPage => LoadPage: ${err.message}`, 4, 'error')
            await tools.pleaseWait(gfinalConfig.ireland.delay_min, gfinalConfig.ireland.delay_max, 5)
          }
        }
        lg('Waiting..')
        await page.waitForFunction(() => document.querySelectorAll('#AnnouncementRNS_table tr').length >= 5)
        await page.waitForFunction(
          () => document.querySelector('#AnnouncementRNS_table tr td:first-child').innerHTML.length >= 5
        )
        // lg("Table is full now");
        const selector = '#AnnouncementRNS_table tbody tr'
        const announcements = await page.$$eval(selector, trs =>
          trs.map(tr => {
            const tds = [...tr.getElementsByTagName('td')]
            var row = {
              date: tds[0].textContent.replace(/\r?\n|\r/g, '').trim(),
              issuer: tds[1].textContent.replace(/\r?\n|\r/g, '').trim(),
              subject: tds[2].textContent.replace(/\r?\n|\r/g, '').trim(),
            }
            const hrefs = [...tds[2].getElementsByTagName('a')]
            row.href = hrefs[0].href
            return row
          })
        )
        // lg("We have all rows");
        // console.log(results);
        lg(`Extracted ${announcements.length} Announcements`, 1)
        resolve(announcements)
        return
      } catch (err) {
        lg(`getAnnouncementsFromPage : ${err.message}`, 3, 'error')
        reject(`getAnnouncementsFromPage : ${err.message}`)
      }
    })()
  })
}
var ireland_headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:78.0) Gecko/20100101 Firefox/78.0',
  Accept: '*/*',
  'Accept-Encoding': 'gzip, deflate, br',
  'Accept-Language': 'en-US,en;q=0.5',
  Referer: 'https://direct.euronext.com/Announcements/View-Announcements/RIS-Announcements/',
  'X-Requested-With': 'XMLHttpRequest',
  'Content-Type': 'application/json; charset=utf-8',
  // RequestVerificationToken: "XZ+6pesb+X2t1EGwSm7ZrUzzbw80000",
  Origin: 'https://direct.euronext.com',
  Connection: 'close',
  //   Referer:
  //     "https://www.londonstockexchange.com/news?tab=news-explorer&headlinetypes=&excludeheadlines=&period=custom&beforedate=20200721&afterdate=20200719&headlines=,16,75,79",
}

// function getAnnouncementsList(params) {
//   return new Promise(function (resolve, reject) {
//     (async () => {
//       try {
//         let json_object = {
//           path: "news",
//           parameters: `tab=news-explorer&headlinetypes=&excludeheadlines=&period=custom&beforedate=${params.beforedate}&afterdate=${params.afterdate}&headlines=,${params.headlines}&tabId=58734a12-d97c-40cb-8047-df76e660f23f`,
//           components: [
//             {
//               componentId:
//                 "block_content%3A431d02ac-09b8-40c9-aba6-04a72a4f2e49",
//               parameters: `headlines=${params.headlines}&period=custom&beforedate=${params.beforedate}&afterdate=${params.afterdate}&headlinetypes=&excludeheadlines=&page=${params.page_id}&size=${params.size}`,
//             },
//           ],
//         };
//         let response = await tor.downloadUrlUsingTor(
//           "Londonse",
//           `https://api.londonstockexchange.com/api/v1/components/refresh`,
//           LSE_headers,
//           "POST",
//           undefined,
//           false,
//           undefined,
//           JSON.stringify(json_object),
//           undefined,
//           undefined,
//           undefined,
//           undefined,
//           undefined,
//           undefined,
//           4
//         );
//         let data_json = JSON.parse(response.body);
//         let announcements = data_json[0].content[1].value.content;
//         lg(`Extracted ${announcements.length} Announcements`, 1);
//         resolve(announcements);
//         return;
//       } catch (err) {
//         lg(`getAnnouncementsFromPage : ${err.message}`, 3, "error");
//         reject(`getAnnouncementsFromPage : ${err.message}`);
//       }
//     })();
//   });
// }
