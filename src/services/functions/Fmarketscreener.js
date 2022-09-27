const tools = require(`../tools`)
var stringSimilarity = require('string-similarity')
const Ffetch = require(`../Ffetch`)
const scraping = require(`../scraping`)

//Simplify logging
const lg = tools.lg

const { clg } = require(`../tools`)

module.exports = {
  getMarketScreenerFreeFloatUpdates,
  getEuronextSecuritiesFromDB,
  matchAllSecuritiesWithMarketScreener,
  getSearchResultsFromPageHTML,
  matchOneSecurityWithMarketScreener,
  getMarketScreenerFloatFigureForOneSecurity,
  getMarketScreenerFreeFloatAllSecurities,
  cleanUpData,
  getMiddleEastSecuritiesFromWCA,
}

function getMarketScreenerFreeFloatUpdates(source, log_tab) {
  return new Promise(function getMarketScreenerFreeFloatUpdates(resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        let all_shares = []
        if (source === 'marketscreener_ara') {
          all_shares = await getMiddleEastSecuritiesFromWCA(source, log_tab)
        } else {
          all_shares = await getEuronextSecuritiesFromDB(source, log_tab)
        }
        lg(`Extracted ${all_shares.length} shares from DB`, log_tab + 1, 'info', source)
        let all_matches = (
          await matchAllSecuritiesWithMarketScreener(all_shares, source, log_tab + 1)
        ).filter(sec => sec != null) //filter null securities NOT FOUND
        lg(`Found ${all_matches.length} in MarketScreener`, log_tab + 1, 'info', source)
        let clean_data = await cleanUpData(
          await getMarketScreenerFreeFloatAllSecurities(all_matches, source, log_tab + 1),
          source,
          log_tab + 1
        )
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

function cleanUpData(all_floats_data, source, log_tab) {
  return new Promise(function cleanUpData(resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        let clean_data = all_floats_data.map(security => {
          // let freefloat_decimal = parseFloat(security.free_float_figure.replace(/,/g, ".").replace(/%/g, ""));
          // let adjusted_so_decimal = parseFloat(security.adjusted_so);
          // let adjusted_freefloat = Math.floor((parseFloat(security.adjusted_so) * freefloat_decimal) / 100);
          // lg(`FF [${security.free_float_figure}] > Decimal [${freefloat_decimal}]`);
          // lg(`Adju SO [${security.adjusted_so}] > Float []`);
          return {
            similarity_ratio: security.similarity_ratio,
            isin: security.isin,
            free_float_figure: security.free_float_figure,
            adjusted_ff:
              security.adjusted_so !== null && security.free_float_figure !== 'N/A'
                ? Math.floor(
                    (security.adjusted_so *
                      parseFloat(security.free_float_figure.replace(/,/g, '.').replace(/%/g, ''))) /
                      100
                  )
                : 'N/A',
            name_on_site: security.name_on_site,
            name_in_db: security.name_in_db,
            symbol_on_site: security.symbol_on_site,
            symbol_in_db: security.symbol_in_db,
            market_on_site: security.market_on_site,
            market_in_db: security.market_in_db,
            float_url: `<a href="${security.main_url}" target="_blank">Source</a>`,
          }
        })
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
function getMarketScreenerFreeFloatAllSecurities(all_shares, source, log_tab) {
  return new Promise(function getMarketScreenerFreeFloatAllSecurities(resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        let chunks = tools.arrayToChunks(
          all_shares,
          gfinalConfig[source].getfloats_chunck_size,
          log_tab + 1,
          source
        )
        let all_floats = []
        for (let i = 0; i < chunks.length; i++) {
          // if (i < 70) continue;
          // if (i > 80) continue;

          if (i >= gfinalConfig[source].getfloats_chunks_limit) {
            lg(
              `${tools.gFName(new Error())} : Chunk limit [ ${
                gfinalConfig[source].getfloats_chunks_limit
              } ] reached !`,
              log_tab + 1,
              'info',
              source
            )
            lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
            resolve(all_floats)
            return
          }
          lg(``, log_tab + 1, 'info', source)
          lg(
            `${tools.gFName(new Error())} : Process chunk = ${i} | remaining = ${chunks.length - (i + 1)}`,
            log_tab + 2,
            'info',
            source
          )
          all_floats = all_floats.concat(
            await Promise.all(
              chunks[i].map(async one_security => {
                return await getMarketScreenerFloatFigureForOneSecurity(
                  one_security,
                  source,
                  log_tab + 3,
                  'info',
                  source
                )
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
        lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        resolve(all_floats)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getMarketScreenerFloatFigureForOneSecurity(security, source, log_tab) {
  return new Promise(function getMarketScreenerFloatFigureForOneSecurity(resolve, reject) {
    ;(async () => {
      try {
        // lg(`START - ${tools.gFName(new Error())}`, log_tab, "info", source);
        let response = await Ffetch.down(
          {
            source,
            url: security.main_url,
            id: security.name_in_db,
          },
          log_tab + 1
        )
        let searchresults = (
          await scraping.getTrsFromPage(
            response,
            'table.tabElemNoBor tr',
            gfinalConfig[source].free_float_target_tds,
            undefined,
            'text',
            log_tab + 1,
            true,
            source
          )
        ).filter(row => row.label == 'Free-Float')
        if (searchresults.length == 1) security['free_float_figure'] = searchresults[0].value
        else security['free_float_figure'] = 'N/A'
        // lg(`END - ${tools.gFName(new Error())}`, log_tab, "info", source);
        resolve(security)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function matchAllSecuritiesWithMarketScreener(securitiesFromDB, source = 'marketscreener', log_tab = 1) {
  return new Promise(function matchAllSecuritiesWithMarketScreener(resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        let chunks = tools.arrayToChunks(
          securitiesFromDB,
          gfinalConfig[source].matchshares_chunck_size,
          log_tab + 1,
          source
        )
        let all_matches = new Array()
        for (let i = 0; i < chunks.length; i++) {
          // clg(i);
          // if (i < 4) continue;
          // if (i > 5) continue;
          if (i >= gfinalConfig[source].matchshares_chunks_limit) {
            lg(
              `${tools.gFName(new Error())} : Chunk limit [ ${
                gfinalConfig[source].matchshares_chunks_limit
              } ] reached !`,
              log_tab + 1,
              'info',
              source
            )
            lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
            resolve(all_matches)
            return
          }
          lg(``, log_tab + 1, 'info', source)
          lg(
            `${tools.gFName(new Error())} : Process chunk = ${i} | remaining = ${chunks.length - (i + 1)}`,
            log_tab + 1,
            'info',
            source
          )
          all_matches = all_matches.concat(
            await Promise.all(
              chunks[i].map(async one_security => {
                // clg(chunks[i]);
                return await matchOneSecurityWithMarketScreener(one_security, source, log_tab + 2)
              })
            )
          )
          await tools.pleaseWait(
            gfinalConfig[source].delay_min,
            gfinalConfig[source].delay_max,
            log_tab + 3,
            source
          )
        }
        lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        resolve(all_matches)
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function matchOneSecurityWithMarketScreener(securityfromDB, source = 'marketscreener', log_tab = 1) {
  return new Promise(function matchOneSecurityWithMarketScreener(resolve, reject) {
    ;(async () => {
      try {
        let bestmatch = await getBestMatch(
          source,
          securityfromDB,
          await getSearchResultsFromPageHTML(securityfromDB, source, log_tab + 1),
          log_tab + 1
        )

        if (!bestmatch) {
          //No match was found
          lg(`No match found for this isin: ${securityfromDB.column1}`, log_tab + 1, 'warn', source)
          // let chosen_one = {
          //   similarity_ratio: `NOT FOUND`,
          //   isin: securityfromDB.column1,
          //   adjusted_so: securityfromDB.adjusted_so,
          //   name_on_site: `NOT FOUND`,
          //   name_in_db: securityfromDB.column2,
          //   symbol_on_site: `NOT FOUND`,
          //   symbol_in_db: securityfromDB.column4,
          //   market_on_site: `NOT FOUND`,
          //   market_in_db: securityfromDB.column6,
          //   main_url: `NOT FOUND`,
          // };
          // resolve(chosen_one);
          resolve(null)
          return
        }
        let similarity_ratio = bestmatch.weight //get similarity ratio
        bestmatch = bestmatch.security //keep security only
        let chosen_one = {
          similarity_ratio: `${Math.floor(similarity_ratio / 3)}`,
          isin: securityfromDB.column1,
          adjusted_so: securityfromDB.adjusted_so,
          name_on_site: bestmatch.label,
          name_in_db: securityfromDB.column2,
          symbol_on_site: bestmatch.symbol,
          symbol_in_db: securityfromDB.column4,
          market_on_site: bestmatch.market,
          market_in_db: securityfromDB.column6,
          main_url: `https://www.marketscreener.com${bestmatch.main_url}`,
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

function getSearchResultsFromPageHTML(securityfromDB, source = 'marketscreener', log_tab = 1) {
  return new Promise(function getSearchResultsFromPageHTML(resolve, reject) {
    ;(async () => {
      try {
        let url = `https://www.marketscreener.com/search/?mots=${securityfromDB.column1}`
        let response = await Ffetch.down(
          {
            source: source,
            url: url,
            savetofile: false,
            id: securityfromDB.column2,
          },
          log_tab + 1
        )
        let result_type_table = await scraping.getOneTag(
          'td.tabTitleLeftWhite',
          response,
          'object',
          log_tab + 1,
          source
        )
        let searchresults = []
        if (!result_type_table.found) {
          resolve([])
          return
        }
        let $ = result_type_table.$
        let result_type = $($(result_type_table.content).find('b').get()[0]).text()
        lg(`Results type = ${result_type}`, log_tab + 1, 'info', source)
        if (!result_type.includes('Instruments')) {
          lg(`Results are not instruments type [ ${result_type} ]`, log_tab + 1, 'info', source)
          resolve([])
          return
        }
        // if($($(result_type_table.content).find('b').get()[0]).text())
        searchresults = await scraping.getTrsFromPage(
          response,
          'table#ALNI0 tbody tr',
          gfinalConfig[source].target_tds,
          undefined,
          'html',
          log_tab + 1,
          true,
          source
        )
        searchresults.shift() //removes header
        searchresults = Promise.all(
          searchresults.map(async one_sec => {
            return {
              label: await scraping.getTextFromHTMLTag(
                {
                  html: one_sec.label,
                  selector: 'a',
                },
                log_tab + 2
              ),
              symbol: one_sec.symbol,
              market: one_sec.market,
              type: one_sec.type,
              main_url: await scraping.getAttrFromHTMLTag(
                {
                  html: one_sec.label,
                  selector: 'a',
                  attr: 'href',
                },
                log_tab + 2
              ),
            }
          })
        )
        // }
        resolve(searchresults)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getBestMatch(source, securityfromDB, searchresults, log_tab = 1) {
  return new Promise(function getBestMatch(resolve, reject) {
    ;(async () => {
      try {
        if (searchresults.length == 0) {
          //Empty search result
          lg(`Empty search results for : ${securityfromDB.column1}`, log_tab + 1, 'info', source)
          resolve(false)
          return
        }
        let similarityweights = []
        searchresults.forEach((securityfromsite, index) => {
          // console.log(`${stringSimilarity.compareTwoStrings(securityfromDB.column2, securityfromsite.name) * 100} | ${stringSimilarity.compareTwoStrings(securityfromDB.column6.toUpperCase(), securityfromsite.label) * 100} | ${stringSimilarity.compareTwoStrings(securityfromDB.column4, securityfromsite.ticker) * 100}`);
          let thisweight = 0
          for (let key of Object.keys(securityfromDB)) {
            if (securityfromDB[key] !== null) securityfromDB[key] = `${securityfromDB[key]}`.toUpperCase()
          }
          for (let key of Object.keys(securityfromsite)) {
            if (securityfromsite[key] !== null && key != 'main_url')
              securityfromsite[key] = `${securityfromsite[key]}`.toUpperCase()
          }
          // if (true) {
          //Arabic countries
          // clg(securityfromDB);
          // clg(securityfromsite);
          if (securityfromDB.column2 !== null) {
            clg(
              `comparing [${securityfromDB.column2}] and [${securityfromsite.label}]`,
              log_tab + 2,
              'info',
              source
            )
            // console.info("sim = ", stringSimilarity.compareTwoStrings(securityfromDB.column2, securityfromsite.label));
            thisweight =
              thisweight +
              stringSimilarity.compareTwoStrings(securityfromDB.column2, securityfromsite.label) * 100
            // clg(thisweight);
          }
          if (securityfromDB.column6 !== null) {
            clg(
              `comparing [${securityfromDB.column6}] and [${securityfromsite.market}]`,
              log_tab + 2,
              'info',
              source
            )
            thisweight +=
              stringSimilarity.compareTwoStrings(securityfromDB.column6, securityfromsite.market) * 100
            // clg(thisweight);
          }
          if (securityfromDB.column4 !== null) {
            clg(
              `comparing [${securityfromDB.column4}] and [${securityfromsite.symbol}]`,
              log_tab + 2,
              'info',
              source
            )
            thisweight +=
              stringSimilarity.compareTwoStrings(securityfromDB.column4, securityfromsite.symbol) * 100
            // clg(thisweight);
          }
          // }
          // else {
          //   thisweight =
          //     stringSimilarity.compareTwoStrings(securityfromDB.column2, securityfromsite.label) * 100 + //Issuer name
          //     stringSimilarity.compareTwoStrings(securityfromDB.column6.toUpperCase(), securityfromsite.market) * 100 + //Market full name
          //     stringSimilarity.compareTwoStrings(securityfromDB.column4, securityfromsite.symbol) * 100; //Symbol
          // }
          //
          // clg(thisweight);
          similarityweights.push({
            index: index,
            weight: thisweight,
            security: securityfromsite,
          })
          // console.log(Math.floor(thisweight / 3));
        })
        similarityweights.sort(tools.sortByWeights)
        let best_match = similarityweights[0]
        lg(
          `Best Match: similarity[${best_match.weight}] -> ${JSON.stringify(best_match.security)}`,
          log_tab + 1,
          'info',
          source
        )
        // clg(similarityweights);
        resolve(similarityweights[0]) //return best match
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getEuronextSecuritiesFromDB(source, log_tab) {
  return new Promise(function getEuronextSecuritiesFromDB(resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        let ISINs = await gEurNxtEqDb
          .from('EurNxtEq_live')
          .leftJoin('rem_adjustedso', 'column1', 'ISIN')
          .select(
            'column1',
            'column2',
            'column3',
            'column4',
            { column6: 'column10' },
            { column7: 'column11' },
            'ISIN',
            'adjusted_so'
          )
          .whereNotIn('column11', ['Euronext Expert Market'])
          .whereNotIn('column10', ['1'])
          .orderBy('column2', 'asc')
        lg(`Extracted ${ISINs.length} Securities Local EurNxT Source Table`, log_tab + 1, 'info', source)
        lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        resolve(ISINs)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getMiddleEastSecuritiesFromWCA(source = 'marketscreener', log_tab = 1) {
  return new Promise(function getMiddleEastSecuritiesFromWCA(resolve, reject) {
    ;(async () => {
      try {
        lg(`Get all Middle East Securities from remote WCA DB`, log_tab + 1, 'info', source)
        let ISINs = await gWCADb.raw(
          `
          SELECT 
              *
          FROM
              (SELECT
                SCM.ISIN as column1,
                ISUR.IssuerName as column2,
                ISUR.IssuerName as column3,
                LOCC.NewLocalCode as column4,
                SCMKT.MktSegment as column6,
                SCM.PrimaryExchgCD as column7,
                SCM.ISIN as ISIN,
                AJUSTSO.new_sos as adjusted_so,
                SCEX.SecID                 
              FROM
                  wca.scmst AS SCM
              LEFT JOIN wca.scexh AS SCEX ON SCM.secID = SCEX.SecID
              LEFT JOIN mktsg AS SCMKT ON SCEX.MktsgID = SCMKT.MktsgID
              LEFT JOIN wca.issur AS ISUR ON SCM.IssID = ISUR.IssID
              LEFT JOIN wca.lcc AS LOCC ON (SCM.SecID = LOCC.SecID
                  AND LOCC.ExchgCD = SCM.PrimaryExchgCD)
              LEFT JOIN automate_task.ajusted_sos AS AJUSTSO ON SCM.SecID = AJUSTSO.secid
              WHERE
                  SCM.SectyCD IN ('EQS')
                  AND SCM.PrimaryExchgCD IN ('EGCASE' , 'IQISX', 'JOASE', 'KWKSE', 'PSAFM', 'SARSE', 'SYDSE', 'AEDFM', 'AEADSM')
                  AND SCM.Actflag NOT IN ('D')
                  AND SCM.ISIN NOT IN ('')
                  AND SCM.ISIN IS NOT NULL
              ORDER BY LOCC.Acttime DESC
              LIMIT 999999999) Tmp
          GROUP BY SecID
          `
        )
        lg(`Extracted ${ISINs[0].length} Securities from remote WCA DB`, log_tab + 1, 'info', source)
        resolve(ISINs[0])
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}
