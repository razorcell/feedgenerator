const moment = require('moment')
const Ffetch = require(`../Ffetch`)

const tools = require(`../tools`)
const file = require(`../file`)
const scraping = require(`../scraping`)

const { clg } = require(`../tools`)
//Simplify logging
const lg = tools.lg

module.exports = {
  getSouthAfricaSENS,
  getArticleBody,
  getNoticesForDateRange,
  getAllArticles,
}

async function getSouthAfricaSENS(source, datevalue, log_tab) {
  try {
    lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
    let params = {
      start: moment(datevalue, 'YYYYMMDD').format('D MMM YYYY'),
      end: moment(datevalue, 'YYYYMMDD').format('D MMM YYYY'),
    }
    let Notices = await getNoticesForDateRange(source, params, log_tab + 1)
    let articles = await getAllArticles(Notices, source, 'MY_FI_CA', log_tab + 1)
    lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
    return articles
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}

async function getNoticesForDateRange(source, params, log_tab) {
  try {
    lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
    lg(`Extracting For [${params.start} - ${params.end}]`, log_tab, 'info', source)
    let page = await Ffetch.down(
      {
        source: source,
        url: encodeURI(
          `http://www.sharedata.co.za/V2/Controls/Toolbox/SensSearch/SSJSONdata.aspx?date=${params.start}&enddate=${params.end}&keyword=&sharecode=&sectorcode=`
        ),
        json: true,
        id: `getNoticesForDateRange`,
      },
      log_tab + 1
    )
    let Trs = await scraping.getTagsFromPage(
      {
        target_block: 'table',
        target_tags: 'tr',
        body: page[0],
        tag_return_type: 'html',
        rows_max: 800,
        // return_type: 'object',
      },
      log_tab + 1,
      source
    )
    Trs = (
      await Promise.all(
        Trs.map(async (tr) => {
          const onClickVal = await scraping.getAttrFromHTMLTag(
            {
              html: `<table>${tr}</table>`,
              selector: 'td',
              attr: 'onclick',
            },
            log_tab + 1
          )
          if (onClickVal != undefined) {
            let regx = new RegExp(/(\d+)/)
            const onClick = onClickVal
            return {
              subject: await scraping.getTextFromHTMLTag({ html: tr, selector: 'td' }),
              onclick: onClick,
              id: regx.exec(onClick)[0],
            }
          }
        })
      )
    ).filter(tr => tr != null)
    return Trs
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}

async function getAllArticles(Notices, source, file_prefix, log_tab) {
  try {
    let chunks = tools.arrayToChunks(Notices, gfinalConfig[source].chunck_size, log_tab + 1, source)
    let all_details = []
    for (let i = 0; i < chunks.length; i++) {
      if (i >= gfinalConfig[source].chunks_limit) {
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
          chunks[i].map(async Notice => {
            return await getArticleBody(Notice, source, file_prefix, log_tab + 2)
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

async function getArticleBody(notice, source, file_prefix, log_tab) {
  try {
    notice.url = `http://www.sharedata.co.za/V2/Controls/Shared/Notes/NotesJSONdata.aspx?id=${notice.id}&version=0`
    let page = await Ffetch.down(
      {
        source: source,
        url: notice.url,
        json: true,
        id: notice.id,
      },
      log_tab + 1
    )
    // await file.writeToFile('downloads/sens1.html', page[0][3]);
    // await file.writeToFile('downloads/sens2.txt', page[0][3]);
    // page[0][3] = `<span>` + page[0][3];
    // page[0][3] += `</span>`;
    notice.date = moment(page[0][0].split(',')[0].trim(), 'ddd D MMM YYYY').format('YYMMDD')
    notice.time = moment(page[0][0].split(',')[1].trim(), 'H:mmA').format('HH:mm')
    page[0][3] = page[0][3].replace(/“|”/gm, '"')
    // clg(page[0][3]);
    let HTML_details
    HTML_details = {
      title: `${notice['id']} - ${notice['subject']}`,
      issuer: `${notice.id}`,
      date: notice.date,
      time: notice.time,
      url: notice.url,
      body: page[0][3],
      prefix: file_prefix,
      path: process.env.SAFRICASENS_EXPORTED_FILES_PATH,
      rem_comment: false,
      filename_date: true,
      rem_line_break: false,
    }
    let HTML_file_info = await file.SaveHTMLFile(HTML_details, log_tab + 1, source)
    let Docx_file_info = await file.SaveDocxFile(HTML_details, log_tab + 1, source)
    return {
      date: notice.date,
      subject: notice.subject,
      docxfilename: Docx_file_info.filename,
      htmlfilename: HTML_file_info.filename,
      source: `<a href="http://www.sharedata.co.za/v2/Scripts/SENS.aspx?id=${notice.id}" target="_balnk">URL</a>`,
      size: HTML_file_info.size,
      id: notice.id,
    }
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
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
