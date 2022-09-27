const cheerio = require('cheerio')
const tools = require(`../tools`)
var stringSimilarity = require('string-similarity')
const Ffetch = require(`../Ffetch`)

//Simplify logging
const lg = tools.lg

const { clg, typeOf } = require(`../tools`)

module.exports = {
  getGermanFreeFloatUpdates,
  getGermanSecuritiesFromWCA,
  matchOneSecurityWithHypoBank,
  matchAllSecuritiesWithHypoBank,
  getFloatFigureForOneSecurity,
}

function getGermanFreeFloatUpdates(source, log_tab) {
  return new Promise(function getGermanFreeFloatUpdates(resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        let all_shares = await getGermanSecuritiesFromWCA(source, log_tab + 1)
        let all_matches = await matchAllSecuritiesWithHypoBank(all_shares, source, log_tab + 1)
        lg(`Matched ${all_matches.length} sec from HypoBank`, log_tab + 1, 'info', source)
        all_matches = all_matches.filter(val => val != null) //filter null securities NOT FOUND
        lg(`${all_matches.length} Sec after removing NOT FOUNDS`, log_tab + 1, 'info', source)
        let all_floats_data = await getFreeFloatAllSecurities(all_matches, source, log_tab + 1)
        //Last cleanup / Adding _blank to URL
        let clean_data = await cleanUPs(source, all_floats_data, log_tab + 1)
        lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        resolve(clean_data)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function cleanUPs(source, data, log_tab) {
  return new Promise(function cleanUPs(resolve, reject) {
    ;(async () => {
      try {
        data = data.map(security => {
          return {
            similarity_ratio: security.similarity_ratio,
            isin: security.isin,
            freefloat: security.freefloat,
            freefloat_shares:
              security.freefloat === 'NOT FOUND'
                ? 'NOT FOUND'
                : Math.floor((parseFloat(security.freefloat) * parseFloat(security.adjusted_so)) / 100),
            adjusted_so: security.adjusted_so,
            name_on_site: security.name_on_site,
            name_in_db: security.name_in_db,
            symbol_on_site: security.symbol_on_site,
            symbol_in_db: security.symbol_in_db,
            market_in_db: security.market_in_db,
            freefloat_url: `<a href="${security.freefloat_url}" target="_blank">Figures</a>`,
            main_url: `<a href="${security.main_url}" target="_blank">Page</a>`,
          }
        })
        resolve(data)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getFreeFloatAllSecurities(all_shares, source, log_tab) {
  return new Promise(function getFreeFloatAllSecurities(resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        let chunks = tools.arrayToChunks(all_shares, gfinalConfig[source].chunck_size, log_tab + 1, source)
        let all_floats = []
        for (let i = 0; i < chunks.length; i++) {
          // if (i < 28) continue;
          if (i >= gfinalConfig[source].chunks_limit) {
            lg(
              `${tools.gFName(new Error())} : Chunk limit [ ${gfinalConfig[source].chunks_limit} ] reached !`,
              log_tab + 1,
              'info',
              source
            )
            lg(`END - ${tools.gFName(new Error())}`, log_tab + 1, 'info', source)
            all_floats = [].concat.apply([], all_floats) //flattern array
            resolve(all_floats)
            return
          }
          lg(``, log_tab + 1, 'info', source)
          lg(
            `${tools.gFName(new Error())} : Process chunk = <b>${i}</b> | remaining = <b>${
              chunks.length - (i + 1)
            }</b>`,
            log_tab + 2,
            'info',
            source
          )
          all_floats = all_floats.concat(
            await Promise.all(
              chunks[i].map(async one_security => {
                return await getFloatFigureForOneSecurity(source, one_security, log_tab + 1)
              })
            )
          )
          await tools.pleaseWait(gfinalConfig[source].delay_min, gfinalConfig[source].delay_max, 2)
        }
        lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        all_floats = [].concat.apply([], all_floats) //flattern array
        resolve(all_floats)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getFloatFigureForOneSecurity(source, security, log_tab) {
  return new Promise(function getFloatFigureForOneSecurity(resolve, reject) {
    ;(async () => {
      try {
        if (security.similarity_ratio === `NOT FOUND`) {
          //Security not found in site, just skip
          security.freefloat = `NOT FOUND`
          resolve(security)
          return
        }
        // let response = await tor.downloadUrlUsingTor(
        //   "HypoBank",
        //   security.freefloat_url,
        //   undefined,
        //   undefined,
        //   undefined,
        //   false,
        //   false,
        //   undefined,
        //   true,
        //   undefined,
        //   undefined,
        //   false,
        //   false,
        //   undefined,
        //   3
        // );
        // let freefloat = await getFloatFigureFromPageHTML(response.body);
        let html = await Ffetch.down(
          {
            source: `germanff`,
            method: 'POST',
            url: `https://kurse.hypovereinsbank.de/hvb-markets/ajax/stocks/overview/keyData.htm`,
            body: `id=${security.id}`,
            followAllRedirects: 'follow',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:81.0) Gecko/20100101 Firefox/81.0',
              Accept: 'application/json, text/javascript, */*; q=0.01',
              'Accept-Language': 'en-US,en;q=0.5',
              'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            },
            id: `getFloatFigure[${security.isin}]`,
            // log_req: true,
          },
          log_tab + 1
        )
        if (html === undefined) {
          security.freefloat = `NOT FOUND`
          resolve(security)
          return
        }
        let freefloat = await getFloatFigureFromPageHTML(source, html, log_tab + 1)
        security.freefloat = freefloat
        resolve(security)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getFloatFigureFromPageHTML(source, body, log_tab) {
  return new Promise(function getFloatFigureFromPageHTML(resolve, reject) {
    ;(async () => {
      try {
        const $ = cheerio.load(body)
        let freefloat = 'N/A'
        let tr_tags = $('table > tbody > tr').get()
        if (!tr_tags) {
          lg('Free Float Table is empty !', log_tab + 1, 'info', source)
          resolve(freefloat)
          return
        }
        let table_details = tr_tags.map(tr => {
          // console.log(tr);
          return {
            type: $(tr).find('td:nth-child(1)').text().replace(/\\n/g, '').trim(),
            //div.p59:nth-child(2)
            figure: $(tr).find('td:nth-child(3) > div > div:nth-child(2)').text().replace(/\\n/g, '').trim(),
          }
        })
        // console.log(table_details);
        for (let detail of table_details) {
          if (detail.type.includes('Streubesitz')) freefloat = detail.figure.replace(`,`, `.`)
        }
        resolve(freefloat)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function matchAllSecuritiesWithHypoBank(all_shares, source, log_tab) {
  return new Promise(function matchAllSecuritiesWithHypoBank(resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        let chunks = tools.arrayToChunks(all_shares, gfinalConfig[source].chunck_size, log_tab + 1, source)
        let all_matches = new Array()
        for (let i = 0; i < chunks.length; i++) {
          // if (i < 64) continue;
          if (i >= gfinalConfig[source].chunks_limit) {
            lg(
              `${tools.gFName(new Error())} : Chunk limit [ ${gfinalConfig[source].chunks_limit} ] reached !`,
              log_tab + 1,
              'info',
              source
            )
            lg(`END - ${tools.gFName(new Error())}`, log_tab + 1, 'info', source)
            all_matches = [].concat.apply([], all_matches) //flattern array
            resolve(all_matches)
            return
          }
          lg(``, log_tab + 1, 'info', source)
          lg(
            `${tools.gFName(new Error())} : Process chunk = <b>${i}</b> | remaining = <b>${
              chunks.length - (i + 1)
            }</b>`,
            log_tab + 2,
            'info',
            source
          )
          all_matches = all_matches.concat(
            await Promise.all(
              chunks[i].map(async (one_security, index) => {
                return await matchOneSecurityWithHypoBank(source, one_security, log_tab + 1)
              })
            )
          )
          await tools.pleaseWait(gfinalConfig[source].delay_min, gfinalConfig[source].delay_max, 2)
        }
        all_matches = [].concat.apply([], all_matches) //flattern array
        lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        resolve(all_matches)
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}
function matchOneSecurityWithHypoBank(source, securityfromDB, log_tab) {
  return new Promise(function matchOneSecurityWithHypoBank(resolve, reject) {
    ;(async () => {
      try {
        // Search
        // let url = `https://kurse.hypovereinsbank.de/hvb-markets/ajax/autosuggestWithIdNotation.htm?term=${securityfromDB.ISIN}`;
        let search = await Ffetch.down(
          {
            source: `germanff`,
            method: 'POST',
            url: `https://kurse.hypovereinsbank.de/hvb-markets/ajax/autosuggestWithIdNotation.html`,
            body: `term=${securityfromDB.ISIN}`,
            json: true,
            followAllRedirects: 'follow',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:81.0) Gecko/20100101 Firefox/81.0',
              Accept: 'application/json, text/javascript, */*; q=0.01',
              'Accept-Language': 'en-US,en;q=0.5',
              'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            },
            id: `matchOneSecurity[${securityfromDB.ISIN}]`,
            // log_req: true,
            // savetofile: true,
          },
          log_tab + 1
        )
        // let search = await tor.downloadUrlUsingTor(
        //   "HypoBank",
        //   url,
        //   undefined,
        //   undefined,
        //   undefined,
        //   false,
        //   true,
        //   undefined,
        //   true,
        //   undefined,
        //   undefined,
        //   false,
        //   false,
        //   undefined,
        //   2
        // );

        // let searchresults = search.body;
        let searchresults = search
        let bestmatch = await getBestMatch(source, securityfromDB, searchresults, log_tab + 1)
        if (!bestmatch) {
          //No match was found
          // lg(`No match found for this isin: ${securityfromDB.ISIN}`, 2, 'warn');
          let chosen_one = {
            similarity_ratio: `NOT FOUND`,
            isin: securityfromDB.ISIN,
            name_on_site: `NOT FOUND`,
            name_in_db: securityfromDB.IssuerName,
            symbol_on_site: `NOT FOUND`,
            symbol_in_db: securityfromDB.NewLocalCode,
            market_in_db: securityfromDB.PrimaryExchgCD,
            main_url: `NOT FOUND`,
            adjusted_so: securityfromDB.new_sos,
            id: `N/A`,
          }
          resolve(null)
          return
        }
        let similarity_ratio = bestmatch.weight //get similarity ratio
        bestmatch = bestmatch.security //keep security only
        let chosen_one = {
          similarity_ratio: `${Math.floor(similarity_ratio / 3)} %`,
          isin: bestmatch.isin,
          name_on_site: bestmatch.label,
          name_in_db: securityfromDB.IssuerName,
          symbol_on_site: bestmatch.tool,
          symbol_in_db: securityfromDB.NewLocalCode,
          market_in_db: securityfromDB.PrimaryExchgCD,
          adjusted_so: securityfromDB.new_sos,
          main_url: `https://kurse.hypovereinsbank.de/hvb-markets/stocks/Overview.htm?id=${bestmatch.id}`,
          freefloat_url: `https://kurse.hypovereinsbank.de/hvb-markets/ajax/stocks/overview/keyData.htm?id=${bestmatch.id}`,
          id: bestmatch.id,
        }
        resolve(chosen_one)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}
function getBestMatch(source, securityfromDB, searchresults, log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        // console.log(securityfromDB);
        // console.log(searchresults);
        if (!searchresults || searchresults.length == 1) {
          //Empty search result
          lg(`Empty search results for : ${securityfromDB.ISIN}`, log_tab + 1, 'info', source)
          resolve(false)
          return
        }
        let similarityweights = []
        searchresults.forEach((securityfromsite, index) => {
          // console.log(`${stringSimilarity.compareTwoStrings(securityfromDB.column2, securityfromsite.name) * 100} | ${stringSimilarity.compareTwoStrings(securityfromDB.column6.toUpperCase(), securityfromsite.label) * 100} | ${stringSimilarity.compareTwoStrings(securityfromDB.column4, securityfromsite.ticker) * 100}`);
          let thisweight =
            //Replace null values with null string
            stringSimilarity.compareTwoStrings(
              securityfromDB.IssuerName == null ? 'null' : securityfromDB.IssuerName,
              securityfromsite.label == null ? 'null' : securityfromsite.label
            ) *
              100 + //Issuer name
            stringSimilarity.compareTwoStrings(
              securityfromDB.NewLocalCode == null ? 'null' : securityfromDB.NewLocalCode,
              securityfromsite.tool == null ? 'null' : securityfromsite.tool
            ) *
              100 + //Market full name
            stringSimilarity.compareTwoStrings(
              securityfromDB.ISIN == null ? 'null' : securityfromDB.ISIN,
              securityfromsite.isin == null ? 'null' : securityfromsite.isin
            ) *
              100 //Symbol
          similarityweights.push({
            index: index,
            weight: thisweight,
            security: securityfromsite,
          })
        })
        similarityweights.sort(sortByWeights)
        resolve(similarityweights[0]) //return best match
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}
function getGermanSecuritiesFromWCA(source, log_tab) {
  return new Promise(function getGermanSecuritiesFromWCA(resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        let ISINs = await gWCADb.raw(
          `
          SELECT 
              *
          FROM
              (SELECT 
                  SCM.SecID,
                      SCM.ISIN,
                      ISUR.IssuerName,
                      SCM.SectyCD,
                      SCM.SecurityDesc,
                      SCM.PrimaryExchgCD,
                      LOCC.NewLocalCode,
                      AJUSTSO.new_sos
              FROM
                  wca.scmst AS SCM
              LEFT JOIN wca.scexh AS SCEX ON SCM.secID = SCEX.SecID
              LEFT JOIN wca.issur AS ISUR ON SCM.IssID = ISUR.IssID
              LEFT JOIN wca.lcc AS LOCC ON (SCM.SecID = LOCC.SecID
                  AND LOCC.ExchgCD = SCM.PrimaryExchgCD)
              LEFT JOIN automate_task.ajusted_sos AS AJUSTSO ON SCM.SecID = AJUSTSO.secid
              WHERE
                  SCM.SectyCD IN ('EQS', 'PRF')
                      AND SCM.PrimaryExchgCD IN ('DESSE' , 'DEBSE', 'DEFSX', 'DEXETR', 'DEDSE', 'DEMSE', 'DEHNSE', 'DEHSE', 'CHSSX')
                      AND SCM.Actflag NOT IN ('D')
                      AND SCM.ISIN NOT IN ('')
                      AND SCM.ISIN IS NOT NULL
              ORDER BY LOCC.Acttime DESC
              LIMIT 999999999) Tmp
          GROUP BY SecID
          `
        )
        lg(`Extracted ${ISINs[0].length} Securities from remote WCA DB`, log_tab + 1, 'info', source)
        lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        resolve(ISINs[0])
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

//HELPERS
function sortByWeights(a, b) {
  let comparison = 0
  if (a.weight > b.weight) {
    comparison = -1
  } else if (a.weight < b.weight) {
    comparison = 1
  }
  return comparison
}

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
