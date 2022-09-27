const cheerio = require('cheerio')
const tor = require(`../tor`)
const Faxios = require(`../Faxios`)

const tools = require(`../tools`)
const Ffetch = require(`../Ffetch`)
const moment = require('moment')

// /* global gfinalConfig */

//Simplify logging
const lg = tools.lg

const { clg, typeOf } = require(`../tools`)

module.exports = {
  getArticleBody,
  getMaltaNewsUpdates,
  getAnnouncementsFromPage,
  getAllAnnouncements,
}

var MALTA_headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:78.0) Gecko/20100101 Firefox/78.0',
  Accept: '*/*',
  'Accept-Language': 'en-US,en;q=0.5',
  //   "Content-Type": "application/json",
  //   Origin: "https://www.londonstockexchange.com",
  Connection: 'close',
  //   Referer:
  //     "https://www.londonstockexchange.com/news?tab=news-explorer&headlinetypes=&excludeheadlines=&period=custom&beforedate=20200721&afterdate=20200719&headlines=,16,75,79",
}

async function getMaltaNewsUpdates(source, log_tab) {
  try {
    lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
    let announcements = await getAllAnnouncements(source, 4, log_tab + 1)
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
    lg(`Extract announcements Type [${announcement_type}]`, log_tab, 'info', source)
    let all_data = new Array()
    let end_reached = false
    let page_id = 0
    while (!end_reached) {
      if (page_id > gfinalConfig.maltanews.maximum_pages) {
        lg(`Max pages [ ${gfinalConfig.maltanews.maximum_pages} ] reached ! `, log_tab + 1, 'info', source)
        return all_data
      }
      lg(`Get Malta News from page : ${page_id}`, log_tab + 1, 'info', source)
      let this_page_data = await getAnnouncementsFromPage(source, page_id, announcement_type, log_tab + 1)
      await tools.pleaseWait(
        gfinalConfig[source].delay_min,
        gfinalConfig[source].delay_max,
        log_tab + 1,
        source
      ) //Somehow the previous line returns an Object instead of array, so this line is necessary
      lg(`[${this_page_data.length}] News in this page`, log_tab + 1, 'info', source)
      if (this_page_data.length < 1) {
        return all_data
      }
      if (this_page_data.length == 0) {
        end_reached = true
        lg(`END reached`, log_tab + 1, 'info', source)
        lg(`Total News extracted= ${all_data.length}`, log_tab + 1, 'info', source)
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
    lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
    lg(`Extracting from page [${page_id}] Type = ${announcement_type}`, log_tab + 1, 'info', source)
    let url = `https://www.borzamalta.com.mt/Handlers/NewsAnnounArtHandler.aspx?page=${page_id}&type=${announcement_type}&_=1597686123161`

    let page = await Ffetch.down(
      {
        source,
        method: 'GET',
        url,
        id: `page ${page_id}`,
        json: true,
      },
      log_tab + 1
    )
    // let page = await tor.downloadUrlUsingTor(
    //   'maltaan',
    //   url,
    //   MALTA_headers,
    //   'GET',
    //   undefined,
    //   true,
    //   true,
    //   undefined,
    //   undefined,
    //   undefined,
    //   undefined,
    //   undefined,
    //   undefined,
    //   undefined,
    //   log_tab + 2,
    //   false,
    //   true
    // )
    let announcements = page.Items
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
    let chunks = tools.arrayToChunks(announcements, gfinalConfig.maltanews.chunck_size, 2)
    let all_details = []
    for (let i = 0; i < chunks.length; i++) {
      if (i >= gfinalConfig.maltanews.chunks_limit) {
        lg(`Chunk limit [ ${gfinalConfig[source].chunks_limit} ] reached !`, log_tab + 1, 'info', source)
        return all_details
      }
      lg(``, log_tab + 1, 'info', source)
      lg(
        `Process chunk = <b>${i}</b> | remaining = <b>${chunks.length - (i + 1)}</b>`,
        log_tab + 1,
        'info',
        source
      )

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
    return all_details
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}
async function getArticleBody(source, announcement, log_tab) {
  try {
    clg(announcement)
    announcement.url = `https://www.borzamalta.com.mt${announcement.FriendlyUrl}`
    let page = await Ffetch.down(
      {
        source,
        method: 'GET',
        url: announcement.url,
        id: `getArticleBody ${announcement.Id}`,
      },
      log_tab + 1
    )
    // let page = await tor.downloadUrlUsingTor(
    //   'maltaan',
    //   announcement.url,
    //   undefined,
    //   undefined,
    //   undefined,
    //   true,
    //   undefined,
    //   undefined,
    //   undefined,
    //   undefined,
    //   undefined,
    //   undefined,
    //   undefined,
    //   undefined,
    //   log_tab + 1
    // )
    // let body = "";
    const $ = cheerio.load(page)
    let file_div = $(`#ContentPlaceHolder1_dvDownloadDoc`).get()
    if (file_div.length < 1) {
      lg(`File Div not found`, log_tab + 1, 'warn', source)
      // body =
      //   "<p> Could not load this announcement at time of extraction !, please manually check the source link below. Thanks !</p>";
      announcement.filename = null
      announcement.file_url = null
    } else {
      let file_url = $(file_div[0]).attr('onclick')
      // console.log(file_url)
      if (file_url) {
        // let regex = RegExp(/(?:')(.*)(?:')/);
        let regex = new RegExp(/(?:')(.*)(?:')/)
        let matches = file_url.match(regex)
        // let matches = regex.exec(announcement.file_url);
        // console.log(matches);
        if (Array.isArray(matches) && matches.length > 0) {
          announcement.file_url = matches[1].replace('http', 'https')
          let file_data = await Faxios.down(
            {
              id: `DownPDF [${announcement.Id}]`,
              source,
              url: announcement.file_url,
              responseType: 'arraybuffer',
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:94.0) Gecko/20100101 Firefox/94.0',
                Accept:
                  'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                Connection: 'keep-alive',
                Cookie: '_ga=GA1.3.1679728374.1636639151; _gid=GA1.3.1104902755.1636822305',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
              },
            },
            log_tab + 2
          )
          // clg(file_data)
          // let file_data = await tor.downloadUrlUsingTor(
          //   'maltaan_file',
          //   announcement.file_url,
          //   undefined,
          //   'GET',
          //   undefined,
          //   true,
          //   undefined,
          //   undefined,
          //   undefined,
          //   undefined,
          //   undefined,
          //   undefined,
          //   true,
          //   undefined,
          //   log_tab + 3
          // )
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
            .substring(0, 10)}_${announcement.Id}.pdf`
          await tools.writeBinaryFile(
            `${process.env.MALTA_NEWS_EXPORTED_FILES_PATH}${file_name}`,
            file_data.data
          )
          announcement.filename = file_name
        }
      }
    }
    return {
      Date: announcement.Date,
      title: announcement.Name,
      Description: announcement.Summary,
      type: `News`,
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
//         lg(`Extracted ${announcements.length} News`, 1);
//         resolve(announcements);
//         return;
//       } catch (err) {
//         lg(`getAnnouncementsFromPage : ${err.message}`, 3, "error");
//         reject(`getAnnouncementsFromPage : ${err.message}`);
//       }
//     })();
//   });
// }
