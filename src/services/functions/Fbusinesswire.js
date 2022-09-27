const tools = require(`../tools`)
const Ffetch = require(`../Ffetch`)
const scraping = require(`../scraping`)
const moment = require('moment')

//Simplify logging
const lg = tools.lg

const { clg } = require(`../tools`)

module.exports = {
  getBusinessWireUpdates,

  getAllNotices,
  getNoticesForPage,

  getAllNoticesDetails,
  getOneNoticeDetails,
}

async function getBusinessWireUpdates(source, log_tab) {
  try {
    lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
    let allData = []
    let allNotices = await getAllNotices(source, log_tab + 1)
    allData = await getAllNoticesDetails(source, allNotices, log_tab + 1)
    allData = await addURLsTags(source, allData, log_tab + 1)
    lg(`Extracted ${allData.length} Relevant Notices From BusinessWire`, log_tab + 1, 'info', source)
    lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
    return allData
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}

async function addURLsTags(source, all_data, log_tab) {
  try {
    all_data = all_data.map(row => {
      row.url = `<a href="${row.url}" target="_blank">Source</a>`
      return row
    })
    return all_data
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}
async function getAllNotices(source, log_tab) {
  try {
    lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
    var page_ids = Array.from(Array(gfinalConfig[source].maximum_pages).keys())
    page_ids.shift() //remove index 0
    let chunks = tools.arrayToChunks(page_ids, gfinalConfig[source].chunck_size, log_tab + 1, source)
    let all_details = []
    for (let i = 0; i < chunks.length; i++) {
      // if (i < 40) continue;
      if (i >= gfinalConfig[source].chunks_limit) {
        lg(`Chunk limit [ ${gfinalConfig[source].chunks_limit} ] reached !`, log_tab + 1, 'info', source)
        lg(`Extrated ${all_details.length} Notices`, log_tab + 1, 'info', source)
        return all_details
      }
      lg(``, log_tab + 1, 'info', source)
      lg(
        `Process chunk = <b>${i}</b> | remaining = <b>${chunks.length - (i + 1)}</b>`,
        log_tab + 1,
        'info',
        source
      )
      let sec_groups = await Promise.all(
        chunks[i].map(async page_id => {
          return await getNoticesForPage(source, page_id, log_tab + 1)
        })
      )
      all_details = all_details.concat(sec_groups)
      let counts = sec_groups.map(grp => grp.length)
      all_details = [].concat.apply([], all_details) //flattern the array
      if (counts.includes(0)) {
        lg(`END reached`, log_tab + 1, 'info', source)
        break
      }
      // all_details = Array.from(new Set(all_details)); //Remove duplicates
      await tools.pleaseWait(
        gfinalConfig[source].delay_min,
        gfinalConfig[source].delay_max,
        log_tab + 1,
        source
      )
    }
    lg(`Extrated ${all_details.length} Notices`, log_tab + 1, 'info', source)
    return all_details
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}

async function getNoticesForPage(source, pageID, log_tab) {
  try {
    let page = await Ffetch.down(
      {
        source,
        method: 'GET',
        url: `https://www.businesswire.com/portal/site/home/template.PAGE/news/?javax.portlet.tpst=ccf123a93466ea4c882a06a9149550fd&javax.portlet.prp_ccf123a93466ea4c882a06a9149550fd_viewID=MY_PORTAL_VIEW&javax.portlet.prp_ccf123a93466ea4c882a06a9149550fd_ndmHsc=v2*A1620644400000*B1623254223076*DgroupByDate*G5*N1000003&javax.portlet.begCacheTok=com.vignette.cachetoken&javax.portlet.endCacheTok=com.vignette.cachetoken`,
        id: `getNoticesForPage [${pageID}]`,
        savetofile: false,
        log_req: false,
      },
      log_tab + 1
    )
    // return page
    let articles = await scraping.getMultiTags(
      'ul.bwNewsList div[itemscope=itemscope]',
      page,
      'object',
      log_tab + 1,
      source,
      9999
    )
    if (!articles.found || articles.contents.length === 0) {
      lg(`Could not find any articles for this pageID[${pageID}]`, log_tab + 1, 'warn', source)
      return []
    }
    lg(`${articles.contents.length} Article(s) found for pageID ${pageID}`, log_tab + 1, 'info', source)
    let $ = articles.$
    articles = articles.contents
      .map((group, indx) => {
        let aTags = $(group).find('a.bwTitleLink').get()
        let spanTags = $(group).find('div.bwMeta').get()
        let timeTags = $(group).find('time').get()
        if (aTags.length == 0 || spanTags.length == 0 || timeTags.length == 0) {
          lg(`Could not find a Tag for articleID[${indx}] Page[${pageID}]`, log_tab + 1, 'warn', source)
          lg(`Could not find Time blocks for articleID[${indx}] Page[${pageID}]`, log_tab + 1, 'warn', source)
          lg(`Could not find Time Tags for articleID[${indx}] Page[${pageID}]`, log_tab + 1, 'warn', source)
          return null
        } else {
          let url = `https://www.businesswire.com${$(aTags[0]).attr('href')}`
          let title = $(aTags[0]).text()
          let timeText = $(spanTags[0]).text().trim()
          let timeRFC = $(timeTags[0]).attr('datetime').trim()
          let date = moment(timeRFC).format('YYYYMMDD')
          let time = moment(timeRFC).format('hhmmss')

          return {
            date: date,
            time: time,
            title: title,
            url: url,
          }
        }
      })
      .filter(article => article !== null)
    return articles
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}

async function getAllNoticesDetails(source, allNotices, log_tab) {
  try {
    lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
    let chunks = tools.arrayToChunks(allNotices, gfinalConfig[source].chunck_size, log_tab + 1, source)
    let all_data = []
    for (let i = 0; i < chunks.length; i++) {
      if (i >= gfinalConfig[source].chunks_limit) {
        lg(
          `${tools.gFName(new Error())} : Chunk limit [ ${gfinalConfig[source].chunks_limit} ] reached !`,
          log_tab + 1,
          'info',
          source
        )
        lg(`END - ${tools.gFName(new Error())}`, log_tab + 1, 'info', source)
        all_data = [].concat.apply([], all_data) //flattern array
        return all_data.filter(notice => notice != null)
      }
      lg(``, log_tab + 1, 'info', source)
      lg(
        `${tools.gFName(new Error())} : Process chunk = ${i} | remaining = ${chunks.length - (i + 1)}`,
        log_tab + 2,
        'info',
        source
      )
      all_data = all_data.concat(
        await Promise.all(
          chunks[i].map(async notice => {
            return await getOneNoticeDetails(source, notice, log_tab + 3)
          })
        )
      )
      await tools.pleaseWait(
        gfinalConfig[source].delay_min,
        gfinalConfig[source].delay_max,
        log_tab + 2,
        source
      )
    }
    all_data = [].concat.apply([], all_data) //flattern array
    lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
    return all_data.filter(notice => notice != null)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}

async function getOneNoticeDetails(source, notice, log_tab) {
  try {
    let page = ``
    page = await Ffetch.down(
      {
        source,
        method: 'GET',
        url: notice.url,
        id: `NoticeDetails`,
        savetofile: false,
      },
      log_tab + 1
    )
    let body = await scraping.getOneTag('.bw-release-story', page, 'text', log_tab + 1, source)
    if (!body.found) {
      lg(`Could not find Body tag`, log_tab + 1, 'warn', source)
    }
    body = body.content.trim()
    let article = `${notice.title} ${body}`.toLowerCase()
    let keywordsFound = gfinalConfig[source].SearchKeywords.filter(key =>
      article.includes(key.toLowerCase().trim())
    )
    if (keywordsFound.length > 0) {
      notice = { keywords: keywordsFound.join(' - '), ...notice }
      return notice
    } else {
      return null
    }
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}
