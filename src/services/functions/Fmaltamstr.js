const cheerio = require('cheerio')
const tor = require(`../tor`)
const tools = require(`../tools`)
const fileModule = require(`../file`)
const puppeteer = require('puppeteer')
const htmlDocx = require('html-docx-js-typescript')
const moment = require('moment')
var HtmlDecode = require('decode-html')
const { exitOnError } = require('winston')
const file = require('../file')
//Simplify logging
const lg = tools.lg
// const XLSX = require("xlsx");

const { clg, typeOf } = require(`../tools`)

module.exports = {
  // getArticleBody,
  // getMaltaNewsUpdates,
  // getAnnouncementsFromPage,
  // getAllAnnouncements,
  downloadMaltaMSTRFile,
}

// var MALTA_headers = {
//   "User-Agent":
//     "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:78.0) Gecko/20100101 Firefox/78.0",
//   Accept: "*/*",
//   "Accept-Language": "en-US,en;q=0.5",
//   //   "Content-Type": "application/json",
//   //   Origin: "https://www.londonstockexchange.com",
//   Connection: "close",
//   //   Referer:
//   //     "https://www.londonstockexchange.com/news?tab=news-explorer&headlinetypes=&excludeheadlines=&period=custom&beforedate=20200721&afterdate=20200719&headlines=,16,75,79",
// };
function downloadMaltaMSTRFile(log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        lg(`START - downloadMaltaMSTRFile`, log_tab + 1)
        let file_data = await tor.downloadUrlUsingTor(
          'maltaan_file',
          `https://www.borzamalta.com.mt/download/Official_list/official_list.xls`,
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
          log_tab + 3
        )
        let date = moment().format('YYYYMMDD')
        let file_name = `MT_FI_GOV_${date}.xls`
        let file_name_csv = `MT_FI_GOV_${date}.csv`

        let file_name_compatible = `${date}-MaltaMSTR.xls`
        let full_path = `${process.env.MALTA_MSTR_EXPORTED_FILES_PATH}${file_name_compatible}`
        await tools.writeBinaryFile(`${full_path}`, file_data.body)
        let CSV_file_full_path = await file.convertExcelToCSV(
          full_path,
          `${date}-MaltaMSTR`,
          log_tab + 2,
          false,
          ';',
          `${process.env.MALTA_MSTR_EXPORTED_FILES_PATH}`
        )
        lg(`END - downloadMaltaMSTRFile`, log_tab + 1)
        resolve(CSV_file_full_path)
        return
      } catch (err) {
        tools.catchError(err, 'downloadMaltaMSTRFile', undefined, undefined, log_tab + 2)
        reject(`downloadMaltaMSTRFile: ${err.message}`)
      }
    })()
  })
}

// function getMaltaNewsUpdates() {
//   return new Promise(function (resolve, reject) {
//     (async () => {
//       try {
//         lg(`getMaltaNewsUpdates: Get Updates `, 1);
//         let announcements = await getAllAnnouncements(4, 2);
//         let articles = await getAllArticles(announcements, 2);
//         lg(`MaltaNewS: Finished`, 1);
//         resolve(articles);
//         return;
//       } catch (err) {
//         tools.catchError(err, "getMaltaNewsUpdates", undefined, undefined, 3);
//         reject(`getMaltaNewsUpdates : ${err.message}`);
//       }
//     })();
//   });
// }
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
// function getAnnouncementsFromPage(page_id, announcement_type, log_tab) {
//   return new Promise(function (resolve, reject) {
//     (async () => {
//       try {
//         lg(
//           `Extracting from page [${page_id}] Type = ${announcement_type}`,
//           log_tab + 1
//         );
//         let url = `https://www.borzamalta.com.mt/Handlers/NewsAnnounArtHandler.aspx?page=${page_id}&type=${announcement_type}&_=1597686123161`;
//         let page = await tor.downloadUrlUsingTor(
//           "maltaan",
//           url,
//           MALTA_headers,
//           "GET",
//           undefined,
//           true,
//           true,
//           undefined,
//           undefined,
//           undefined,
//           undefined,
//           undefined,
//           undefined,
//           undefined,
//           log_tab + 2,
//           false,
//           true
//         );
//         let announcements = page.body.Items;
//         announcements = announcements.map((announcement) => {
//           if (announcement.Image) {
//             delete announcement.Image;
//           }
//           return announcement;
//         });
//         resolve(announcements);
//         return;
//       } catch (err) {
//         tools.catchError(
//           err,
//           "getAnnouncementsFromPage",
//           true,
//           "general",
//           log_tab + 4
//         );
//         reject(`getAnnouncementsFromPage : ${err.message}`);
//       }
//     })();
//   });
// }

// function getAllArticles(announcements, log_tab) {
//   return new Promise(function (resolve, reject) {
//     (async () => {
//       try {
//         let chunks = tools.arrayToChunks(
//           announcements,
//           gfinalConfig.maltanews.chunck_size,
//           2
//         );
//         let all_details = [];
//         for (let i = 8; i < chunks.length; i++) {
//           if (i >= gfinalConfig.maltanews.chunks_limit) {
//             lg(
//               `Chunk limit [ ${gfinalConfig.maltanews.chunks_limit} ] reached !`,
//               log_tab + 1
//             );
//             resolve(all_details);
//             return;
//           }
//           lg(``);
//           lg(
//             `Process chunk = ${i} | remaining = ${chunks.length - (i + 1)}`,
//             log_tab + 1
//           );

//           all_details = all_details.concat(
//             await Promise.all(
//               chunks[i].map(async (announcement) => {
//                 return await getArticleBody(announcement, log_tab + 2);
//               })
//             )
//           );
//           all_details = [].concat.apply([], all_details); //flattern the array
//           await tools.pleaseWait(
//             gfinalConfig.maltanews.delay_min,
//             gfinalConfig.maltanews.delay_max,
//             2
//           );
//         }
//         resolve(all_details);
//         return;
//       } catch (err) {
//         tools.catchError(
//           err,
//           "getAllArticles",
//           undefined,
//           undefined,
//           log_tab + 1
//         );
//         reject(`getAllArticles: ${err.message}`);
//       }
//     })();
//   });
// }
// function getArticleBody(announcement, log_tab) {
//   return new Promise(function (resolve, reject) {
//     (async () => {
//       try {
//         announcement.url = `https://www.borzamalta.com.mt${announcement.FriendlyUrl}`;
//         let page = await tor.downloadUrlUsingTor(
//           "maltaan",
//           announcement.url,
//           undefined,
//           undefined,
//           undefined,
//           true,
//           undefined,
//           undefined,
//           undefined,
//           undefined,
//           undefined,
//           undefined,
//           undefined,
//           undefined,
//           log_tab + 1
//         );
//         // let body = "";
//         const $ = cheerio.load(page.body);
//         let file_div = $(`#ContentPlaceHolder1_dvDownloadDoc`).get();
//         if (file_div.length < 1) {
//           lg(`File Div not found`, log_tab + 2, "warn");
//           // body =
//           //   "<p> Could not load this announcement at time of extraction !, please manually check the source link below. Thanks !</p>";
//           announcement.filename = null;
//           announcement.file_url = null;
//         } else {
//           let file_url = $(file_div[0]).attr("onclick");
//           // console.log(file_url);
//           if (file_url) {
//             // let regex = RegExp(/(?:')(.*)(?:')/);
//             let regex = new RegExp(/(?:')(.*)(?:')/);
//             let matches = file_url.match(regex);
//             // let matches = regex.exec(announcement.file_url);
//             // console.log(matches);
//             if (Array.isArray(matches) && matches.length > 0) {
//               announcement.file_url = matches[1];
//               let file_data = await tor.downloadUrlUsingTor(
//                 "maltaan_file",
//                 announcement.file_url,
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
//                 log_tab + 3
//               );
//               announcement.Date = moment(
//                 announcement.Date,
//                 "DD/MMM/YYYY"
//               ).format("YYYYMMDD");
//               let file_name = `MT_FI_CA_${
//                 announcement.Date
//               }_${announcement.Summary.replace(/[^a-z|A-Z|0-9]/gm, `-`)
//                 .substring(0, 10)
//                 .trim()
//                 .replace(/-+/gm, `-`)}_${announcement.Name.replace(
//                 /[^a-z|A-Z|0-9]/gm,
//                 `-`
//               )
//                 .trim()
//                 .replace(/-+/gm, `-`)
//                 .substring(0, 10)}_${announcement.Id}.pdf`;
//               await tools.writeBinaryFile(
//                 `${process.env.MALTA_NEWS_EXPORTED_FILES_PATH}${file_name}`,
//                 file_data.body
//               );
//               announcement.filename = file_name;
//             }
//           }
//         }
//         resolve({
//           Date: announcement.Date,
//           title: announcement.Name,
//           Description: announcement.Summary,
//           type: `News`,
//           announcement_url: `<a href="${announcement.url}" target="_blank">Goto_Source</a>`,
//           file_url: `<a href="${announcement.file_url}" target="_blank">File_URL</a>`,
//           file_name: announcement.filename,
//         });
//         return;
//       } catch (err) {
//         tools.catchError(
//           err,
//           "getArticleBody",
//           undefined,
//           undefined,
//           log_tab + 3
//         );
//         reject(`getArticleBody: ${err.message}`);
//       }
//     })();
//   });
// }

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
