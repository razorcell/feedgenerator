const cheerio = require('cheerio')
const moment = require('moment')
const Ffetch = require('../Ffetch')

const tools = require(`../tools`)
const file = require(`../file`)
const scraping = require(`../scraping`)
const tor = require('../tor')

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
  getAllNoticesForDate,
  getMalasiaAnnouncementsForDate,
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
        //Remove columns related to global file for ANNOUNCEMENTS
        articles = articles.map(article => {
          delete article.pdf
          delete article.body
          delete article.html_details
          return article
        })

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

function getMalasiaAnnouncementsForDate(source, date, log_tab) {
  return new Promise(function getMalasiaAnnouncementsForDate(resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        date = moment(date, 'YYYYMMDD').format('YYYY-MM-DD')
        let params = {
          label: 'ANNOUNCEMENTS',
          taskID: 'PB010400',
          screenId: 'PB010400',
          txtHeader: `News+IDEmbargo+DateOrganisation+NameNews+TypeNews+SubjectNews+Summary`,
          txtSortingColumn: `2`,
          txtSortingOrder: `-1`,
        }
        let Notices = await getAllNoticesForDate(source, date, params, log_tab + 1)
        // Notices = Notices.slice(1, 2);
        let articles = await getAllArticles(Notices, source, 'MY_FI_CA', params, date, log_tab + 1)
        let ALL_PDF = await generateGlobalPDFFile(source, date, articles, 'MY_FI_CA', log_tab + 1)
        let global_files = await generateGlobalFiles(source, articles, params.label, date, log_tab + 1)
        //Adapt global files
        global_files.docx['pdf'] = ''
        global_files.html['pdf'] = ''
        articles.push(global_files.docx)
        articles.push(global_files.html)
        articles.push(ALL_PDF)
        //Generate Global PDF file
        articles = articles.map(article => {
          delete article.body
          delete article.html_details
          return article
        })
        lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        clg(articles)
        resolve(articles)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function generateGlobalFiles(source, articles, label, desired_date, log_tab) {
  return new Promise(function generateGlobalFiles(resolve, reject) {
    ;(async () => {
      try {
        let file_name_prefix = ''
        switch (label) {
          case 'ANNOUNCEMENTS':
            file_name_prefix = 'MY_FI_CA'
            break
          case 'AUCTIONS':
            file_name_prefix = 'MY_FI_BIH'
            break
        }
        let params = {
          articles: articles,
          skeleton: {
            date: '',
            issuer: '',
            subject: ``,
            summary: ``,
            type: ``,
            id: ``,
            docxfilename: ``,
            htmlfilename: ``,
            size: ``,
            pdf: ``,
          },
          file_columns: ['docxfilename', 'htmlfilename'],
          title: 'Malaysia Announcements',
          desired_date: desired_date,
          file_prefix: file_name_prefix,
          export_path: process.env.MALASIA_EXPORTED_FILES_PATH,
          html: 'body', //object param that has HTML content
        }
        let global_files = await file.generateGlobalFiles(params, log_tab + 1)
        resolve(global_files)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function generateGlobalPDFFile(source, date, articles, file_prefix, log_tab = 1) {
  return new Promise(function getMalasiaAnnouncementsForDate(resolve, reject) {
    ;(async () => {
      try {
        articles = articles.filter(art => art.pdf === undefined || art.pdf != '') //filter no pdf articles
        let PDF_shortFileName = ''
        if (articles.length === 0) {
          let content = `${date} - NO DATA`
          PDF_shortFileName = `${file_prefix}_${date}_ALL_PDF.txt`
          await file.writeToFile(
            `${process.env.MALASIA_EXPORTED_FILES_PATH}${PDF_shortFileName}`,
            content,
            log_tab,
            source
          )
          resolve({
            date: date,
            issuer: 'ALL_PDF',
            subject: 'ALL_PDF',
            summary: 'ALL_PDF',
            type: 'ALL_PDF',
            id: 'ALL_PDF',
            docxfilename: '',
            htmlfilename: '',
            size: 'ALL_PDF',
            pdf: PDF_shortFileName,
          })
          return
        }
        PDF_shortFileName = await file.mergePDFs(
          {
            source: source,
            files: articles,
            targetFileName: 'ALL_PDF',
            fileNameKey: 'pdf',
            file_prefix: file_prefix,
            exportPath: process.env.MALASIA_EXPORTED_FILES_PATH,
            filesPath: process.env.MALASIA_EXPORTED_FILES_PATH,
            desired_date: date,
          },
          log_tab + 1
        )
        resolve({
          date: date,
          issuer: 'ALL_PDF',
          subject: 'ALL_PDF',
          summary: 'ALL_PDF',
          type: 'ALL_PDF',
          id: 'ALL_PDF',
          docxfilename: '',
          htmlfilename: '',
          size: 'ALL_PDF',
          pdf: PDF_shortFileName,
        })
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
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

function getAllNoticesForDate(source, date, params, log_tab) {
  return new Promise(function getAllNoticesForDate(resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        lg(`For Date [${date}]`, log_tab + 1, 'info', source)
        let Notices = await getAllNotices(source, params, log_tab + 1)
        Notices = Notices.map(notice => {
          notice.embargodate = moment(notice.embargodate, 'DD/MM/YYYY hh:mm:ss a').format('YYYY-MM-DD')
          return notice
        }).filter(notice => notice.embargodate === date)
        lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        resolve(Notices)
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
          await tools.pleaseWait(
            gfinalConfig[source].delay_min,
            gfinalConfig[source].delay_max,
            log_tab + 3,
            'info',
            source
          )
          lg(`[${this_page_data.length}] Notices in this page`, log_tab + 2, 'info', source)
          all_data = all_data.concat(this_page_data)
          page_id++
        }
        lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        resolve(all_data)
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
        lg(`Extracting from Page [${page_id}]`, log_tab + 1)
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
        Trs = Trs.map(tr => {
          let a_tags
          if (params.label === 'ANNOUNCEMENTS') a_tags = cheerio(tr.newsid).filter('a').get()
          if (params.label === 'AUCTIONS') a_tags = cheerio(tr.code).filter('a').get()
          if (params.label === 'STOCK') a_tags = cheerio(tr.code).filter('a').get()
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
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab)
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
            lg(`Chunk limit [ ${gfinalConfig[source].chunks_limit} ] reached !`, log_tab + 1)
            lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
            resolve(all_details)
            return
          }
          lg(``)
          lg(`Process chunk = ${i} | remaining = ${chunks.length - (i + 1)}`, log_tab + 1)
          all_details = all_details.concat(
            await Promise.all(
              chunks[i].map(async Notice => {
                return await getArticleBody(Notice, source, file_prefix, params, date, log_tab + 2)
              })
            )
          )
          all_details = [].concat.apply([], all_details) //flattern the array
          await tools.pleaseWait(gfinalConfig[source].delay_min, gfinalConfig[source].delay_max, 2)
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
            // savetofile: true,
            // log_req: true,
          },
          log_tab + 1
        )
        let trs
        var html_body = ''
        if (params.label == 'STOCK') {
          let result = await scraping.getOneTag(`#SpanPrint > table`, page, 'html', log_tab + 1)
          // await file.writeToFile('downloads/testart.html', result.content);
          html_body = result.content
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
            date: date,
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
          let global_PDF = ''
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
            //Extract attachements
            let pdfs = await extractPDFsFromPage(source, page, params.label, log_tab + 1)
            // clg(pdfs);
            let down_pdfs = []

            if (pdfs.length > 0) {
              //download PDFs
              down_pdfs = await downloadPDFsInsideArticle(source, pdfs, notice, params.label, log_tab + 1)
              //Merge PDFs
              global_PDF = await file.mergePDFs(
                {
                  source,
                  files: down_pdfs,
                  targetFileName: notice.id,
                  fileNameKey: 'file_name',
                  file_prefix: file_prefix,
                  desired_date: date,
                  exportPath: process.env.MALASIA_EXPORTED_FILES_PATH,
                  filesPath: process.env.MALASIA_EXPORTED_FILES_PATH,
                },
                log_tab + 1
              )
            }
          }

          for (let tr of trs) {
            if (tr.label.length === 0) continue
            notice[tr.label.replace(':', '').replace(' ', '_')] = tr.value
          }
          html_body = await file.objectToHTML(notice, 'lines', log_tab + 1)

          if (params.label === 'ANNOUNCEMENTS' && content.found) {
            html_body += `<br><b>Content: </b> <pre>${content.content}</pre>`
          }

          notice.date = date
          // notice.date = moment().format("YYMMDD");
          let HTML_details
          //Build HTML Details Object to create HTML and Doc file
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
              date: date,
              issuer: notice.organization,
              subject: notice.subject,
              summary: notice.Summary,
              type: notice.type,
              id: notice.id,
              docxfilename: Docx_file_info.filename,
              htmlfilename: HTML_file_info.filename,
              size: HTML_file_info.size,
              pdf: global_PDF,
              body: html_body,
              html_details: HTML_details,
              // pdfs: pdfs,
              // down_pdfs: down_pdfs,
            })
          }
          if (params.label === 'AUCTIONS') {
            resolve({
              date: date,
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
        }
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function extractPDFsFromPage(source, page, label, log_tab) {
  return new Promise(function generateGlobalFile(resolve, reject) {
    ;(async () => {
      try {
        let result = await scraping.getMultiTags(
          `#SpanPrint > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(1) > fieldset:nth-child(1) > table:nth-child(3) > tbody:nth-child(1) > tr:nth-child(9) > td:nth-child(2) > a`,
          page,
          'object',
          log_tab + 1,
          source
        )
        // let pdfs = [];
        if (!result.found) {
          resolve([])
          return
        }
        let onclicks_attrs = result.contents.map(a_tag => {
          return result.$(a_tag).attr('onclick')
        })
        // clg(onclicks_attrs);
        let args = onclicks_attrs.map(attr => {
          let regex = /(?:downloadFile\()(.*)(?:\);$)/gm
          let args = Array.from(attr.matchAll(regex)).map(res => res[1])
          if (args.length > 0) return args[0]
          else return null
          // return [0];
        })
        args = args.filter(arg => arg !== null)
        // clg(args);
        let pdfs = args.map(arg => {
          return arg.split(',').map(arg => {
            return arg.trim().slice(1, -1)
          })
        })
        // clg(pdfs);
        let pdfs_2 = pdfs.map(pdf_args => {
          return pdf_args.map(arg => {
            return arg.replace(`\\`, '')
          })
        })
        clg(pdfs_2)
        lg(`Found ${pdfs.length} PDF attachements`, log_tab + 1, 'info', source)
        resolve(pdfs_2)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}
function downloadPDFsInsideArticle(source, pdfs, Notice, label, log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        let prefix = ''
        switch (label) {
          case 'ANNOUNCEMENTS':
            prefix = 'MY_FI_CA'
            break
          //Not used for now
          // case "AUCTIONS":
          //   prefix = "MY_FI_BIH";
          //   break;
        }
        if (pdfs.length === 0) {
          lg(`No PDFs to download for this article`, log_tab + 1, 'info', source)
          resolve(``)
          return
        }
        pdfs = pdfs.map(pdf_arry => {
          let fileUrl = ''
          if (pdf_arry.length === 3) {
            fileUrl = `PublicInfoServlet.do?fileId=${pdf_arry[0].replace(/^\s*|\s*$/g, '')}&fileName=${
              pdf_arry[1]
            }&mode=DOWNLOAD&dlTbl=m&module=${pdf_arry[2]}`
            return { type: 3, array: pdf_arry, url_string: fileUrl }
          } else {
            fileUrl = `PublicInfoServlet.do?fileId=${pdf_arry[0].replace(
              /^\s*|\s*$/g,
              ''
            )}&mode=DOWNLOAD&dlTbl=m&module=${pdf_arry[2]}`
            return { type: 2, array: pdf_arry, url_string: fileUrl }
          }
        })
        let short_files_names = []
        short_files_names = await Promise.all(
          pdfs.map(async function (pdf, index) {
            let file_data = await tor.downloadUrlUsingTor(
              'malasiaann_pdf',
              `https://fast.bnm.gov.my/fastweb/public/${pdf.url_string}`,
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
            clg(`File[${index}] Saving..`)
            clg(pdf)
            let short_file_name = (pdf.type === 3 ? pdf.array[1] : `file-${index}`)
              .replace(/[^a-z|A-Z|0-9]/gm, `-`)
              .trim()
              .replace(/-+/gm, `-`)
              .toUpperCase()
            let file_name = `${prefix}_${Notice.id}_${short_file_name}.pdf`.replace('.pdf.pdf', '.pdf')
            await tools.writeBinaryFile(
              `${process.env.MALASIA_EXPORTED_FILES_PATH}${file_name}`,
              file_data.body
            )
            return {
              file_name: file_name,
              size: await file.getFileSize(file_data.body, log_tab + 2),
            }
          })
        )
        resolve(short_files_names)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}
