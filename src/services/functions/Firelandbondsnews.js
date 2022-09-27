const cheerio = require('cheerio')
const moment = require('moment')
const Ffetch = require('../Ffetch')

const tor = require(`../tor`)
const tools = require(`../tools`)
const file = require(`../file`)

//Simplify logging
const lg = tools.lg

module.exports = {
  getArticleBody,
  getIrelandBondsNewsUpdates,
  getAllNotices,
  getNoticesFromPage,
  getSecondaryFeaturedNotice,
  getAllArticles,
}

function getIrelandBondsNewsUpdates(log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        lg(`START - getIrelandBondsNewsUpdates`, log_tab)
        let Notices = await getAllNotices(log_tab + 1)
        let articles = await getAllArticles(Notices, log_tab + 1)
        lg(`END - getIrelandBondsNewsUpdates`, log_tab + 1)
        resolve(articles)
        return
      } catch (err) {
        tools.catchError(err, 'getIrelandBondsNewsUpdates', undefined, undefined, log_tab + 2)
        reject(`getIrelandBondsNewsUpdates : ${err.message}`)
      }
    })()
  })
}

function getAllNotices(log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        lg(`Extract All Notices`, log_tab + 1)
        let all_data = new Array()
        let end_reached = false
        let page_id = 1
        while (!end_reached) {
          if (page_id > gfinalConfig.irelandbondsnews.maximum_pages) {
            lg(`Max pages [ ${gfinalConfig.irelandbondsnews.maximum_pages} ] reached ! `, log_tab + 2)
            lg(`Total Notices extracted= ${all_data.length}`, log_tab + 2)
            resolve(all_data)
            return
          }
          lg(`Get Ireland Notices from page : ${page_id}`, log_tab + 2)
          let this_page_data = await getNoticesFromPage(page_id, log_tab + 3)
          await tools.pleaseWait(2, 2, log_tab + 3)
          //Somehow the previous line returns an Object instead of array, so this line is necessary
          lg(`[${this_page_data.length}] Notices in this page`, log_tab + 2)
          if (this_page_data.length < 1) {
            resolve(all_data)
            return
          }
          if (this_page_data.length == 0) {
            end_reached = true
            lg(`END REACHED`, log_tab + 2)
            lg(`Total Notices extracted= ${all_data.length}`, log_tab + 2)
            resolve(all_data)
            return
          } else {
            all_data = all_data.concat(this_page_data)
            page_id++
          }
        }
      } catch (err) {
        tools.catchError(err, 'getAllNotices', undefined, undefined, log_tab + 4)
        reject(`getAllNotices: ${err.message}`)
      }
    })()
  })
}

function getNoticesFromPage(page_id, log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        lg(`Extracting from Page [${page_id}]`, log_tab + 1)
        let url = `https://www.ntma.ie/news/p${page_id}`
        let page = await Ffetch.down(
          {
            source: `irelandbondsnews`,
            url: url,
          },
          log_tab + 1
        )
        // let page = await tor.downloadUrlUsingTor(
        //   "irelandbondsnews",
        //   url,
        //   undefined,
        //   "GET",
        //   undefined,
        //   gfinalConfig.irelandbondsnews.use_tor,
        //   undefined,
        //   undefined,
        //   undefined,
        //   undefined,
        //   undefined,
        //   undefined,
        //   undefined,
        //   undefined,
        //   log_tab + 2
        // );
        let all_notices = []
        if (page_id == 1) {
          all_notices = [
            ...(await getMainFeaturedNotice(page, log_tab + 2)),
            ...(await getSecondaryFeaturedNotice(page, log_tab + 2)),
          ]
        }
        all_notices = all_notices.concat(await getVerticalNotices(page, log_tab + 2))
        resolve(all_notices)
        return
      } catch (err) {
        tools.catchError(err, 'getNoticesFromPage', true, 'general', log_tab + 3)
        reject(`getNoticesFromPage : ${err.message}`)
      }
    })()
  })
}

function getMainFeaturedNotice(body, log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        lg(`START - getMainFeaturedNotice`, log_tab + 1)
        const $ = cheerio.load(body)
        let main_featured = $(`.card.card--featured`).get() //.card.card--featured.card--margin-bottom.card--shadow.card--has-hover.card--has-image
        let main_notice = {}
        if (!Array.isArray(main_featured) || main_featured.length < 1) {
          lg(`No Main Featured Notice Found`, log_tab + 2, 'warn')
          resolve([])
          return
        } else {
          // console.log($($(Trs).toArray()[1]).html());
          main_notice.date = $(
            $(main_featured[0]).find('span.card__content-detail.card__content-detail--date').get()[0]
          )
            .text()
            .trim()
          main_notice.title = $($(main_featured[0]).find('h2').get()[0]).text().trim()
          main_notice.url = $($(main_featured[0]).find('a').get()[0]).attr('href').trim()
        }
        lg(`END - getMainFeaturedNotice`, log_tab + 1)
        resolve([main_notice])
        return
      } catch (err) {
        tools.catchError(err, 'getMainFeaturedNotice', undefined, undefined, log_tab + 3)
        reject(`getMainFeaturedNotice : ${err.message}`)
      }
    })()
  })
}

function getSecondaryFeaturedNotice(body, log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        lg(`START - getSecondaryFeaturedNotice`, log_tab + 1)
        const $ = cheerio.load(body)
        let secondary_featured = $(`.card-container__col-50 a`).get() //.card.card--featured.card--margin-bottom.card--shadow.card--has-hover.card--has-image
        let notices = []
        if (!Array.isArray(secondary_featured) || secondary_featured.length < 1) {
          lg(`No Secondary Featured Notices Found`, log_tab + 2, 'warn')
          resolve([])
          return
        } else {
          // console.log($($(Trs).toArray()[1]).html());
          notices = secondary_featured.map(a_tag => {
            return {
              date: $($(a_tag).find('span.card__content-detail.card__content-detail--date').get()[0])
                .text()
                .trim(),
              title: $($(a_tag).find('h2').get()[0]).text().trim(),
              url: $(a_tag).attr('href').trim(),
            }
          })
        }
        lg(`END - getSecondaryFeaturedNotice`, log_tab + 1)
        resolve(notices)
        return
      } catch (err) {
        tools.catchError(err, 'getSecondaryFeaturedNotice', undefined, undefined, log_tab + 3)
        reject(`getSecondaryFeaturedNotice : ${err.message}`)
      }
    })()
  })
}

function getVerticalNotices(body, log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        lg(`START - getVerticalNotices`, log_tab + 1)
        const $ = cheerio.load(body)
        let v_notices = $(`section.standard-listing div.standard-listing__listing`).get() //.card.card--featured.card--margin-bottom.card--shadow.card--has-hover.card--has-image
        // let notices = [];
        if (!Array.isArray(v_notices) || v_notices.length < 1) {
          lg(`No Vertical notices Found`, log_tab + 2, 'warn')
          resolve([])
          return
        } else {
          // console.log($($(Trs).toArray()[1]).html());
          v_notices = v_notices.map(div_tag => {
            let p_tag_text = $($(div_tag).find('p').get()[0]).text().trim()
            let date = '01 January 2000'
            if (p_tag_text.match(/^\d+\s\w+\s\d+/)) {
              date = p_tag_text.match(/^\d+\s\w+\s\d+/)[0]
            }
            return {
              date: date,
              title: $($(div_tag).find('h4').get()[0]).text().trim(),
              url: $($(div_tag).find('a').get()[0]).attr('href').trim(),
            }
          })
        }
        // console.log(v_notices);
        lg(`END - getVerticalNotices`, log_tab + 1)
        resolve(v_notices)
        return
      } catch (err) {
        tools.catchError(err, 'getVerticalNotices', undefined, undefined, log_tab + 3)
        reject(`getVerticalNotices : ${err.message}`)
      }
    })()
  })
}

function getAllArticles(Notices, log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        let chunks = tools.arrayToChunks(Notices, gfinalConfig.irelandbondsnews.chunck_size, 2)
        let all_details = []
        for (let i = 0; i < chunks.length; i++) {
          if (i >= gfinalConfig.irelandbondsnews.chunks_limit) {
            lg(`Chunk limit [ ${gfinalConfig.irelandbondsnews.chunks_limit} ] reached !`, log_tab + 1)
            resolve(all_details)
            return
          }
          lg(``)
          lg(`Process chunk = ${i} | remaining = ${chunks.length - (i + 1)}`, log_tab + 1)
          all_details = all_details.concat(
            await Promise.all(
              chunks[i].map(async Notice => {
                return await getArticleBody(Notice, log_tab + 2)
              })
            )
          )
          all_details = [].concat.apply([], all_details) //flattern the array
          await tools.pleaseWait(
            gfinalConfig.irelandbondsnews.delay_min,
            gfinalConfig.irelandbondsnews.delay_max,
            2
          )
        }
        resolve(all_details)
        return
      } catch (err) {
        tools.catchError(err, 'getAllArticles', undefined, undefined, log_tab + 1)
        reject(`getAllArticles: ${err.message}`)
      }
    })()
  })
}

function getArticleBody(Notice, log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        // let page = await tor.downloadUrlUsingTor(
        //   "irelandbondsnews",
        //   Notice.url,
        //   undefined,
        //   undefined,
        //   undefined,
        //   gfinalConfig.irelandbondsnews.use_tor,
        //   undefined,
        //   undefined,
        //   undefined,
        //   undefined,
        //   undefined,
        //   undefined,
        //   undefined,
        //   undefined,
        //   log_tab + 1
        // );
        // let all_files;
        let page = await Ffetch.down(
          {
            source: 'irelandbondsnews',
            url: Notice.url,
            use_tor: true,
            // log_req: true
          },
          log_tab + 1
        )

        Notice.date = moment(Notice.date, 'D MMMM YYYY').format('YYYYMMDD')
        const $ = cheerio.load(page)
        $('ul.breadcrumbs').remove()
        $('ul.accordion.standard-text__internal-menu.internal-menu.hidden__l-up').remove()
        let article_div = $(`div.container__left`).get()
        let body = `<head><meta charset="utf-8"></head>`
        if (article_div.length < 1) {
          lg(`Article Div not found`, log_tab + 2, 'warn')
          body +=
            '<p> Could not load this Notice at time of extraction !, please manually check the source link below. Thanks !</p>'
        } else {
          body += $(article_div[0]).html()
          // .replace(/<ul.*>.*?<\/ul>/gi, "");
        }
        let docfile = await file.SaveDocxFile(
          {
            title: Notice.title,
            issuer: 'Irish Stock Exchange',
            date: Notice.date,
            time: '',
            url: Notice.url,
            body: body,
            prefix: 'IE_FI_NEWS_' + Notice.date,
            path: process.env.IRELANDBONDSNEWS_EXPORTED_FILES_PATH,
          },
          log_tab + 2
        )
        let htmlfile = await file.SaveHTMLFile(
          {
            title: Notice.title,
            issuer: 'Irish Stock Exchange',
            date: Notice.date,
            time: '',
            url: Notice.url,
            body: body,
            prefix: 'IE_FI_NEWS_' + Notice.date,
            path: process.env.IRELANDBONDSNEWS_EXPORTED_FILES_PATH,
          },
          log_tab + 2
        )
        Notice.docfile = docfile.filename
        Notice.htmlfile = htmlfile.filename
        Notice.size = htmlfile.size
        Notice.url = `<a href="${Notice.url}" target="_blank">Source</a>`
        resolve(Notice)
        return
      } catch (err) {
        tools.catchError(err, 'getArticleBody', true, 'general', log_tab + 4)
        reject(`getArticleBody: ${err.message}`)
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
