const cheerio = require('cheerio')
const tor = require(`../tor`)
const tools = require(`../tools`)

//Simplify logging
const lg = tools.lg

const { clg, typeOf } = require(`../tools`)

module.exports = {
  getRosarioUpdates,
  getSecuritiesFromPage,
  getAllSecurities,
  getOneIssuerDetails,
  getAllIssuersDetails,
}

function getRosarioUpdates() {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        let all_issuers = await getAllSecurities()
        let all_details = await getAllIssuersDetails(all_issuers)
        resolve(all_details)
        return
      } catch (err) {
        lg(`getRosarioUpdates : ${err.message}`, 1, 'error')
        reject(`getRosarioUpdates : ${err.message}`)
      }
    })()
  })
}

function getAllIssuersDetails(issuers_list) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        lg(`Step 2: Get All issuers details`, 1)
        let chunks = tools.arrayToChunks(issuers_list, gfinalConfig.rosario.all_details_chunck_size, 2)
        let all_details = []
        for (let i = 0; i < chunks.length; i++) {
          // if (i < 28) continue;
          if (i >= gfinalConfig.rosario.all_details_chunks_limit) {
            lg(`Chunk limit [ ${gfinalConfig.rosario.all_details_chunks_limit} ] reached !`, 2)
            resolve([].concat.apply([], all_details))
            return
          }
          lg(``)
          lg(`Process chunk = ${i} | remaining = ${chunks.length - (i + 1)}`, 2)

          all_details = all_details.concat(
            await Promise.all(
              chunks[i].map(async one_issuer => {
                return await getOneIssuerDetails(one_issuer)
              })
            )
          )

          await tools.pleaseWait(6, 10, 2)
        }
        resolve([].concat.apply([], all_details))
        return
      } catch (err) {
        lg(`getFreeFloatAllSecurities:  ${err.message}`, 2, 'error')
        reject(`getFreeFloatAllSecurities: ${err.message}`)
      }
    })()
  })
}

function getOneIssuerDetails(issuer) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        let all_updates_for_this_security = []
        let response = await tor.downloadUrlUsingTor(
          'Rosario',
          issuer.details_url,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          3
        )
        //MAV table : div.field--name-field-mav-resoluciones-mav table tbody tr
        const $ = cheerio.load(response.body)
        let MAV_trs = $('div.field--name-field-mav-resoluciones-mav table tbody tr').get()
        if (!Array.isArray(MAV_trs) || MAV_trs.length < 0) {
          lg(`MAV table not found or Empty`, 2)
        }
        let MAV_details = []
        $(MAV_trs).map((i, tr) => {
          let tds = $(tr).find('td').get()
          let one_tr_info = $(tds).map((indx, td) => {
            let one_info = $(td).text().replace(/\s\s+/g, '')
            return one_info
          })
          one_tr_info = one_tr_info.get()
          if (one_tr_info.length == 1) {
            one_tr_info.push('', '')
          }
          one_tr_info.unshift('Resoluciones MAV')
          one_tr_info.unshift(issuer.issuer)
          one_tr_info.push(`<a href="${issuer.details_url}" target="_blank">Source</a>`)
          MAV_details.push(one_tr_info)
          return one_tr_info
        })
        let AVISOS_trs = $('div.field--name-field-mav-avisos table tbody tr').get()
        if (!Array.isArray(MAV_trs) || MAV_trs.length < 0) {
          lg(`AVISOS table not found or Empty`, 2)
        }

        let AVISOS_details = []
        $(AVISOS_trs).map((i, tr) => {
          let tds = $(tr).find('td').get()
          let one_tr_info = $(tds).map((indx, td) => {
            let one_info = $(td).text().replace(/\s\s+/g, '').replace(/\t+/g, '')
            // console.log(one_info);
            return one_info
          })
          // console.log(one_tr_info);
          one_tr_info = one_tr_info.get()

          if (one_tr_info.length == 1) {
            //No rows in this table
            one_tr_info.push('', '')
          }
          one_tr_info.unshift('Avisos')
          one_tr_info.unshift(issuer.issuer)
          one_tr_info.push('', '')
          one_tr_info.push(`<a href="${issuer.details_url}" target="_blank">Source</a>`)
          AVISOS_details.push(one_tr_info)
          return one_tr_info
        })
        all_updates_for_this_security = AVISOS_details.concat(MAV_details)
        resolve(all_updates_for_this_security)
        return
      } catch (err) {
        lg(`getOneIssuerDetails: ${err.message}`, 2, 'error')
        reject(`getOneIssuerDetails: ${err.message}`)
      }
    })()
  })
}

function getAllSecurities() {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        lg(`Step 1: Get All securities`, 1)
        let end_reached = false
        let page_id = 1
        let all_securities = []
        while (!end_reached) {
          let this_page_securities = await getSecuritiesFromPage(page_id)
          if (this_page_securities.length == 0) {
            lg(`End Reached at page ID[${page_id}]`, 2)
            end_reached = true
            break
          }
          lg(`This page has ${this_page_securities.length} securities`, 4)
          all_securities = all_securities.concat(this_page_securities)
          page_id++
        }
        resolve(all_securities)
        return
      } catch (err) {
        lg(`getAllSecurities:  ${err.message}`, 2, 'error')
        reject(`getAllSecurities: ${err.message}`)
      }
    })()
  })
}

function getSecuritiesFromPage(page_id) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        let securities = []
        let response = await tor.downloadUrlUsingTor(
          'Rosario',
          `https://www.bcr.com.ar/es/mercados/mav/mav-sitio/obligaciones-negociables?=&page=${page_id}`,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          3
        )
        if (response.body.includes('No se encontraron resultados para mostrar')) {
          // lg(`End Reached at page ID[${page_id}]`, 2);
          resolve([])
          return
        }
        securities = await getIssuerFromPageHTML(response, page_id)
        resolve(securities)
        return
      } catch (err) {
        lg(`getSecuritiesFromPage : ${err.message}`, 4, 'error')
        reject(`getSecuritiesFromPage : ${err.message}`)
      }
    })()
  })
}

function getIssuerFromPageHTML(response, page_id) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        const $ = cheerio.load(response.body)
        let tds = $('.table td').get()
        if (!Array.isArray(tds) || tds.length < 0) {
          lg(`Something is wrong, could not get Tds inside this page ID[${page_id}]`, 2, 'error')
          resolve(false)
          return
        }
        let one_security = $(tds).map((i, td) => {
          let issuer = $(td).contents().first().text().replace(/\s\s+/g, '')
          let url = $(td).find('a').attr('href')
          return {
            issuer: issuer,
            details_url: `https://www.bcr.com.ar${url}`,
          }
        })
        resolve(one_security.get())
      } catch (err) {
        lg(`getIssuerFromPageHTML: ${err.message}`, 2, 'error')
        reject(`getIssuerFromPageHTML: ${err.message}`)
      }
    })()
  })
}

//HELPERS

// `
// // SELECT
// //         *
// //     FROM
// //         (SELECT
// //             scmst.SecID,
// //                 ISIN,
// //                 IssuerName,
// //                 SectyCD,
// //                 SecurityDesc,
// //                 PrimaryExchgCD,
// //                 NewLocalCode,
// //                 SharesOutstanding
// //         FROM
// //             scmst
// //         LEFT JOIN scexh ON scmst.secID = scexh.SecID
// //         LEFT JOIN issur ON scmst.IssID = issur.IssID
// //         LEFT JOIN lcc ON (scmst.SecID = lcc.SecID
// //             AND lcc.ExchgCD = PrimaryExchgCD)
// //         WHERE
// //             SectyCD IN ('EQS')
// //                 AND PrimaryExchgCD IN ('DESSE' , 'DEBSE', 'DEFSX', 'DEXETR', 'DEDSE', 'DEMSE', 'DEHNSE', 'DEHSE')
// //                 AND scmst.Actflag NOT IN ('D')
// //                 AND ISIN NOT IN ('')
// //                 AND ISIN IS NOT NULL
// //         ORDER BY lcc.Acttime DESC
// //         LIMIT 999999999) Tmp
// //     GROUP BY SecID`
