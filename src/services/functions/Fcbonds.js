const cheerio = require('cheerio')
const moment = require('moment')
const { clg } = require(`../tools`)

const tor = require(`../tor`)
const { gFName, catchError, pleaseWait, arrayToChunks, lg } = require(`../tools`)
const file = require(`../file`)
const scraping = require(`../scraping`)
// const Fpuppeteer = require(`../Fpuppeteer`);
// const tableify = require("tableify");
const Ffetch = require(`../Ffetch`)
const Entities = require('html-entities').XmlEntities

const sourceCode = () => arguments.callee.toString()

//Simplify logging
// const lg = tools.lg

module.exports = {
  getCBondsUpdates,
  getAllCurrentCbondsNotices,
  getOneDetailsLink,
  getOneDetailsFromHTMLTables,
  getCbondsNoticesFromPage,
}

async function getCBondsUpdates(source, log_tab) {
  try {
    lg(`START - ${gFName(new Error())}`, log_tab, 'info', source)
    let all_notices = await getAllCurrentCbondsNotices(source, log_tab + 1)
    all_notices = await getAllDetailsLinks(all_notices, source, log_tab + 1)
    all_notices = await getAllDetailsFromHTMLTables(all_notices, source, `ZZ_FI_CBONDS`, log_tab + 1)
    lg(`END - ${gFName(new Error())}`, log_tab, 'info', source)
    return all_notices
  } catch (err) {
    catchError(err, gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}

async function getAllCurrentCbondsNotices(source, log_tab) {
  try {
    lg(`START - ${gFName(new Error())}`, log_tab, 'info', source)
    let body = {
      filters: [
        {
          field: 'show_only_loans',
          operator: 'eq',
          value: 0,
        },
        {
          field: 'language',
          operator: 'in',
          value: ['eng'],
        },
        {
          field: 'date',
          operator: 'ge',
          value: moment().subtract(1, 'days').format('YYYY-MM-DD'),
        },
        {
          field: 'section_id',
          operator: 'in',
          value: [
            '27',
            '3',
            '5',
            '1',
            '4',
            '15',
            '17',
            '12',
            '6',
            '23',
            '14',
            '21',
            '31',
            '13',
            '25',
            '8',
            '2',
            '10',
            '11',
          ],
        },
      ],
      sorting: [],
      quantity: {
        offset: 0,
        limit: 60,
      },
      lang: 'eng',
    }
    let data = await Ffetch.down(
      {
        id: `getAllCurrentCbondsNotices`,
        source: source,
        url: `https://cbonds.com/news/`,
        method: `POST`,
        body: JSON.stringify(body),
        json: true,
        // log_req: true,
      },
      log_tab + 1
    )
    let notices = []
    if (data['response'] && data['response']['items']) {
      notices = data['response']['items'].map(notice => {
        return {
          type: notice.caption.includes(`New bond issue`) ? `New Issue` : `News`,
          id: notice.id,
          title: notice.caption,
          date: moment.unix(notice['date_time.numeric']).format('YYYYMMDD'),
          time: moment.unix(notice['date_time.numeric']).format('HHmmss'),
          url: notice.cb_link,
          // text: notice.text.substring(0, 5),
          text: notice.text,
        }
      })
      lg(`Extracted ${data['response']['items'].length} Notices`, log_tab + 1, 'info', source)
    } else {
      lg(`JSON response is not OK !`, log_tab + 1, 'warn', source)
    }
    lg(`END - ${gFName(new Error())}`, log_tab, 'info', source)
    return notices
  } catch (err) {
    catchError(err, gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}

async function getAllDetailsLinks(Notices, source, log_tab) {
  try {
    lg(`START - ${gFName(new Error())}`, log_tab, 'info', source)
    let chunks = arrayToChunks(Notices, gfinalConfig[source].chunck_size, log_tab + 1, source)
    let all_details = []
    for (let i = 0; i < chunks.length; i++) {
      // if (i < 5) continue;
      if (i >= gfinalConfig[source].chunks_limit) {
        lg(`Chunk limit [ ${gfinalConfig[source].chunks_limit} ] reached !`, log_tab + 1, 'info', source)
        return all_details
      }
      lg(``, log_tab + 1, 'info', source)
      lg(`Process chunk = ${i} | remaining = ${chunks.length - (i + 1)}`, log_tab + 1, 'info', source)
      all_details = all_details.concat(
        await Promise.all(
          chunks[i].map(async Notice => {
            return await getOneDetailsLink(Notice, source, log_tab + 2)
          })
        )
      )
      all_details = [].concat.apply([], all_details) //flattern the array
      await pleaseWait(gfinalConfig[source].delay_min, gfinalConfig[source].delay_max, log_tab + 1, source)
    }
    lg(`END - ${gFName(new Error())}`, log_tab, 'info', source)
    return all_details
  } catch (err) {
    catchError(err, gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}

async function getOneDetailsLink(Notice, source, log_tab) {
  try {
    if (Notice.type === 'News') {
      Notice.details_url = 'N/A'
      Notice.security_label = 'N/A'
      lg(`Skipping News Notice Type`, log_tab + 1, 'info', source)
      return Notice
    }
    let page = await Ffetch.down(
      {
        id: `getOneDetailsLink[${Notice.id}]`,
        source: source,
        url: Notice.url,
        // savetofile: true,
      },
      log_tab + 1
    )
    let top_20s = await scraping.getTagsFromPage(
      {
        source: source,
        body: page,
        target_block: `div.content`,
        target_tags: `div.top_20`,
        tag_return_type: 'html',
      },
      log_tab + 1
    )
    top_20s = top_20s.filter(tag => tag.includes('Issue'))
    if (top_20s.length > 0) {
      // top_20s[0] = top_20s[0].replace(/^.*; /, "");
      // top_20s[0] = top_20s[0].replace(/ &.*; /, "");
      const entities = new Entities()
      top_20s[0] = entities.decode(top_20s[0])
      // let a_tags
      // let a_tags = cheerio('a', top_20s[0]).get()
      let a_tag = await scraping.getOneTag('a', top_20s[0], 'object', log_tab + 1, source)
      // if (Array.isArray(a_tags) && a_tags.length > 0) {
      if (a_tag.found) {
        // Notice.security_label = cheerio(a_tags[0]).text()
        // Notice.details_url = cheerio(a_tags[0]).attr('href')
        const $ = a_tag.$
        const tag = a_tag.content
        Notice.details_url = tag.attr('href')
        Notice.security_label = tag.text()
      } else {
        lg(`Not found A tag FROM= [${top_20s[0]}] | IN= [${Notice.url}]`, log_tab + 3, 'warn', source)
        Notice.details_url = 'N/A'
        Notice.security_label = 'N/A'
      }
    } else {
      lg(`Could not find the Issue details URL ! IN= ${Notice.url}`, log_tab + 2, 'warn', source)
      Notice.details_url = 'N/A'
      Notice.security_label = 'N/A'
    }
    return Notice
  } catch (err) {
    catchError(err, gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}

async function getAllDetailsFromHTMLTables(Notices, source, file_prefix, log_tab) {
  try {
    lg(`START - ${gFName(new Error())}`, log_tab, 'info', source)
    let chunks = arrayToChunks(Notices, gfinalConfig[source].chunck_size, log_tab + 1, source)
    let all_details = []
    for (let i = 0; i < chunks.length; i++) {
      if (i >= gfinalConfig[source].chunks_limit) {
        lg(`Chunk limit [ ${gfinalConfig[source].chunks_limit} ] reached !`, log_tab + 1, 'info', source)
        return all_details
      }
      lg(``, log_tab + 1, 'info', source)
      lg(`Process chunk = ${i} | remaining = ${chunks.length - (i + 1)}`, log_tab + 1, 'info', source)
      all_details = all_details.concat(
        await Promise.all(
          chunks[i].map(async Notice => {
            return await getOneDetailsFromHTMLTables(Notice, source, file_prefix, log_tab + 2)
          })
        )
      )
      all_details = [].concat.apply([], all_details) //flattern the array
      await pleaseWait(gfinalConfig[source].delay_min, gfinalConfig[source].delay_max, log_tab + 1, source)
    }
    lg(`END - ${gFName(new Error())}`, log_tab, 'info', source)
    return all_details
  } catch (err) {
    catchError(err, gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}

async function getOneDetailsFromHTMLTables(Notice, source, file_prefix, log_tab) {
  try {
    if (Notice.type == `New Issue`) {
      //Get Details
      let page = await Ffetch.down(
        {
          id: `getOneDetailsFromHTMLTables[${Notice.id}]`,
          source: source,
          url: Notice.details_url,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:81.0) Gecko/20100101 Firefox/81.0',
            Connection: 'close',
            Origin: 'https://cbonds.com',
            'Accept-Language': 'en-US,en;q=0.5',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0',
            Referer: Notice.url,
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          },
        },
        log_tab + 1
      )
      Notice = await getOneTableDetails(
        page,
        `div.main_params div.other_param`,
        `div.wrp`,
        Notice,
        source,
        log_tab + 1
      )
      Notice = await getOneTableDetails(page, `div#bondInfo`, `ul li`, Notice, source, log_tab + 1)
      Notice = await getOneTableDetails(page, `div#bondCashopt`, `ul li`, Notice, source, log_tab + 1)
      Notice = await getOneTableDetails(page, `div#bondAccommodation`, `ul li`, Notice, source, log_tab + 1)
      Notice = await getOneTableDetails(page, `div#bondConversion`, `ul li`, Notice, source, log_tab + 1)
      Notice = await getOneTableDetails(page, `div#bondIdentifiers`, `ul li`, Notice, source, log_tab + 1)
    } else {
      lg(`Skipping News Notice Type`, log_tab + 1, 'info', source)
    }
    // resolve(Notice);:
    Notice.details_url = `<a href="${Notice.details_url}" target="_blank">${Notice.details_url}</a>`
    var html_body = await file.objectToHTML(Notice, 'lines', log_tab + 1)

    let HTML_details
    HTML_details = {
      title: `${Notice.id} - ${Notice['ISIN'] ? Notice['ISIN'] : ``} - ${
        Notice['security_label'] ? Notice['security_label'] : ``
      } - ${Notice.Borrower ? Notice.Borrower : ``} / ${Notice['type']}`,
      issuer: `${Notice['Borrower'] ? Notice['Borrower'] : `CBONDS`}`,
      date: Notice.date,
      time: Notice.time,
      url: Notice.url,
      body: html_body,
      prefix: file_prefix,
      path: process.env.CBONDS_EXPORTED_FILES_PATH,
      rem_comment: false,
    }
    let HTML_file_info = await file.SaveHTMLFile(HTML_details, log_tab + 1)
    let Docx_file_info = await file.SaveDocxFile(HTML_details, log_tab + 1)
    return {
      id: Notice.id,
      date: Notice.date,
      type: Notice.type,
      ISIN: Notice['ISIN'] ? Notice['ISIN'] : `N/A`,
      Borrower: Notice['Borrower'] ? Notice['Borrower'] : `N/A`,
      IssueCode: Notice['security_label'] ? Notice['security_label'] : `N/A`,
      label: Notice.title.substring(0, 60),
      docxfilename: Docx_file_info.filename,
      htmlfilename: HTML_file_info.filename,
      size: HTML_file_info.size,
    }
  } catch (err) {
    catchError(err, gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}

async function getOneTableDetails(page, target_block, target_tags, Notice, source, log_tab) {
  try {
    let wrp_tags = await scraping.getTagsFromPage(
      {
        //Get Main Params
        body: page,
        target_block: target_block,
        target_tags: target_tags,
        tag_return_type: 'html',
      },
      log_tab + 1
    )
    let details = await Promise.all(
      wrp_tags.map(async tag => {
        // let divs = cheerio('div', tag).get()
        let divs = await scraping.getMultiTags('div', tag, 'object', log_tab + 1, source)
        if (divs.found && divs.contents.length > 1) {
          const tags = divs.contents
          const $ = divs.$
          // if (Array.isArray(divs) && divs.length > 0) {
          // Notice[cheerio(divs[0]).text().trim()] = cheerio(divs[1])
          Notice[$(tags[0]).text().trim()] = $(tags[1])
            .text()
            .trim()
            .replace(/Go to the issuer page\s*/, '')
            .replace(/( {3}|\r)+/g, '')
        }
      })
    )
    return Notice
  } catch (err) {
    catchError(err, gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}

//BELOW ARE OLD FUNCTIONS BEFORE SITE CHANGED TEMPLATE
function getAllCbondsNotices(source, log_tab) {
  return new Promise(function (resolve, reject) {
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
          let this_page_data = await getCbondsNoticesFromPage(page_id, `cbonds`, log_tab + 3)
          await pleaseWait(gfinalConfig[source].delay_min, gfinalConfig[source].delay_max, log_tab + 3)
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
        catchError(err, 'getAllCbondsNotices', undefined, undefined, log_tab + 4)
        reject(`getAllCbondsNotices: ${err.message}`)
      }
    })()
  })
}

function getCbondsNoticesFromPage(page_id, source, log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        clg(sourceCode.toString())
        lg(`Extracting from Page [${page_id}]`, log_tab + 1)
        let page = await tor.downloadUrlUsingTor(
          'cbonds',
          `http://cbonds.com/news/?page=${page_id}`,
          undefined,
          undefined,
          undefined,
          gfinalConfig[source].use_tor,
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
        let a_tags = await scraping.getTagsFromPage(
          {
            body: page.body,
            target_block: `ul.cb_news`,
            target_tags: `div.item`,
            tag_return_type: `html`,
            // return_type: 'noobject',
            rows_max: 99999999,
          },
          log_tab + 1
        )
        a_tags = a_tags.map(tag => {
          let $ = cheerio.load(tag)
          let type = $($('a').get()[0]).text().includes(`New bond issue`) ? `New Issue` : `News`
          return {
            type: type,
            label: $($('a').get()[0]).text().replace(`New bond issue:`, ``).trim(),
            url: $($('a').get()[0]).attr('href'),
          }
        })
        // clg(a_tags);
        resolve(a_tags)
        return
      } catch (err) {
        catchError(err, 'getCbondsNoticesFromPage', true, 'general', log_tab + 3)
        reject(`getCbondsNoticesFromPage : ${err.message}`)
      }
    })()
  })
}

function getAllMainArticles(Notices, source, log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        lg(`START - getAllMainArticles`, log_tab)
        let chunks = arrayToChunks(Notices, gfinalConfig[source].chunck_size, 2)
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
                return await getOneMainArticle(Notice, source, log_tab + 2)
              })
            )
          )
          all_details = [].concat.apply([], all_details) //flattern the array
          await pleaseWait(gfinalConfig[source].delay_min, gfinalConfig[source].delay_max, 2)
        }
        lg(`END - getAllMainArticles`, log_tab)
        resolve(all_details)
        return
      } catch (err) {
        catchError(err, 'getAllMainArticles', undefined, undefined, log_tab + 1)
        reject(`getAllMainArticles: ${err.message}`)
      }
    })()
  })
}

//p.cb_indent_top_20 / .cb_news_txt / OLD FUNCTION
function getOneMainArticle(Notice, source, log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        let page = await tor.downloadUrlUsingTor(
          'sgxmas_file',
          Notice.url,
          undefined,
          'GET',
          undefined,
          gfinalConfig[source].use_tor,
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
        let $ = cheerio.load(page.body)
        let article_tags = $().get()
        Notice['main_article'] = ``
        Notice['date'] = ''
        Notice['details_url'] = ''
        let main_article = await scraping.getOneTag('.cb_news_txt', page.body, 'text', log_tab + 1)
        if (main_article.found) {
          Notice['main_article'] = main_article.content
        }
        let date = await scraping.getOneTag('p.cb_left.cb_indent_top_10', page.body, 'text', log_tab + 1)
        if (date.found) {
          if (
            moment(
              date.content.replace(` | Cbonds`, ``).replace(` | CBonds`, ``).trim(),
              'MMMM DD, YYYY',
              true
            ).isValid()
          ) {
            Notice['date'] = moment(
              date.content.replace(` | Cbonds`, ``).replace(` | CBonds`, ``).trim(),
              'MMMM DD, YYYY'
            ).format('YYYYMMDD')
          } else {
            lg(
              `Attention, Invalid Date [${date.content
                .replace(` | CBonds`, ``)
                .replace(` | CBonds`, ``)
                .replace(` |`, ``)
                .trim()}], replaced by today's date`,
              log_tab + 2,
              'warn'
            )
            Notice['date'] = moment().format('YYYYMMDD')
          }
        }
        if (Notice.type === `New Issue`) {
          let details_url = await scraping.getOneTag('p.cb_indent_top_20 a', page.body, 'object', log_tab + 1)
          if (details_url.found) {
            Notice['details_url'] = details_url.content.attr('href')
          }
        }
        resolve(Notice)
        return
      } catch (err) {
        catchError(err, 'getOneMainArticle', true, 'general', log_tab + 4)
        reject(`getOneMainArticle: ${err.message}`)
      }
    })()
  })
}

function getAllNewIssuesDetails(Notices, source, file_prefix, log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        lg(`START - getAllNewIssuesDetails`, log_tab)
        let chunks = arrayToChunks(Notices, gfinalConfig[source].chunck_size, 2)
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
                return await getOneNewIssueDetails(Notice, source, file_prefix, log_tab + 2)
              })
            )
          )
          all_details = [].concat.apply([], all_details) //flattern the array
          await pleaseWait(gfinalConfig[source].delay_min, gfinalConfig[source].delay_max, 2)
        }
        lg(`END - getAllNewIssuesDetails`, log_tab)
        resolve(all_details)
        return
      } catch (err) {
        catchError(err, 'getAllNewIssuesDetails', undefined, undefined, log_tab + 1)
        reject(`getAllNewIssuesDetails: ${err.message}`)
      }
    })()
  })
}

function getOneNewIssueDetails(notice, source, file_prefix, log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        // clg(notice);
        if (notice.type == `New Issue`) {
          //Get Details
          let page = await tor.downloadUrlUsingTor(
            `cbonds`,
            notice.details_url,
            undefined,
            undefined,
            undefined,
            gfinalConfig[source].use_tor,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            log_tab + 1,
            false,
            true
          )
          let target_tds = [
            {
              id: 0,
              name: `label`,
            },
            {
              id: 1,
              name: `value`,
            },
          ]
          let details = await scraping.getTrsFromPage(
            page.body,
            `table.cb_table tbody tr`,
            target_tds,
            48,
            'text',
            log_tab + 1
          )
          details.forEach((detail, idx) => {
            if (
              ['Show previous', '1', '2', '3', '4', '5', '6', '7'].includes(detail.label) ||
              detail.label === '' ||
              detail.label.length > 100
            ) {
              lg(`LabelDeleted [${detail.label}]`, log_tab + 2, 'warn')
              return
            }
            if (idx == 0) notice['Status'] = detail.label
            else notice[detail.label] = detail.value
          })
        }
        notice.details_url = `<a href="${notice.details_url}" target="_blank">${notice.details_url}</a>`

        var html_body = await file.objectToHTML(notice, 'lines', log_tab + 1)

        let HTML_details
        HTML_details = {
          title: `${
            notice['ISIN / ISIN RegS'] ? notice['ISIN / ISIN RegS'] : notice.label.substring(0, 60)
          } - ${notice['CUSIP / CUSIP RegS'] ? notice['CUSIP / CUSIP RegS'] : ``} - ${
            notice.Borrower ? notice.Borrower : ``
          } / ${notice['type']}`,
          issuer: `${notice.Borrower ? notice.Borrower : `CBONDS`}`,
          date: notice.date,
          time: '',
          url: notice.url,
          body: html_body,
          prefix: file_prefix,
          path: process.env.CBONDS_EXPORTED_FILES_PATH,
          rem_comment: false,
        }
        let HTML_file_info = await file.SaveHTMLFile(HTML_details, log_tab + 1)
        let Docx_file_info = await file.SaveDocxFile(HTML_details, log_tab + 1)
        resolve({
          date: notice.date,
          type: notice.type,
          ISIN: notice['ISIN / ISIN RegS'],
          Borrower: notice.Borrower ? notice.Borrower : `N/A`,
          IssueCode: notice['CUSIP / CUSIP RegS'] ? notice['CUSIP / CUSIP RegS'] : `N/A`,
          label: notice.label.substring(0, 60),
          docxfilename: Docx_file_info.filename,
          htmlfilename: HTML_file_info.filename,
          size: HTML_file_info.size,
        })
        return
      } catch (err) {
        catchError(err, 'getOneNewIssueDetails', undefined, undefined, log_tab + 3)
        reject(`getOneNewIssueDetails : ${err.message}`)
      }
    })()
  })
}
