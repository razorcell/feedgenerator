const cheerio = require('cheerio')
const tor = require(`../tor`)
const tools = require(`../tools`)
const fileModule = require(`../file`)

const file = require('../file')

//Simplify logging
const lg = tools.lg

// const { clg, typeOf } = require(`../tools`);

module.exports = {
  getArticleBody,
  getInvestigateUpdates,
  getAnnouncementsForDate,
}

var INVESTIGATE_headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:78.0) Gecko/20100101 Firefox/78.0',
  Accept: `text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8`,
  'Accept-Language': 'en-US,en;q=0.5',
  //   "Content-Type": "application/json",
  //   Origin: "https://www.londonstockexchange.com",
  Connection: 'close',
  Referer: 'https://www.investegate.co.uk/Archive.aspx',
  Cookie:
    '__cfduid=d67cff1cd6516bcc85ad92efe4bba93621597931753; Inv_DisplayControl=1,2,3,4; IGUserSession=f165993f-46a1-4162-8db1-7b5ecabf7d97; ai_user=IfoMu|2020-08-20T14:54:08.591Z; utype=PI; uflag=yes; ai_session=SR7Bc|1597935249407|1597935249407; _ga=GA1.3.2130213174.1597935251; _gid=GA1.3.1196724521.1597935251; _gat_UA-10589217-1=1; __hstc=51450998.3e686c8455ae49b8af556db72fbd02c1.1597935251897.1597935251897.1597935251897.1; hubspotutk=3e686c8455ae49b8af556db72fbd02c1; __hssrc=1; __hssc=51450998.2.1597935251897; sc_is_visitor_unique=rx11968045.1597935278.9EBD5E42CEA64F623338DA004E3C699E.1.1.1.1.1.1.1.1.1',
  //   Referer:
  //     "https://www.londonstockexchange.com/news?tab=news-explorer&headlinetypes=&excludeheadlines=&period=custom&beforedate=20200721&afterdate=20200719&headlines=,16,75,79",
}

function getInvestigateUpdates(datevalue) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        lg(`START - getInvestigateUpdates`, 1)
        let announcements = await getAnnouncementsForDate(datevalue, 2)
        let articles = await getAllArticles(announcements, datevalue, 2)
        let params = {
          articles: articles,
          skeleton: {
            date: '',
            time: ``,
            issuer: ``,
            title: ``,
            url: ``,
            filename: ``,
            size: ``,
          },
          title: 'Investigate.co.uk Announcements',
          desired_date: datevalue,
          file_prefix: 'GB_FI_UKwire',
          export_path: process.env.INVESTIGATE_EXPORTED_FILES_PATH,
        }
        let global_files = await file.generateGlobalFiles(params, 2)
        //Remove the HTML bodies from the articles
        articles = articles.map(article => {
          delete article.html
          article.url = `<a href="${article.url}" target="_blank">GoTo</a>`
          return article
        })
        articles.push(global_files.html)
        articles.push(global_files.docx)

        //Generate Global file
        lg(`END - getInvestigateUpdates`, 1)
        resolve(articles)
        return
      } catch (err) {
        tools.catchError(err, 'getInvestigateUpdates', undefined, undefined, 3)
        reject(`getInvestigateUpdates : ${err.message}`)
      }
    })()
  })
}

// function getAllAnnouncements(announcement_type, log_tab) {
//   return new Promise(function (resolve, reject) {
//     (async () => {
//       try {
//         lg(`Extract announcements Type [${announcement_type}]`, log_tab + 1);
//         let all_data = new Array();
//         let end_reached = false;
//         let page_id = 0;
//         while (!end_reached) {
//           if (page_id > gfinalConfig.maltanews.maximum_pages) {
//             lg(
//               `Max pages [ ${gfinalConfig.maltanews.maximum_pages} ] reached ! `,
//               log_tab + 2
//             );
//             resolve(all_data);
//             return;
//           }
//           lg(`Get Malta News from page : ${page_id}`, log_tab + 2);
//           let this_page_data = await getAnnouncementsFromPage(
//             page_id,
//             announcement_type,
//             log_tab + 1
//           );
//           await tools.pleaseWait(2, 2, log_tab + 3);
//           //Somehow the previous line returns an Object instead of array, so this line is necessary
//           lg(`[${this_page_data.length}] News in this page`, log_tab + 2);
//           if (this_page_data.length < 1) {
//             resolve(all_data);
//             return;
//           }
//           if (this_page_data.length == 0) {
//             end_reached = true;
//             lg(`END REACHED`, log_tab + 3);
//             lg(`Total News extracted= ${all_data.length}`, log_tab + 3);
//             resolve(all_data);
//             return;
//           } else {
//             all_data = all_data.concat(this_page_data);
//             page_id++;
//           }
//         }
//       } catch (err) {
//         tools.catchError(
//           err,
//           "getAllArticles",
//           undefined,
//           undefined,
//           log_tab + 4
//         );
//         reject(`getAllArticles: ${err.message}`);
//       }
//     })();
//   });
// }
function getAnnouncementsForDate(datevalue, log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        lg(`Extracting from date [${datevalue}]`, log_tab + 1)
        let url = `https://www.investegate.co.uk/Index.aspx?date=${datevalue}&arch=1&limit=-1`
        let page = await tor.downloadUrlUsingTor(
          'maltaan',
          url,
          INVESTIGATE_headers,
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
        let announcements = []
        const $ = cheerio.load(page.body)
        let Trs = $(`#announcementList > tbody > tr`).get()
        if (!Array.isArray(Trs) || Trs.length < 1) {
          lg(`No Announcements found in this date`, log_tab + 3, 'warn')
        } else {
          // console.log($($(Trs).toArray()[1]).html());
          announcements = $(Trs).map((i, tr) => {
            let tds = $(tr).find('td').get()
            if (!Array.isArray(tds) || tds.length != 6) {
              lg(`Invalid Row[${i}]`, log_tab + 3, 'warn')
              // return {};
            } else {
              return {
                date: datevalue,
                time: $(tds[0])
                  .text()
                  .replace(/[\t|\n]+/g, '')
                  .trim(),
                source: $($(tds[1]).find('a')[0])
                  .text()
                  .replace(/[\t|\n]+/g, '')
                  .trim(),
                issuer: $($(tds[4]).find('a strong')[0])
                  .text()
                  .replace(/[\t|\n]+/g, '')
                  .trim(),
                title: $($(tds[5]).find('a')[0])
                  .text()
                  .replace(/[\t|\n]+/g, '')
                  .trim(),
                url: `https://www.investegate.co.uk${$($(tds[5]).find('a')[0]).attr('href')}`,
              }
            }
          })
        }
        // console.log();
        resolve(announcements.toArray())
        return
      } catch (err) {
        tools.catchError(err, 'getAnnouncementsForDate', true, 'general', log_tab + 4)
        reject(`getAnnouncementsForDate : ${err.message}`)
      }
    })()
  })
}

function getAllArticles(announcements, datevalue, log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        let chunks = tools.arrayToChunks(announcements, gfinalConfig.investigate.chunck_size, 2)
        let all_details = []
        for (let i = 0; i < chunks.length; i++) {
          if (i >= gfinalConfig.investigate.chunks_limit) {
            lg(`Chunk limit [ ${gfinalConfig.investigate.chunks_limit} ] reached !`, log_tab + 1)
            resolve(all_details)
            return
          }
          lg(``)
          lg(`Process chunk = ${i} | remaining = ${chunks.length - (i + 1)}`, log_tab + 1)

          all_details = all_details.concat(
            await Promise.all(
              chunks[i].map(async announcement => {
                return await getArticleBody(announcement, datevalue, log_tab + 2)
              })
            )
          )
          all_details = [].concat.apply([], all_details) //flattern the array
          await tools.pleaseWait(gfinalConfig.investigate.delay_min, gfinalConfig.investigate.delay_max, 2)
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

function getArticleBody(announcement, datevalue, log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        // announcement.url = `https://www.borzamalta.com.mt${announcement.FriendlyUrl}`;
        // console.log(announcement);
        let page = await tor.downloadUrlUsingTor(
          'maltaan',
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
        let all_files
        const $ = cheerio.load(page.body)
        let article_div = $(`div#ArticleContent`).get()
        if (article_div.length < 1) {
          lg(`Article Div not found`, log_tab + 2, 'warn')
          // body =
          //   "<p> Could not load this announcement at time of extraction !, please manually check the source link below. Thanks !</p>";
          announcement.filename = null
          announcement.file_url = null
        } else {
          let body = $(article_div[0]).html()
          announcement.html = await file.buildHTMLDoc(
            announcement.title,
            announcement.issuer,
            announcement.date,
            announcement.time,
            announcement.url,
            body,
            log_tab + 2
          )
          announcement.size = await file.getFileSize(announcement.html)
          let file_name = await file.generateFileName(
            'GB_FI',
            announcement.title,
            announcement.issuer,
            announcement.date,
            announcement.size,
            'html',
            log_tab + 3
          )
          announcement.filename = file_name
          await fileModule.writeToFile(
            `${process.env.INVESTIGATE_EXPORTED_FILES_PATH}${file_name}`,
            announcement.html
          )
          //Get PDF files inside announcement
          let pdf_files = await downloadPDFsInsideArticle(announcement, body, datevalue, log_tab + 2)
          if (pdf_files.length == 0) {
            resolve([]) //If no PDF files found just return empty array
            return
          }
          pdf_files = pdf_files.map(function (pdf_file) {
            return {
              date: announcement.date,
              time: announcement.time,
              source: announcement.source,
              issuer: announcement.issuer,
              title: announcement.title,
              url: announcement.url,
              html: ``,
              size: pdf_file.size,
              filename: pdf_file.file_name,
            }
          })
          all_files = [...pdf_files]
          all_files.push(announcement)
        }
        resolve(all_files)
        return
      } catch (err) {
        tools.catchError(err, 'getArticleBody', true, 'general', log_tab + 4)
        reject(`getArticleBody: ${err.message}`)
      }
    })()
  })
}

function downloadPDFsInsideArticle(announcement, body, log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        let regex = new RegExp(/http:\/\/www\.rns-pdf\.londonstockexchange\.com\/rns\/\S+?\.pdf/, 'gm')
        let PDFR_links = [...body.matchAll(regex)].map(amatch => {
          //Convert to Array and Remove unnecessary match details
          return amatch[0]
        })
        var uSet = new Set(PDFR_links)
        PDFR_links = [...uSet] // Remove duplicates
        let short_files_names = []
        if (PDFR_links.length > 0) {
          short_files_names = await Promise.all(
            PDFR_links.map(async function (url) {
              // console.log(url);
              regex = new RegExp(/(?:\/rns\/)(.*)(?:\.pdf)/, 'g')
              pdf_file_names = [...url.matchAll(regex)].map(amatch => {
                return amatch[1] //Convert to Array and Only return first capturing group
              })
              if (Array.isArray(pdf_file_names) && pdf_file_names.length > 0) {
                // console.log(pdf_file_names);
                let pdf_file_name = pdf_file_names[0]
                // console.log(pdf_file_name);
                // short_files_names.push(`${pdf_file_name}`);
                let file_data = await tor.downloadUrlUsingTor(
                  'investigate_pdf',
                  url,
                  undefined,
                  'GET',
                  undefined,
                  true,
                  undefined,
                  undefined,
                  undefined,
                  undefined,
                  undefined,
                  undefined,
                  true,
                  undefined,
                  log_tab + 2
                )

                let file_name = `INVESTIGATE_${announcement.date}_${pdf_file_name
                  .replace(/[^a-z|A-Z|0-9]/gm, `-`)
                  .trim()
                  .replace(/-+/gm, `-`)
                  .substring(0, 5)}.pdf`
                await tools.writeBinaryFile(
                  `${process.env.INVESTIGATE_EXPORTED_FILES_PATH}${file_name}`,
                  file_data.body
                )
                return {
                  file_name: file_name,
                  size: await file.getFileSize(file_data.body, log_tab + 2),
                }
              } else {
                lg(`Could not extract file name from URL${url}`, log_tab + 3, 'warn')
              }
              // }
            })
          )
        } else {
          lg(`No PDF links found in this article`, log_tab + 3, 'warn')
        }
        resolve(short_files_names)
        return
      } catch (err) {
        tools.catchError(err, 'downloadPDFInsideArticle', true, 'general', log_tab + 3)
        reject(`downloadPDFInsideArticle: ${err.message}`)
      }
    })()
  })
}
