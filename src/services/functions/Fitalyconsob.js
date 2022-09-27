const cheerio = require('cheerio')
const { lg, arrayToChunks, catchError, pleaseWait } = require(`../tools`)
const Faxios = require('../Faxios')

module.exports = {
  getItalyConsobShares,
  getItalyConsobSharesInPage,
  getItalyConsobShareFloatDetails,
  getItalyConsobAllSharesFloatDetails,
  getItalyConsobFloatUpdates,
  getIssuerDetails,
}

async function getItalyConsobFloatUpdates(source, logTab) {
  try {
    //Get all shares
    let all_shares = await getItalyConsobShares(source, logTab + 1)
    let float_details = await getItalyConsobAllSharesFloatDetails(source, all_shares, logTab + 1)
    let added_adjustedff = await addWCAFields(source, float_details, logTab + 1)
    return added_adjustedff
  } catch (err) {
    catchError(err, 'getItalyConsobFloatUpdates', undefined, undefined, logTab, source)
    throw new Error(err)
  }
}

async function addWCAFields(source, allData, logTab) {
  try {
    const data = await Promise.all(
      allData.map(async issuer => {
        let details = await getIssuerDetails(source, issuer.label, logTab + 1)
        return {
          isin: details.ISIN,
          issuer: issuer.label,
          ordinaryff_p: issuer.ordinary_float,
          ordinaryff_f:
            issuer.ordinary_float !== false &&
            issuer.ordinary_float !== null &&
            issuer.ordinary_float !== undefined &&
            details.adjusted_so !== false &&
            details.adjusted_so !== null
              ? Math.floor((details.adjusted_so * parseFloat(issuer.ordinary_float)) / 100)
              : false,
          preferredff_p: issuer.preffered_float,
          preferredff_f:
            issuer.preffered_float !== false &&
            issuer.preffered_float !== null &&
            issuer.preffered_float !== undefined &&
            details.adjusted_so !== false &&
            details.adjusted_so !== null
              ? Math.floor((details.adjusted_so * parseFloat(issuer.preffered_float)) / 100)
              : false,
          adjusted_so: details.adjusted_so,
        }
      })
    )
    return data
  } catch (err) {
    catchError(err, 'addWCAFields', undefined, undefined, logTab, source)
    throw new Error(err)
  }
}

async function getIssuerDetails(source, issuer, logTab) {
  try {
    let ISINs = await gEurNxtEqDb
      .from('ItalyS_live')
      .leftJoin('rem_adjustedso', 'column1', 'ISIN')
      .select(
        {
          ISIN: 'column1',
        },
        'adjusted_so'
      )
      .where({
        column2: issuer,
      })
    if (ISINs.length == 0) {
      lg(`No ISIN found for Issuer [${issuer}]`, logTab + 1, 'info', source)
      return false
    }
    return ISINs[0]
  } catch (err) {
    catchError(err, 'getIssuerDetails', undefined, undefined, logTab, source)
    throw new Error(err)
  }
}

async function getItalyConsobAllSharesFloatDetails(source, all_shares, logTab) {
  try {
    //getfloats_chunksize
    let chunks = arrayToChunks(all_shares, gfinalConfig[source].chunck_size, logTab + 1, source)
    let all_floats = new Array()
    for (let i = 0; i < chunks.length; i++) {
      //getFloats_chunks_limit
      if (i >= gfinalConfig[source].chunks_limit) {
        lg(`Chunk limit [ ${gfinalConfig[source].chunks_limit} ] reached !`, logTab + 1, 'info', source)
        return all_floats
      }
      lg(``, logTab + 1, 'info', source)
      lg(`Process chunk = ${i} | remaining = ${chunks.length - (i + 1)}`, logTab + 1, 'info', source)
      all_floats = all_floats.concat(
        await Promise.all(
          chunks[i].map(async share => {
            let ordinary_float = await getItalyConsobShareFloatDetails(
              source,
              share.label,
              share.float_ordinary_url,
              logTab + 1
            )
            let preffered_float = await getItalyConsobShareFloatDetails(
              source,
              share.label,
              share.float_preferred_url,
              logTab + 1
            )
            if (ordinary_float) ordinary_float = ordinary_float.trim()
            if (preffered_float) preffered_float = preffered_float.trim()
            return {
              label: share.label,
              id: share.id,
              // url: `<a href="${share.url}" target="_blank">Link</a>`,
              ordinary_float: ordinary_float,
              preffered_float: preffered_float,
            }
          })
        )
      )
      await pleaseWait(gfinalConfig[source].delay_min, gfinalConfig[source].delay_max, logTab, source)
    }
    return all_floats
  } catch (err) {
    catchError(err, 'getItalyConsobAllSharesFloatDetails', undefined, undefined, logTab, source)
    throw new Error(err)
  }
}

async function getItalyConsobShareFloatDetails(source, label, URI, logTab) {
  try {
    const response = await Faxios.down(
      {
        id: `getItalyConsobShareFloatDetails[${label}]`,
        source,
        url: URI.replace('http', 'https'),
      },
      logTab + 1
    )
    let MERCATO = response.data.match(/(?:\[\s?[',"]MERCATO[',"],)(\s\d*\.\d*)(?:,)/)
    if (MERCATO) {
      return MERCATO[1]
    } else {
      return false
    }
  } catch (err) {
    catchError(err, 'getItalyConsobShareFloatDetails', undefined, undefined, logTab, source)
    throw new Error(err)
  }
}

async function getItalyConsobShares(source, logTab) {
  try {
    let all_data = new Array()
    let end_reached = false
    let page_id = 0
    while (!end_reached) {
      //getshares_page_limit
      if (page_id > gfinalConfig[source].maximum_pages) {
        lg(`Max pages [ ${gfinalConfig[source].maximum_pages} ] reached ! `, logTab + 1, 'info', source)
        return all_data
      }
      lg(`Get Italy Consob Shares page : ${page_id}`, logTab + 1, 'info', source)
      let this_page_data = await getItalyConsobSharesInPage(source, page_id, logTab + 1)
      //Somehow the previous line returns an Object instead of array, so this line is necessary
      lg(`[${this_page_data.length}] Shares in this page`, logTab + 1, 'info', source)
      if (this_page_data.length < 1) {
        return all_data
      }
      if (this_page_data.length == 0) {
        end_reached = true
        lg(`END REACHED`, logTab + 1, 'info', source)
        lg(`Total Shares extracted= ${all_data.length}`, logTab + 1, 'info', source)
        return all_data
      } else {
        all_data = all_data.concat(this_page_data)
        page_id++
      }
    }
  } catch (err) {
    catchError(err, 'getItalyConsobShares', undefined, undefined, logTab, source)
    throw new Error(err)
  }
}

async function getItalyConsobSharesInPage(source, page_id, logTab) {
  try {
    let real_page_index = page_id * 50 //Starts from 0
    let URI = `https://www.consob.it/web/consob-and-its-activities/listed-companies?viewId=azionariati_attuali&hits=228&viewres=1&search=1&firstres=${real_page_index}&resultmethod=azionariati_elenco&queryid=assetti&maxres=500&subject=asp`
    const response = await Faxios.down(
      {
        id: 'getItalyConsobSharesInPage',
        source,
        url: URI,
      },
      logTab + 1
    )
    const $ = cheerio.load(response.data)
    let lis_ignore_first_one = $('.consobResult > li').get().slice(1)
    // let filter = new RegExp("[\\t\\n\\r\\f\\v]", "gm");
    if (lis_ignore_first_one.length < 1) {
      return []
    }
    let label_href_array = $(lis_ignore_first_one).map((i, li) => {
      let label = $(li).find('div:nth-child(1) > a:nth-child(1) strong').text().replace(` - Ownership`, '')
      let href = $(li)
        .find('div:nth-child(1) > a:nth-child(1)')
        .attr('href')
        .replace(`javascript:liferayLinkHook('`, '')
        .replace(`');`, '')
      let ids = href.match(/\/(\d*?)_Az/g).map(function (val) {
        return val.replace(`/`, '').replace(`_Az`, '')
      })

      let one_share = {
        label: label,
        url: 'http://www.consob.it/web/consob-and-its-activities/listed-companies' + href,
      }
      if (ids.length > 0) {
        let main_url = one_share.url.match(/(.*)\/(?:\d*)(?:_Az\.html\?)/)
        one_share.id = ids[0]
        // one_share.ordinary_url = 'http://www.consob.it/web/consob-and-its-activities/listed-companies/documenti/assetti/' + ids[0] + '_TOrdDich.html';
        // one_share.ordinary_pref_url = 'http://www.consob.it/web/consob-and-its-activities/listed-companies/documenti/assetti/' + ids[0] + '_TVotDich.html';
        if (main_url) {
          one_share.main_url = main_url[1]
          one_share.float_ordinary_url = one_share.main_url + '/' + one_share.id + '_TOrdDich.html'
          one_share.float_ordinary_url = one_share.float_ordinary_url.replace('_proprietari', '')
          one_share.float_preferred_url = one_share.main_url + '/' + one_share.id + '_TVotDich.html'
          one_share.float_preferred_url = one_share.float_preferred_url.replace('_proprietari', '')
        } else {
          one_share.main_url = false
          one_share.float_ordinary_url = false
        }
      }
      return one_share
    })
    return label_href_array.get()
  } catch (err) {
    catchError(err, 'getItalyConsobSharesInPage', undefined, undefined, logTab, source)
    throw new Error(err)
  }
}
