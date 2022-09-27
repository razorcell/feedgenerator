const cheerio = require('cheerio')
const moment = require('moment')
const Ffetch = require(`../Ffetch`)

const tools = require(`../tools`)
const file = require(`../file`)
const scraping = require(`../scraping`)

const { clg } = require(`../tools`)
//Simplify logging
const lg = tools.lg

module.exports = {
  getMalasiaAuctions,
  getArticleBody,
  getAllNotices,
  getNoticesFromPage,
  getAllArticles,
}

function getMalasiaAuctions(source, log_tab) {
  return new Promise(function getMalasiaAuctions(resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        let params = {
          label: 'AUCTIONS',
          taskID: 'PB050400',
          screenId: 'PB050400',
          txtHeader: `Tender+DescriptionTender+CodeStock+CodeIssuerIssue+DateFacility+Agent`,
          txtSortingColumn: `5`,
          txtSortingOrder: `-1`,
        }
        let Notices = await getAllNotices(source, params, log_tab + 1)
        let today = moment().format('YYMMDD')
        let articles = await getAllArticles(Notices, source, 'MY_FI_BIH', params, today, log_tab + 1)
        let global_files = await generateGlobalFiles(source, articles, 'MY_FI_BIH', today, log_tab + 1)
        articles = articles.map(article => {
          delete article.body
          delete article.html_details
          return article
        })
        articles.push(global_files.docx)
        articles.push(global_files.html)
        lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
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
        lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        let all_data = new Array()
        let end_reached = false
        let page_id = 1
        while (!end_reached) {
          if (page_id > gfinalConfig[source].maximum_pages) {
            lg(`Max pages [ ${gfinalConfig[source].maximum_pages} ] reached ! `, log_tab + 2, 'info', source)
            lg(`Total Notices extracted= ${all_data.length}`, log_tab + 2, 'info', source)
            resolve(all_data)
            return
          }
          lg(`Get [${source}] Notices from page : ${page_id}`, log_tab + 2, 'info', source)
          let this_page_data = await getNoticesFromPage(page_id, source, params, log_tab + 3)
          await tools.pleaseWait(gfinalConfig[source].delay_min, gfinalConfig[source].delay_max, log_tab + 3)
          lg(`[${this_page_data.length}] Notices in this page`, log_tab + 2, 'info', source)
          all_data = all_data.concat(this_page_data)
          page_id++
        }
        lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getAllArticles(Notices, source, file_prefix, params, date = null, log_tab) {
  return new Promise(function getAllArticles(resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        let chunks = tools.arrayToChunks(Notices, gfinalConfig[source].chunck_size, log_tab + 1, source)
        let all_details = []
        for (let i = 0; i < chunks.length; i++) {
          if (i >= gfinalConfig[source].chunks_limit) {
            lg(`Chunk limit [ ${gfinalConfig[source].chunks_limit} ] reached !`, log_tab + 1, 'info', source)
            lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
            resolve(all_details)
            return
          }
          lg(``, log_tab + 1, 'info', source)
          lg(`Process chunk = ${i} | remaining = ${chunks.length - (i + 1)}`, log_tab + 1, 'info', source)
          all_details = all_details.concat(
            await Promise.all(
              chunks[i].map(async Notice => {
                return await getArticleBody(Notice, source, file_prefix, params, date, log_tab + 2)
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
        resolve(all_details)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getArticleBody(notice, source, file_prefix, params, date, log_tab) {
  return new Promise(function getArticleBody(resolve, reject) {
    ;(async () => {
      try {
        notice.url = `https://fast.bnm.gov.my/fastweb/public/${notice.url}`
        let page = await Ffetch.down(
          {
            source: source,
            url: notice.url,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:81.0) Gecko/20100101 Firefox/81.0',
              Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
              referrer: 'https://fast.bnm.gov.my/fastweb/public/FastPublicBrowseServlet.do',
            },
            disablessl: true,
          },
          log_tab + 1
        )
        let trs
        var html_body = ''
        trs = await scraping.getTrsFromPage(
          page,
          `#SpanPrint > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(1) > fieldset:nth-child(1) > table:nth-child(2) > tbody:nth-child(1) > tr,#SpanPrint > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(3) > td:nth-child(1) > fieldset:nth-child(1) > table:nth-child(2) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(1) > table:nth-child(1) > tbody:nth-child(1) > tr`,
          gfinalConfig[source].AUCTIONS_target_tds_article,
          999999,
          'text',
          log_tab + 1
        )
        for (let tr of trs) {
          if (tr.label.length === 0) continue
          notice[tr.label.replace(':', '').replace(' ', '_')] = tr.value
        }
        html_body = await file.objectToHTML(notice, 'lines', log_tab + 1, source)
        notice.date = date
        // notice.date = moment().format("YYMMDD");
        let HTML_details
        //Build HTML Details Object to create HTML and Doc file
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

        let HTML_file_info = await file.SaveHTMLFile(HTML_details, log_tab + 1)
        let Docx_file_info = await file.SaveDocxFile(HTML_details, log_tab + 1)
        if (params.label === 'AUCTIONS') {
          resolve({
            // date: date,
            issuer: notice.issuer,
            description: notice.description,
            issuedate: notice.issuedate,
            maturity: notice.Maturity_Date,
            id: notice.id,
            docxfilename: Docx_file_info.filename,
            htmlfilename: HTML_file_info.filename,
            size: HTML_file_info.size,
            body: html_body,
            html_details: HTML_details,
            // pdfs: pdfs,
            // down_pdfs: down_pdfs,
          })
        }
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function generateGlobalFiles(source, articles, prefix = 'MY_FI_BIH', desired_date, log_tab) {
  return new Promise(function generateGlobalFiles(resolve, reject) {
    ;(async () => {
      try {
        let params = {
          articles: articles,
          skeleton: {
            issuer: '',
            description: ``,
            issuedate: ``,
            maturity: ``,
            id: ``,
            docxfilename: ``,
            htmlfilename: ``,
            size: ``,
          },
          file_columns: ['docxfilename', 'htmlfilename'],
          title: 'Malaysia Auctions',
          desired_date: desired_date,
          file_prefix: prefix,
          export_path: process.env.MALASIA_EXPORTED_FILES_PATH,
          html: 'body', //object param that has HTML content
        }
        let global_files = await file.generateGlobalFiles(params, log_tab + 1)
        resolve(global_files)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getNoticesFromPage(page_id, source, params, log_tab) {
  return new Promise(function getNoticesFromPage(resolve, reject) {
    ;(async () => {
      try {
        lg(`Extracting from Page [${page_id}]`, log_tab + 1, 'info', source)
        let body = `taskId=${params.taskID}&mode=MAIN&linkButton=FIND&screenId=${params.screenId}&drawCheckBox=Y&configButton=false&txtHeader=${params.txtHeader}&txtHeaderLength=10%15%15%10%20%32%&txtHeaderAlign=LEFTLEFTLEFTLEFTLEFTLEFT&txtRecPerPage=${gfinalConfig[source].articlesperpage}&txtStartPageIndex=1&txtPageIndex=${page_id}&txtPageRange=1&txtSortingColumn=${params.txtSortingColumn}&txtSortingOrder=${params.txtSortingOrder}&txtDefaultCriteria=&txtSearchCriteria=`
        //Cookie example
        //"Cookie": "JSESSIONID=0001cmMCjBJDzP7LKp3TB2OqT2U:10bkoqs5v; dtCookie=v_4_srv_1_sn_CDLS2THJ6OJFD6EJUJNL3OKFM2CR3RIT_perc_100000_ol_0_mul_1_app-3Aea7c4b59f27d43eb_1; rxVisitor=1615892620186SG4B8KFJQHGVV06OE3IVJBGOEBLLTQ7E; dtPC=$94377952_316h-vCSFKIAMMFCUTEJPHPLTFMNCGMPOARRDT-0; rxvt=1615896183968|1615892620187; dtSa=true%7CC%7C-1%7C3%7C-%7C1615894407353%7C94375678_562%7Chttps%3A%2F%2Ffast.bnm.gov.my%2Ffastweb%2Fpublic%2FFastPublicBrowseServlet.do%7CFAST%20Public%20Browse%7C1615894378738%7C%7C; dtLatC=1"
        let page = await Ffetch.down(
          {
            source: source,
            method: `POST`,
            body: encodeURI(body),
            url: `https://fast.bnm.gov.my/fastweb/public/FastPublicBrowseServlet.do`,
            disablessl: true,
          },
          log_tab + 1
        )
        let Trs
        Trs = await scraping.getTrsFromPage(
          page,
          `#BrowseTable tbody tr.evenrow,#BrowseTable tbody tr.oddrow`,
          gfinalConfig[source].AUCTIONS_target_tds,
          9999999,
          'html',
          log_tab + 1,
          false,
          source
        )
        Trs = Trs.map(tr => {
          let a_tags
          if (params.label === 'AUCTIONS') a_tags = cheerio(tr.code).filter('a').get()
          if (Array.isArray(a_tags) && a_tags.length > 0) {
            tr['id'] = cheerio(a_tags[0]).text()
            tr['url'] = cheerio(a_tags[0]).attr('href')
          } else {
            tr['id'] = ''
            tr['url'] = ''
          }
          return tr
        })
        resolve(Trs)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}
