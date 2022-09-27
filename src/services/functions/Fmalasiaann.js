const cheerio = require('cheerio')
const moment = require('moment')
const Ffetch = require('../Ffetch')

const tools = require(`../tools`)
const file = require(`../file`)
const scraping = require(`../scraping`)

const { clg } = require(`../tools`)
//Simplify logging
const lg = tools.lg

module.exports = {
  getMalasiaAnnouncements,
  getMalasiaAuctions,
  getMalasiaStocks,
  getArticleBody,
  getAllNotices,
  getNoticesFromPage,
  getAllArticles,
}

function getMalasiaAnnouncements(log_tab) {
  return new Promise(function getMalasiaAnnouncements(resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${tools.gFName(new Error())}`, log_tab)
        let params = {
          label: 'ANNOUNCEMENTS',
          taskID: 'PB010400',
          screenId: 'PB010400',
          txtHeader: `News+IDEmbargo+DateOrganisation+NameNews+TypeNews+SubjectNews+Summary`,
          txtSortingColumn: `2`,
          txtSortingOrder: `-1`,
        }
        let Notices = await getAllNotices(`malasiaann`, params, log_tab + 1)
        let articles = await getAllArticles(Notices, `malasiaann`, 'MY_FI_CA', params, log_tab + 1)
        lg(`END - ${tools.gFName(new Error())}`, log_tab)
        resolve(articles)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getMalasiaAuctions(log_tab) {
  return new Promise(function getMalasiaAuctions(resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${tools.gFName(new Error())}`, log_tab)
        let params = {
          label: 'AUCTIONS',
          taskID: 'PB050400',
          screenId: 'PB050400',
          txtHeader: `Tender+DescriptionTender+CodeStock+CodeIssuerIssue+DateFacility+Agent`,
          txtSortingColumn: `5`,
          txtSortingOrder: `-1`,
        }
        let Notices = await getAllNotices(`malasiaann`, params, log_tab + 1)
        let articles = await getAllArticles(Notices, `malasiaann`, 'MY_FI_BIH', params, log_tab + 1)
        lg(`END - ${tools.gFName(new Error())}`, log_tab)
        resolve(articles)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getMalasiaStocks(log_tab) {
  return new Promise(function getMalasiaAuctions(resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${tools.gFName(new Error())}`, log_tab)
        let params = {
          label: 'STOCK',
          taskID: 'PB030900',
          screenId: 'PB030900',
          txtHeader: `Stock+CodeStock+DescriptionISIN+CodeIssuerFacility+CodeInstrument+IDIssue+DateMaturity+DateCurrencyCurrency+Exchange+Rate`,
          txtSortingColumn: `7`,
          txtSortingOrder: `-1`,
        }
        let Notices = await getAllNotices(`malasiaann`, params, log_tab + 1)
        // clg(Notices);
        let articles = await getAllArticles(Notices, `malasiaann`, 'MY_DE_EN', params, log_tab + 1)
        lg(`END - ${tools.gFName(new Error())}`, log_tab)
        resolve(articles)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getAllNotices(source, params, log_tab) {
  return new Promise(function getAllNotices(resolve, reject) {
    ;(async () => {
      try {
        lg(`Extract All Notices`, log_tab + 1)
        let all_data = new Array()
        let end_reached = false
        let page_id = 1
        while (!end_reached) {
          if (page_id > gfinalConfig[source].maximum_pages) {
            lg(`Max pages [ ${gfinalConfig[source].maximum_pages} ] reached ! `, log_tab + 2)
            lg(`Total Notices extracted= ${all_data.length}`, log_tab + 2)
            resolve(all_data)
            return
          }
          lg(`Get [${source}] Notices from page : ${page_id}`, log_tab + 2)
          let this_page_data = await getNoticesFromPage(page_id, `malasiaann`, params, log_tab + 3)
          await tools.pleaseWait(gfinalConfig[source].delay_min, gfinalConfig[source].delay_max, log_tab + 3)
          lg(`[${this_page_data.length}] Notices in this page`, log_tab + 2)
          all_data = all_data.concat(this_page_data)
          page_id++
        }
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getNoticesFromPage(page_id, source, params, log_tab) {
  return new Promise(function getNoticesFromPage(resolve, reject) {
    ;(async () => {
      try {
        lg(`Extracting from Page [${page_id}]`, log_tab + 1)
        let body = `taskId=${params.taskID}&mode=MAIN&linkButton=FIND&screenId=${params.screenId}&drawCheckBox=Y&configButton=false&txtHeader=${params.txtHeader}&txtHeaderLength=10%15%15%10%20%32%&txtHeaderAlign=LEFTLEFTLEFTLEFTLEFTLEFT&txtRecPerPage=${gfinalConfig[source].articlesperpage}&txtStartPageIndex=1&txtPageIndex=${page_id}&txtPageRange=1&txtSortingColumn=${params.txtSortingColumn}&txtSortingOrder=${params.txtSortingOrder}&txtDefaultCriteria=&txtSearchCriteria=`
        let page = await Ffetch.down(
          {
            source: `malasiaann`,
            method: `POST`,
            body: encodeURI(body),
            url: `https://fast.bnm.gov.my/fastweb/public/FastPublicBrowseServlet.do`,
            disablessl: true,
            // savetofile: true,
            // log_req: true,
          },
          log_tab + 1
        )
        let Trs
        if (params.label === 'ANNOUNCEMENTS')
          Trs = await scraping.getTrsFromPage(
            page,
            `#BrowseTable tbody tr`,
            gfinalConfig[source].ANNOUNCEMENTS_target_tds,
            9999999,
            'html',
            log_tab + 1
          )
        if (params.label === 'AUCTIONS')
          Trs = await scraping.getTrsFromPage(
            page,
            `#BrowseTable tbody tr.evenrow,#BrowseTable tbody tr.oddrow`,
            gfinalConfig[source].AUCTIONS_target_tds,
            9999999,
            'html',
            log_tab + 1
          )
        if (params.label === 'STOCK')
          Trs = await scraping.getTrsFromPage(
            page,
            `#BrowseTable tbody tr.evenrow,#BrowseTable tbody tr.oddrow`,
            gfinalConfig[source].STOCK_target_tds,
            999999,
            'html',
            log_tab + 1
          )
        Trs = await Promise.all(
          Trs.map(async tr => {
            let tags
            // if (params.label === "ANNOUNCEMENTS") a_tags = cheerio(tr.newsid).filter("a").get();
            if (params.label === 'ANNOUNCEMENTS') {
              tags = await scraping.getMultiTags('a', tr.newsid, 'object', log_tab, source)
            }

            if (params.label === 'AUCTIONS') {
              // a_tags = cheerio(tr.code).filter('a').get()
              tags = await scraping.getMultiTags('a', tr.code, 'object', log_tab, source)
            }
            if (params.label === 'STOCK') {
              // a_tags = cheerio(tr.code).filter('a').get()
              tags = await scraping.getMultiTags('a', tr.code, 'object', log_tab, source)
            }
            // if (Array.isArray(a_tags) && a_tags.length > 0) {
            if (tags.found && tags.contents.length > 0) {
              const $ = tags.$
              const a_tags = tags.contents
              // tr['id'] = cheerio(a_tags[0]).text()
              // tr['url'] = cheerio(a_tags[0]).attr('href')
              tr['id'] = $(a_tags[0]).text()
              tr['url'] = $(a_tags[0]).attr('href')
            } else {
              tr['id'] = ''
              tr['url'] = ''
            }
            return tr
          })
        )
        resolve(Trs)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getAllArticles(Notices, source, file_prefix, params, log_tab) {
  return new Promise(function getAllArticles(resolve, reject) {
    ;(async () => {
      try {
        let chunks = tools.arrayToChunks(Notices, gfinalConfig[source].chunck_size, 2)
        let all_details = []
        for (let i = 0; i < chunks.length; i++) {
          if (i >= gfinalConfig[source].chunks_limit) {
            lg(`Chunk limit [ ${gfinalConfig[source].chunks_limit} ] reached !`, log_tab + 1)
            resolve(all_details)
            return
          }
          lg(``)
          lg(`Process chunk = ${i} | remaining = ${chunks.length - (i + 1)}`, log_tab + 1)
          all_details = all_details.concat(
            await Promise.all(
              chunks[i].map(async Notice => {
                return await getArticleBody(Notice, source, file_prefix, params, log_tab + 2)
              })
            )
          )
          all_details = [].concat.apply([], all_details) //flattern the array
          await tools.pleaseWait(gfinalConfig[source].delay_min, gfinalConfig[source].delay_max, 2)
        }
        resolve(all_details)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getArticleBody(notice, source, file_prefix, params, log_tab) {
  return new Promise(function getArticleBody(resolve, reject) {
    ;(async () => {
      try {
        notice.url = `https://fast.bnm.gov.my/fastweb/public/${notice.url}`
        let page = await Ffetch.down(
          {
            source: 'malasiaann',
            url: notice.url,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:81.0) Gecko/20100101 Firefox/81.0',
              Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
              referrer: 'https://fast.bnm.gov.my/fastweb/public/FastPublicBrowseServlet.do',
            },
            disablessl: true,
            // savetofile: true,
            // log_req: true,
          },
          log_tab + 1
        )
        let trs
        if (params.label == 'STOCK') {
          let result = await scraping.getOneTag(`#SpanPrint > table`, page, 'html', log_tab + 1)
          // await file.writeToFile('downloads/testart.html', result.content);
          var html_body = result.content
          notice.date = moment().format('YYMMDD')
          let HTML_details
          HTML_details = {
            title: `${notice['isin']} - ${notice['issuer']} - ${notice['description']}`,
            issuer: `${notice.issuer}`,
            date: '',
            time: ``,
            url: notice.url,
            body: html_body,
            prefix: file_prefix + '_' + notice.id,
            path: process.env.MALASIA_EXPORTED_FILES_PATH,
            rem_comment: false,
            filename_date: false,
          }
          let HTML_file_info = await file.SaveHTMLFile(HTML_details, log_tab + 1)
          let Docx_file_info = await file.SaveDocxFile(HTML_details, log_tab + 1)
          resolve({
            // date: notice.date,
            isin: notice.isin,
            issuer: notice.issuer,
            facilitycode: notice.facilitycode,
            issuedate: notice.issuedate,
            description: notice.description,
            docxfilename: Docx_file_info.filename,
            htmlfilename: HTML_file_info.filename,
            size: HTML_file_info.size,
            id: notice.id,
          })
        } else {
          // = await scraping.getTrsFromPage(page, `#SpanPrint > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(1) > fieldset:nth-child(1) > table:nth-child(3) > tbody:nth-child(1) tr`, gfinalConfig[source].target_tds_article, 'noobject', 999999, 'text', log_tab + 1);
          let content
          if (params.label === 'ANNOUNCEMENTS') {
            trs = await scraping.getTrsFromPage(
              page,
              `#SpanPrint > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(1) > fieldset:nth-child(1) > table:nth-child(3) > tbody:nth-child(1) > tr`,
              gfinalConfig[source].ANNOUNCEMENTS_target_tds_article,
              9999999,
              'text',
              log_tab + 1
            )
            content = await scraping.getOneTag(`#txtContent`, page, 'text', log_tab + 1)
            // clg(content.content);
          }
          if (params.label === 'AUCTIONS') {
            trs = await scraping.getTrsFromPage(
              page,
              `#SpanPrint > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(1) > fieldset:nth-child(1) > table:nth-child(2) > tbody:nth-child(1) > tr,#SpanPrint > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(3) > td:nth-child(1) > fieldset:nth-child(1) > table:nth-child(2) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(1) > table:nth-child(1) > tbody:nth-child(1) > tr`,
              gfinalConfig[source].AUCTIONS_target_tds_article,
              999999,
              'text',
              log_tab + 1
            )
          }
          // clg(trs);
          for (tr of trs) {
            if (tr.label.length === 0) continue
            notice[tr.label.replace(':', '').replace(' ', '_')] = tr.value
          }
          var html_body = await file.objectToHTML(notice, 'lines', log_tab + 1)

          if (params.label === 'ANNOUNCEMENTS' && content.found) {
            html_body += `<br><b>Content: </b> <pre>${content.content}</pre>`
          }

          notice.date = moment().format('YYMMDD')
          let HTML_details
          if (params.label === 'ANNOUNCEMENTS') {
            HTML_details = {
              title: `${notice['subject']} - ${notice['organization']} / ${notice['type']}`,
              issuer: `${notice.organization}`,
              date: '',
              time: notice.Embargo_Time,
              url: notice.url,
              body: html_body,
              prefix: file_prefix + '_' + notice.id,
              path: process.env.MALASIA_EXPORTED_FILES_PATH,
              rem_comment: false,
              filename_date: false,
              rem_line_break: false,
            }
          }
          if (params.label === 'AUCTIONS') {
            HTML_details = {
              title: ` ${notice['id'].substr(-9)} - ${notice['description']} / ${notice['issuedate']}`,
              issuer: `${notice.issuer}`,
              date: '',
              time: '',
              url: notice.url,
              body: html_body,
              prefix: file_prefix + '_' + notice.id,
              path: process.env.MALASIA_EXPORTED_FILES_PATH,
              rem_comment: false,
              filename_date: false,
            }
          }
          let HTML_file_info = await file.SaveHTMLFile(HTML_details, log_tab + 1)
          let Docx_file_info = await file.SaveDocxFile(HTML_details, log_tab + 1)
          if (params.label === 'ANNOUNCEMENTS') {
            resolve({
              // date: notice.date,
              issuer: notice.organization,
              subject: notice.subject,
              summary: notice.Summary,
              type: notice.type,
              id: notice.id,
              docxfilename: Docx_file_info.filename,
              htmlfilename: HTML_file_info.filename,
              size: HTML_file_info.size,
            })
          }
          if (params.label === 'AUCTIONS') {
            resolve({
              // date: notice.date,
              issuer: notice.issuer,
              description: notice.description,
              issuedate: notice.issuedate,
              maturity: notice.Maturity_Date,
              id: notice.id,
              docxfilename: Docx_file_info.filename,
              htmlfilename: HTML_file_info.filename,
              size: HTML_file_info.size,
            })
          }
        }
        // resolve(notice);
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

// function downloadPDFsInsideArticle(Notice, body, log_tab) {
//   return new Promise(function (resolve, reject) {
//     (async () => {
//       try {
//         let regex = new RegExp(/http:\/\/www\.rns-pdf\.londonstockexchange\.com\/rns\/\S+?\.pdf/, 'gm');
//         let PDFR_links = [...body.matchAll(regex)].map(amatch => { //Convert to Array and Remove unnecessary match details
//           return amatch[0];
//         });
//         var uSet = new Set(PDFR_links);
//         PDFR_links = [...uSet]; // Remove duplicates
//         let short_files_names = [];
//         if (PDFR_links.length > 0) {
//           short_files_names = await Promise.all(PDFR_links.map(async function (url) {
//             // console.log(url);
//             regex = new RegExp(/(?:\/rns\/)(.*)(?:\.pdf)/, 'g');
//             pdf_file_names = [...url.matchAll(regex)].map(amatch => {
//               return amatch[1]; //Convert to Array and Only return first capturing group
//             });
//             if (Array.isArray(pdf_file_names) && pdf_file_names.length > 0) {
//               // console.log(pdf_file_names);
//               let pdf_file_name = pdf_file_names[0];
//               // console.log(pdf_file_name);
//               // short_files_names.push(`${pdf_file_name}`);
//               let file_data = await tor.downloadUrlUsingTor(
//                 "investigate_pdf",
//                 url,
//                 undefined,
//                 "GET",
//                 undefined,
//                 true,
//                 undefined,
//                 undefined,
//                 undefined,
//                 undefined,
//                 undefined,
//                 undefined,
//                 true,
//                 undefined,
//                 log_tab + 2
//               );
//               let file_name = `INVESTIGATE_${
//                 Notice.date
//             }_${pdf_file_name.replace(
//               /[^a-z|A-Z|0-9]/gm,
//               `-`
//             )
//               .trim()
//               .replace(/-+/gm, `-`)
//               .substring(0, 5)}.pdf`;
//               await tools.writeBinaryFile(
//                 `${process.env.INVESTIGATE_EXPORTED_FILES_PATH}${file_name}`,
//                 file_data.body
//               );
//               return {
//                 file_name: file_name,
//                 size: await file.getFileSize(file_data.body, log_tab + 2)
//               };
//             } else {
//               lg(`Could not extract file name from URL${url}`, log_tab + 3, 'warn');
//             }
//             // }
//           }));
//         } else {
//           lg(`No PDF links found in this article`, log_tab + 3, 'warn');
//         }
//         resolve(short_files_names);
//         return;
//       } catch (err) {
//         tools.catchError(err, "downloadPDFInsideArticle", true, "general", log_tab + 3);
//         reject(`downloadPDFInsideArticle: ${err.message}`);
//       }
//     })();
//   });
// }
