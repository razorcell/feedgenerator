const { gFName, catchError, pleaseWait, arrayToChunks, clg, lg } = require(`../tools`)
const Faxios = require(`../Faxios`)
const scraping = require(`../scraping`)
const { isArray } = require('lodash')

module.exports = {
  getLesEchosUpdates,

  getAllNotices,
  getNoticesForPage,

  getAllNoticesDetails,
  getOneNoticeDetails,
}

async function getLesEchosUpdates(source, log_tab) {
  try {
    lg(`START - ${gFName(new Error())}`, log_tab, 'info', source)
    let allData = []
    let allNotices = await getAllNotices(source, log_tab + 1)
    allData = await getAllNoticesDetails(source, allNotices, log_tab + 1)
    allData = await addURLsTags(source, allData, log_tab + 1)
    allData = await orderColumns(source, allData, log_tab + 1)
    lg(`Extracted ${allData.length} Relevant Notices From globenewswire`, log_tab + 1, 'info', source)
    lg(`END - ${gFName(new Error())}`, log_tab, 'info', source)
    return allData
  } catch (err) {
    catchError(err, gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}

async function orderColumns(source, allData, log_tab) {
  lg(`START - ${gFName(new Error())}`, log_tab, 'info', source)
  allData = allData.map(notice => {
    return { title: notice.title, keywords: notice.keywords, date: notice.date, url: notice.url }
  })
  lg(`END - ${gFName(new Error())}`, log_tab, 'info', source)
  return allData
}

async function addURLsTags(source, all_data, log_tab) {
  try {
    all_data = all_data.map(row => {
      row.url = `<a href="${row.url}" target="_blank">Source</a>`
      return row
    })
    return all_data
  } catch (err) {
    catchError(err, gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}
async function getAllNotices(source, log_tab) {
  try {
    lg(`START - ${gFName(new Error())}`, log_tab, 'info', source)
    var page_ids = Array.from(Array(gfinalConfig[source].maximum_pages).keys())
    page_ids.shift() //remove index 0
    let chunks = arrayToChunks(page_ids, gfinalConfig[source].chunck_size, log_tab + 1, source)
    let allNotices = []
    for (let i = 0; i < chunks.length; i++) {
      // if (i < 40) continue;
      if (i >= gfinalConfig[source].chunks_limit) {
        lg(`Chunk limit [ ${gfinalConfig[source].chunks_limit} ] reached !`, log_tab + 1, 'info', source)
        lg(`Extrated ${allNotices.length} Notices`, log_tab + 1, 'info', source)
        return allNotices.filter(notice => notice != null)
      }
      lg(``, log_tab + 1, 'info', source)
      lg(
        `Process chunk = <b>${i}</b> | remaining = <b>${chunks.length - (i + 1)}</b>`,
        log_tab + 1,
        'info',
        source
      )
      let thisPageNotices = await Promise.all(
        chunks[i].map(async page_id => {
          return await getNoticesForPage(source, page_id, log_tab + 1)
        })
      )
      allNotices = allNotices.concat(thisPageNotices)
      allNotices = [].concat.apply([], allNotices) //flattern the array
      if (thisPageNotices.length === 0) {
        lg(`END reached`, log_tab + 1, 'info', source)
        break
      }
      // all_details = Array.from(new Set(all_details)); //Remove duplicates
      await pleaseWait(gfinalConfig[source].delay_min, gfinalConfig[source].delay_max, log_tab + 1, source)
    }
    allNotices = allNotices.filter(notice => notice != null)
    lg(`Extrated ${allNotices.length} Notices`, log_tab + 1, 'info', source)
    return allNotices
  } catch (err) {
    catchError(err, gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}

async function getNoticesForPage(source, pageID, log_tab) {
  try {
    let res = await Faxios.down(
      {
        id: `getNoticesForPage ${pageID}`,
        source,
        url: `https://investir.lesechos.fr/actualites/toute-l-actualite.php?filtre=recents&page=${pageID}`,
      },
      log_tab + 1
    )
    let articles = await scraping.getMultiTags('.row', res.data, 'object', log_tab + 1, source, 9999)
    if (!articles.found || articles.contents.length === 0) {
      lg(`Could not find any articles for this pageID[${pageID}]`, log_tab + 1, 'warn', source)
      return []
    }
    lg(`${articles.contents.length} Article(s) found for pageID ${pageID}`, log_tab + 1, 'info', source)
    let $ = articles.$
    articles = articles.contents.map((div, indx) => {
      const a_tags = $(div).find('a').get()
      if (!isArray(a_tags) && a_tags.length > 0) {
        lg(`Could not find any A tags in this div index ${indx}`, log_tab + 1, 'warn', source)
        return null
      } else {
        return {
          url: $(a_tags).attr('href'),
          title: $(a_tags)
            .text()
            .trim()
            .replace(/\r\n|\n|\r|\t/gm, '')
            .replace(/\s+/g, ' '),
        }
      }
    })
    return articles
  } catch (err) {
    catchError(err, gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}

async function getAllNoticesDetails(source, allNotices, log_tab) {
  try {
    lg(`START - ${gFName(new Error())}`, log_tab, 'info', source)
    let chunks = arrayToChunks(allNotices, gfinalConfig[source].chunck_size, log_tab + 1, source)
    let all_data = []
    for (let i = 0; i < chunks.length; i++) {
      if (i >= gfinalConfig[source].chunks_limit) {
        lg(
          `${gFName(new Error())} : Chunk limit [ ${gfinalConfig[source].chunks_limit} ] reached !`,
          log_tab + 1,
          'info',
          source
        )
        lg(`END - ${gFName(new Error())}`, log_tab + 1, 'info', source)
        all_data = [].concat.apply([], all_data) //flattern array
        return all_data.filter(notice => notice != null)
      }
      lg(``, log_tab + 1, 'info', source)
      lg(
        `${gFName(new Error())} : Process chunk = ${i} | remaining = ${chunks.length - (i + 1)}`,
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
      await pleaseWait(gfinalConfig[source].delay_min, gfinalConfig[source].delay_max, log_tab + 2, source)
    }
    all_data = [].concat.apply([], all_data) //flattern array
    lg(`END - ${gFName(new Error())}`, log_tab, 'info', source)
    return all_data.filter(notice => notice != null)
  } catch (err) {
    catchError(err, gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}

async function getOneNoticeDetails(source, notice, log_tab) {
  try {
    let page = ``
    notice.url = `https://investir.lesechos.fr${notice.url}`
    page = (
      await Faxios.down(
        {
          source,
          url: notice.url,
          id: `NoticeDetails`,
        },
        log_tab + 1
      )
    ).data
    let timeTag = await scraping.getOneTag('.meta > time:nth-child(2)', page, 'object', log_tab + 1, source)
    if (!timeTag.found) {
      lg(`Could not find Time tag`, log_tab + 1, 'warn', source)
    } else {
      const $ = timeTag.$
      notice.date = timeTag.content.prop('datetime')
    }
    let body = await scraping.getOneTag('div[itemprop=articleBody]', page, 'text', log_tab + 1, source)
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
    catchError(err, gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}
