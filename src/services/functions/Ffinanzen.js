const Ffetch = require(`../Ffetch`)
const scraping = require(`../scraping`)
const moment = require('moment')
const { lg, arrayToChunks, catchError, pleaseWait } = require(`../tools`)

//Simplify logging

const { clg } = require(`../tools`)

module.exports = {
  getFinanzenUpdates,
  getAllSecuritiesDetails,
  getAllSecurities,
  getSecuritiesFromPage,
  getOneSecurityDetails,
}

async function getFinanzenUpdates(source, logTab) {
  try {
    lg(`START - function`, logTab, 'info', source)
    let all_data = []
    all_data = await getAllSecurities(source, logTab + 1)
    all_data = await getAllSecuritiesDetails(source, all_data, logTab + 1)
    lg(`Extracted ${all_data.length} sec from Finanzen`, logTab + 1, 'info', source)
    all_data = await filterNonCoveredSecurities(source, all_data, logTab + 1)
    return all_data
  } catch (err) {
    catchError(err, 'getFinanzenUpdates', undefined, undefined, logTab, source)
    throw new Error(err)
  }
}

async function getAllSecuritiesDetails(source, all_shares, logTab) {
  try {
    lg(`START - getAllSecuritiesDetails`, logTab, 'info', source)
    let chunks = arrayToChunks(all_shares, gfinalConfig[source].chunck_size, logTab + 1, source)
    let all_data = []
    for (let i = 0; i < chunks.length; i++) {
      if (i >= gfinalConfig[source].chunks_limit) {
        lg(
          `function : Chunk limit [ ${gfinalConfig[source].chunks_limit} ] reached !`,
          logTab + 1,
          'info',
          source
        )
        lg(`END - function`, logTab + 1, 'info', source)
        all_data = [].concat.apply([], all_data) //flattern array
        return all_data
      }
      lg(``, logTab + 1, 'info', source)
      lg(
        `function : Process chunk = <b>${i}</b> | remaining = <b>${chunks.length - (i + 1)}</b>`,
        logTab + 2,
        'info',
        source
      )
      all_data = all_data.concat(
        await Promise.all(
          chunks[i].map(async security => {
            return await getOneSecurityDetails(source, security, logTab + 3)
          })
        )
      )
      await pleaseWait(gfinalConfig[source].delay_min, gfinalConfig[source].delay_max, logTab + 2, source)
    }
    all_data = [].concat.apply([], all_data) //flattern array
    return all_data
  } catch (err) {
    catchError(err, 'getAllSecuritiesDetails', undefined, undefined, logTab, source)
    throw new Error(err)
  }
}

async function getOneSecurityDetails(source, security, logTab) {
  try {
    let page = await Ffetch.down(
      {
        source,
        url: security.url,
        id: security.wkn,
      },
      logTab + 1
    )
    security.url = `<a href="${security.url}" target="_blank">Source</a>`
    let blocks = await scraping.getMultiTags('div.equalheights', page, 'object', logTab + 1, source)
    if (!blocks.found) {
      lg('could not find details blocks', logTab + 1, 'warn', source)
      return []
    }
    //Select the block that has title as "Stammdaten und Kennzahlen"
    let $ = blocks.$
    blocks = blocks.contents.filter(
      block => $($(block).find('div.headline-container').get()[0]).text() === 'Stammdaten und Kennzahlen'
    )
    if (blocks.length === 0) {
      lg('could not find Stammdaten und Kennzahlen Block', logTab + 1, 'warn', source)
      return []
    }
    let Trs = await scraping.getTrsFromPage(
      $(blocks[0]).html(),
      `tr`,
      gfinalConfig[source].target_tds_details,
      60,
      'text',
      logTab + 1,
      true,
      source
    )
    security.IssDate = security.Emissionsdatum
    delete security.Emissionsdatum
    Trs.map(detail => {
      if (detail.label === 'Kategorisierung') security.type = detail.value.toLowerCase()
      if (detail.label === 'ISIN') security.isin = detail.value
      if (detail.label === 'Erstes Kupondatum')
        security.firstCpDate = moment(detail.value, 'DD.MM.YYYY', true).format('YYYY-MM-DD')
      if (detail.label === 'Zinstermin Periode') security.interPayPeriod = detail.value
      if (detail.label === 'Zinslauf ab')
        security.InterRunFrom = moment(detail.value, 'DD.MM.YYYY', true).format('YYYY-MM-DD')
      if (detail.label === 'Stückelung') security.denomination = detail.value
      if (detail.label === 'Nachrang') {
        if (detail.value === 'Nein') {
          security.subOrdinates = 'N'
        } else if (detail.value === 'Ja') {
          security.subOrdinates = 'Y'
        } else {
          security.subOrdinates = detail.value
        }
      }
      if (detail.label === 'Kündigungsoption am')
        security.callDate = moment(detail.value, 'DD.MM.YYYY', true).format('YYYY-MM-DD')
      if (detail.label === 'Kündigung zu Rücknahmepreis') {
        detail.value = `${detail.value.replace(',', '.')}000`
        security.callPrice = detail.value
      }
      if (detail.label === 'Emissionsvolumen*') security.upToAmount = detail.value
      if (detail.label === 'Emissionswährung') security.currency = detail.value
    })
    //Fill missing fields
    //Test case 'XS2310118976' revert if back when you finish
    security = Object.assign(
      {},
      {
        isin: '',
        IssDate: '',
        firstCpDate: '',
        InterRunFrom: '',
        subOrdinates: '',
        callDate: '',
        callPrice: '',
        Kupon: '',
        url: '',
        label: '',
        interPayPeriod: '',
        wkn: '',
        type: '',
        denomination: '',
        upToAmount: '',
        currency: '',
      },
      security
    )
    return security
  } catch (err) {
    catchError(err, 'getOneSecurityDetails', undefined, undefined, logTab, source)
    throw new Error(err)
  }
}

async function getAllSecurities(source, logTab) {
  try {
    lg(`START - getAllSecurities`, logTab, 'info', source)
    var page_ids = Array.from(Array(gfinalConfig[source].maximum_pages).keys())
    page_ids.shift() //remove index 0
    let chunks = arrayToChunks(page_ids, gfinalConfig[source].chunck_size, logTab + 1, source)
    let all_details = []
    for (let i = 0; i < chunks.length; i++) {
      // if (i < 40) continue;
      if (i >= gfinalConfig[source].chunks_limit) {
        lg(`Chunk limit [ ${gfinalConfig[source].chunks_limit} ] reached !`, logTab + 1, 'info', source)
        lg(`Extrated ${all_details.length} Securities`, logTab + 1, 'info', source)
        return all_details
      }
      lg(``, logTab + 1, 'info', source)
      lg(
        `Process chunk = <b>${i}</b> | remaining = <b>${chunks.length - (i + 1)}</b>`,
        logTab + 1,
        'info',
        source
      )
      let sec_groups = await Promise.all(
        chunks[i].map(async page_id => {
          return await getSecuritiesFromPage(source, page_id, logTab + 1)
        })
      )
      all_details = all_details.concat(sec_groups)
      let counts = sec_groups.map(grp => grp.length)
      all_details = [].concat.apply([], all_details) //flattern the array
      if (counts.includes(0)) {
        lg(`END reached`, logTab + 1, 'info', source)
        break
      }
      // all_details = Array.from(new Set(all_details)); //Remove duplicates
      await pleaseWait(gfinalConfig[source].delay_min, gfinalConfig[source].delay_max, logTab + 1, source)
    }
    lg(`Extrated ${all_details.length} Securities`, logTab + 1, 'info', source)
    return all_details
  } catch (err) {
    catchError(err, 'getAllSecurities', undefined, undefined, logTab, source)
    throw new Error(err)
  }
}

async function getSecuritiesFromPage(source, page_id, logTab) {
  try {
    let page = await Ffetch.down(
      {
        source,
        url: `https://www.finanzen.net/anleihen/neuemissionen?p=${page_id}`,
        id: `getPage:${page_id}`,
      },
      logTab + 1
    )
    let Trs = await scraping.getTrsFromPage(
      page,
      `.table-responsive > table:nth-child(1) > tbody tr`,
      gfinalConfig[source].target_tds,
      99999,
      'html',
      logTab + 1,
      true,
      source
    )
    if (Trs.length === 0) {
      clg(`Not securities found. PageID[${page_id}]`, 'info', logTab + 1, source)
      return []
    }
    Trs = await Promise.all(
      Trs.map(async sec => {
        sec.url = `https://www.finanzen.net${await scraping.getAttrFromHTMLTag(
          {
            html: sec.name_tag,
            selector: 'a',
            attr: 'href',
          },
          logTab + 1
        )}`
        sec.label = await scraping.getTextFromHTMLTag(
          {
            html: sec.name_tag,
            selector: 'a',
          },
          logTab + 1
        )
        sec.Emissionsdatum = moment(sec.Emissionsdatum, 'DD.MM.YY', true).format('YYYY-MM-DD')
        delete sec.name_tag
        return sec
      })
    )
    return Trs
  } catch (err) {
    catchError(err, 'getSecuritiesFromPage', undefined, undefined, logTab, source)
    throw new Error(err)
  }
}
//No more used
async function filterNonCoveredSecurities(source, all_sec, logTab) {
  try {
    lg(`START - filterNonCoveredSecurities`, logTab, 'info', source)
    // let conditions = ['commercial papers', 'certificates of deposit', 'asset backed']
    // 2021-10-11 Following email from DataTeam, please include all categories
    let conditions = []
    all_sec = all_sec.filter(sec => !conditions.some(el => sec.type.includes(el)))
    // lg(
    //   `all_sec[${all_sec.length}] after filtering ("commercial", "certificates", "assetB")`,
    //   logTab + 1,
    //   'warn',
    //   source
    // )
    return all_sec
  } catch (err) {
    catchError(err, 'getFinanzenUpdates', undefined, undefined, logTab, source)
    throw new Error(err)
  }
}
