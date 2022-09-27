const cheerio = require('cheerio')
const tor = require(`../tor`)
const tools = require(`../tools`)
const fileModule = require(`../file`)
const puppeteer = require('puppeteer')
const htmlDocx = require('html-docx-js-typescript')
const moment = require('moment')
var HtmlDecode = require('decode-html')
const { exitOnError } = require('winston')
const Ffetch = require(`../Ffetch`)

//Simplify logging
const lg = tools.lg

const { clg, typeOf } = require(`../tools`)

module.exports = {
  getArticleBody,
  getMaltaANUpdates,
  getAnnouncementsFromPage,
  getAllAnnouncements,
}

async function getMaltaANUpdates(source, log_tab) {
  try {
    lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
    let announcements = await getAllAnnouncements(source, 3, log_tab + 1)
    let articles = await getAllArticles(source, announcements, log_tab + 1)
    lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
    return articles
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}
async function getAllAnnouncements(source, announcement_type, log_tab) {
  try {
    lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
    lg(`Extract announcements Type [${announcement_type}]`, log_tab + 1, 'info', source)
    let all_data = new Array()
    let end_reached = false
    let page_id = 0
    while (!end_reached) {
      if (page_id > gfinalConfig[source].maximum_pages) {
        lg(`Max pages [ ${gfinalConfig[source].maximum_pages} ] reached ! `, log_tab + 2, 'info', source)
        return all_data
      }
      lg(`Get Malta Announcements from page : ${page_id}`, log_tab + 2, 'info', source)
      let this_page_data = await getAnnouncementsFromPage(source, page_id, announcement_type, log_tab + 1)
      await tools.pleaseWait(
        gfinalConfig[source].delay_min,
        gfinalConfig[source].delay_max,
        log_tab + 1,
        source
      )
      //Somehow the previous line returns an Object instead of array, so this line is necessary
      lg(`[${this_page_data.length}] Announcements in this page`, log_tab + 2, 'info', source)
      if (this_page_data.length < 1) {
        lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        return all_data
      }
      if (this_page_data.length == 0) {
        end_reached = true
        lg(`END REACHED`, log_tab + 3, 'info', source)
        lg(`Total Announcements extracted= ${all_data.length}`, log_tab + 3, 'info', source)
        lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        return all_data
      } else {
        all_data = all_data.concat(this_page_data)
        page_id++
      }
    }
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}
async function getAnnouncementsFromPage(source, page_id, announcement_type, log_tab) {
  try {
    lg(`Extracting from page [${page_id}]`, log_tab + 1, 'info', source)
    let url = `https://www.borzamalta.com.mt/Handlers/NewsAnnounArtHandler.aspx?page=${page_id}&type=${announcement_type}&_=1597686123161`
    const body = await Ffetch.down(
      {
        id: 'getAnnouncementsFromPage',
        source,
        url: url,
        json: true,
      },
      log_tab + 1
    )
    let announcements = body.Items
    announcements = announcements.map(announcement => {
      if (announcement.Image) {
        delete announcement.Image
      }
      return announcement
    })
    return announcements
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}

async function getAllArticles(source, announcements, log_tab) {
  try {
    lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
    let chunks = tools.arrayToChunks(announcements, gfinalConfig[source].chunck_size, log_tab + 1, source)
    let all_details = []
    for (let i = 0; i < chunks.length; i++) {
      if (i >= gfinalConfig[source].chunks_limit) {
        lg(`Chunk limit [ ${gfinalConfig[source].chunks_limit} ] reached !`, log_tab + 1, 'info', source)
        lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        return all_details
      }
      lg(``, log_tab + 1, 'info', source)
      lg(`Process chunk = ${i} | remaining = ${chunks.length - (i + 1)}`, log_tab + 1, 'info', source)

      all_details = all_details.concat(
        await Promise.all(
          chunks[i].map(async announcement => {
            return await getArticleBody(source, announcement, log_tab + 2)
          })
        )
      )
      all_details = [].concat.apply([], all_details) //flattern the array
      await tools.pleaseWait(
        gfinalConfig[source].delay_min,
        gfinalConfig[source].delay_max,
        log_tab + 1,
        source
      )
    }
    lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
    return all_details
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}
async function getArticleBody(source, announcement, log_tab) {
  try {
    announcement.url = `https://www.borzamalta.com.mt${announcement.FriendlyUrl}`
    const output = await Ffetch.down(
      {
        id: `getArticleBody [${announcement.Code}]`,
        source,
        url: announcement.url,
      },
      log_tab + 1
    )
    let body = ''
    const $ = cheerio.load(output)
    let file_div = $(`#ContentPlaceHolder1_dvDownloadDoc`).get()
    if (file_div.length < 1) {
      lg(`File Div not found`, log_tab + 2, 'warn', source)
      body =
        '<p> Could not load this announcement at time of extraction !, please manually check the source link below. Thanks !</p>'
      announcement.filename = null
      announcement.file_url = null
    } else {
      let file_url = $(file_div[0]).attr('onclick')
      // console.log(file_url);
      if (file_url) {
        // let regex = RegExp(/(?:')(.*)(?:')/);
        let regex = new RegExp(/(?:')(.*)(?:')/)
        let matches = file_url.match(regex)
        // let matches = regex.exec(announcement.file_url);
        // console.log(matches);
        if (Array.isArray(matches) && matches.length > 0) {
          announcement.file_url = matches[1]
          announcement.Date = moment(announcement.Date, 'DD/MMM/YYYY').format('YYYYMMDD')
          let file_name = `MT_FI_CA_${announcement.Date}_${announcement.Summary.replace(
            /[^a-z|A-Z|0-9]/gm,
            `-`
          )
            .substring(0, 10)
            .trim()
            .replace(/-+/gm, `-`)}_${announcement.Name.replace(/[^a-z|A-Z|0-9]/gm, `-`)
            .trim()
            .replace(/-+/gm, `-`)
            .substring(0, 10)}_${announcement.Code}.pdf`
          // await tools.writeBinaryFile(
          //   `${process.env.MALTA_AN_EXPORTED_FILES_PATH}${file_name}`,
          //   file_data.body
          // )
          const filedata = await Ffetch.downloadBinaryFile(
            'maltaan',
            {
              shortFileName: file_name,
              savePath: process.env.MALTA_AN_EXPORTED_FILES_PATH,
              url: announcement.file_url,
            },
            log_tab + 1
          )
          announcement.filename = filedata.shortName
        }
      }
    }
    return {
      Date: announcement.Date,
      issuer: announcement.Summary,
      title: announcement.Name,
      type: `Announcement`,
      announcement_url: `<a href="${announcement.url}" target="_blank">Goto_Source</a>`,
      file_url: `<a href="${announcement.file_url}" target="_blank">File_URL</a>`,
      file_name: announcement.filename,
    }
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
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
