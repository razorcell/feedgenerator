const cheerio = require('cheerio')
const tor = require(`../tor`)
const tools = require(`../tools`)
var stringSimilarity = require('string-similarity')
const Ffetch = require(`../Ffetch`)

//Simplify logging
const lg = tools.lg

const { clg, typeOf } = require(`../tools`)

module.exports = {
  getBdFreeFloatUpdates,
  getEuronextSecuritiesFromDB,
  matchOneSecurityWithBourseDirect,
  matchAllSecuritiesWithBourseDirect,
}

function getBdFreeFloatUpdates(source = 'general', log_tab = 1) {
  return new Promise(function getBdFreeFloatUpdates(resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        let all_shares = await getEuronextSecuritiesFromDB(source, log_tab + 1)
        clg(`Extracted ${all_shares.length} shares from DB`, log_tab + 1, 'info', source)
        let all_matches = await matchAllSecuritiesWithBourseDirect(source, all_shares, log_tab + 1)
        clg(`processing ${all_matches.length} in Bourse direct`, log_tab + 1, 'info', source)
        // clg(all_matches);
        all_matches = all_matches.filter(val => val != null) //filter null securities NOT FOUND
        let all_shares_with_float_url = await getFloatURLForAllSecurities(source, all_matches, log_tab + 1)
        all_shares_with_float_url = all_shares_with_float_url.filter(val => val != null)
        let all_floats_data = await getFreeFloatAllSecurities(source, all_shares_with_float_url, log_tab + 1)
        all_floats_data = all_floats_data.filter(val => val != null) //filter null securities NOT FOUND
        //Last cleanup
        let clean_data = all_floats_data.map(security => {
          let Final_freefloat = 'N/A'
          if (security.freefloatType === 'EXACT FIGURE') {
            Final_freefloat = security.freefloat
          } else if (security.freefloatType === 'LESS THAN 5% Stack') {
            Final_freefloat = security.less_than_5_stack
          } else if (security.freefloatType === 'NO FREEFLOAT AND 5% Stack') {
            Final_freefloat = '0'
          }

          // if (security.freefloat === 'N/A') {
          //   if (security.less_than_5_stack != 'N/A' && parseFloat(security.less_than_5_stack) != 0) {
          //     // console.log(`Less_tan_5% found ${security.less_than_5_stack}`);
          //     Final_freefloat = security.less_than_5_stack
          //   } else {
          //     Final_freefloat = 'N/A'
          //   }
          // } else {
          //   // console.log(`freefloat found ${security.freefloat}`);
          //   Final_freefloat = security.freefloat
          // }

          return {
            similarity_ratio: security.similarity_ratio,
            isin: security.isin,
            Final_freefloat:
              typeof Final_freefloat === 'string' || Final_freefloat instanceof String
                ? parseFloat(Final_freefloat.replace(/,/g, '.').replace(/\s%/g, ''))
                : Final_freefloat,
            // freefloat: security.freefloat,
            // less_than_5_stack: security.less_than_5_stack,
            adjusted_ff:
              security.adjusted_so !== null && security.Final_freefloat !== 'N/A' // security.freefloat !== null &&
                ? // security.freefloat !== undefined
                  Math.floor(
                    (security.adjusted_so *
                      (typeof Final_freefloat === 'string' || Final_freefloat instanceof String
                        ? parseFloat(Final_freefloat.replace(/,/g, '.').replace(/\s%/g, ''))
                        : Final_freefloat)) /
                      100
                  )
                : 'N/A',
            // adjusted_less_than_5_stack: Math.floor(
            //   (security.adjusted_so * security.less_than_5_stack) / 100
            // ),
            // adjusted_so: security.adjusted_so,
            name_on_site: security.name_on_site,
            name_in_db: security.name_in_db,
            symbol_on_site: security.symbol_on_site,
            symbol_in_db: security.symbol_in_db,
            market_on_site: security.market_on_site,
            market_in_db: security.market_in_db,
            float_url: `<a href="${security.float_url}" target="_blank">Figures</a>`,
            float_page: `<a href="${security.float_page}" target="_blank">Page</a>`,
          }
        })
        lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        resolve(clean_data)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getFreeFloatAllSecurities(source, all_shares, log_tab) {
  return new Promise(function getFreeFloatAllSecurities(resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        let chunks = tools.arrayToChunks(all_shares, gfinalConfig[source].chunck_size, log_tab + 1, source)
        let all_floats = []
        for (let i = 0; i < chunks.length; i++) {
          // if (i < 70) continue;
          // if (i > 80) continue;

          if (i >= gfinalConfig[source].chunks_limit) {
            lg(`Chunk limit [ ${gfinalConfig[source].chunks_limit} ] reached !`, log_tab + 1, 'info', source)
            lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
            resolve(all_floats)
            return
          }
          lg(``, log_tab + 1, 'info', source)
          lg(
            `Process chunk = <b>${i}</b> | remaining = <b>${chunks.length - (i + 1)}</b>`,
            log_tab + 1,
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
          await tools.pleaseWait(
            gfinalConfig[source].delay_min,
            gfinalConfig[source].delay_max,
            log_tab + 1,
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

function getFloatFigureForOneSecurity(source, security, log_tab) {
  return new Promise(function getFloatFigureForOneSecurity(resolve, reject) {
    ;(async () => {
      try {
        if (security.float_url === `NOT FOUND`) {
          security.freefloat = 'N/A'
          security.less_than_5_stack = 'N/A'
          resolve(security)
          return
        }
        let response = await Ffetch.down(
          {
            source: source,
            url: security.float_url,
            id: security.isin,
          },
          log_tab + 1
        )
        let FreeFloat = await getFloatFigureFromPageHTML(source, response, security, log_tab + 1)
        if (security.freefloatType === 'NO SHAREHOLDING') {
          resolve(null)
          return
        }
        security.freefloat = FreeFloat.float_figure
        security.less_than_5_stack = FreeFloat.less_than_5_stack
        resolve(security)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getFloatFigureFromPageHTML(source, body, security, log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        const $ = cheerio.load(body)
        let FreeFloat = {
          float_figure: 'N/A',
          less_than_5_stack: 0,
        }
        let tr_tags = $('.table > tbody > tr').get()
        if (!tr_tags) {
          lg('No Shareholdings !', log_tab + 1, 'warn', source)
          FreeFloat.less_than_5_stack = 'N/A'
          security.freefloatType = 'NO SHAREHOLDING'
          resolve(FreeFloat)
          return
        }

        let shareholdings = tr_tags.map(tr => {
          return {
            type: $(tr).find('td:nth-child(1)').text(),
            name: $(tr).find('td:nth-child(2)').text(),
            figure: $(tr).find('td:nth-child(4)').text(),
          }
        })
        // console.log(shareholdings);
        for (let shareholding of shareholdings) {
          if (shareholding.name === 'Flottant') {
            FreeFloat.float_figure = shareholding.figure
          } else {
            if (shareholding.figure) {
              let figure_string = shareholding.figure.match(/\d{1,3},\d{1,3}/g)
              if (figure_string) {
                figure_string = figure_string[0].replace(',', '.')
                // console.log(`String figure ${figure_string}`);
                let figure = Number(parseFloat(figure_string).toFixed(2))
                if (figure <= 5) {
                  // console.log(`Append this ${figure}`);
                  FreeFloat.less_than_5_stack += figure
                  FreeFloat.less_than_5_stack = Number(FreeFloat.less_than_5_stack.toFixed(2))
                }
              }
            }
          }
        }

        if (FreeFloat.float_figure === 'N/A' && FreeFloat.less_than_5_stack === 0) {
          lg('NO FREEFLOAT AND 5% Stack, forcing freefloat to 0% !', log_tab + 1, 'warn', source)
          security.freefloatType = 'NO FREEFLOAT AND 5% Stack'
          FreeFloat.float_figure = 0
        } else if (FreeFloat.float_figure === 'N/A' && FreeFloat.less_than_5_stack > 0) {
          security.freefloatType = 'LESS THAN 5% Stack'
        } else if (FreeFloat.float_figure != 'N/A') {
          security.freefloatType = 'EXACT FIGURE'
        }
        resolve(FreeFloat)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getFloatURLForAllSecurities(source, all_shares, log_tab) {
  return new Promise(function getFloatURLForAllSecurities(resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        let chunks = tools.arrayToChunks(all_shares, gfinalConfig[source].chunck_size, log_tab + 1, source)
        let all_shares_with_float_url = []
        for (let i = 0; i < chunks.length; i++) {
          // if (i < 28) continue;
          if (i >= gfinalConfig[source].chunks_limit) {
            lg(`Chunk limit [ ${gfinalConfig[source].chunks_limit} ] reached !`, log_tab + 1, 'info', source)
            lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
            resolve(all_shares_with_float_url)
            return
          }
          lg(``, log_tab + 1, 'info', source)
          lg(
            `Process chunk = <b>${i}</b> | remaining = <b>${chunks.length - (i + 1)}</b>`,
            log_tab + 1,
            'info',
            source
          )
          all_shares_with_float_url = all_shares_with_float_url.concat(
            await Promise.all(
              chunks[i].map(async one_security => {
                return await getFloatURLForOneSecurity(source, one_security, log_tab + 1)
              })
            )
          )
          await tools.pleaseWait(
            gfinalConfig[source].delay_min,
            gfinalConfig[source].delay_max,
            log_tab + 1,
            source
          )
        }
        resolve(all_shares_with_float_url)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getFloatURLForOneSecurity(source, security, log_tab = 1) {
  return new Promise(function getFloatURLForOneSecurity(resolve, reject) {
    ;(async () => {
      try {
        if (security.similarity_ratio === `NOT FOUND`) {
          security.float_url = `NOT FOUND`
          security.float_page = `NOT FOUND`
          resolve(null)
          return
        }
        let response = await Ffetch.down(
          {
            source: source,
            url: security.main_url,
            id: security.isin,
          },
          log_tab + 1
        )
        let URLs = await getFloatURLFromPageHTML(source, response, log_tab + 1)
        if (URLs.float_url === 'NOT FOUND') {
          resolve(null)
          return
        }
        security.float_url = URLs.float_url
        security.float_page = URLs.float_page
        resolve(security)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getFloatURLFromPageHTML(source, body, log_tab) {
  return new Promise(function getFloatURLFromPageHTML(resolve, reject) {
    ;(async () => {
      try {
        const $ = cheerio.load(body)
        let URLs = {
          float_url: `NOT FOUND`,
          float_page: `NOT FOUND`,
        }
        let li_tags = $('.nav-list > ul:nth-child(1) > li').get()
        if (!li_tags) {
          lg('No list tags found in this page', log_tab + 1, 'warn', source)
          resolve(URLs)
          return
        }
        for (let li of li_tags) {
          let a_tag = $(li).find('a')
          if (!a_tag) {
            lg('Could not find any A tag in this li', log_tab + 1, 'warn', source)
            continue
          }
          if ($(a_tag).attr('aria-controls') == 'actionnariat') {
            //get the urls
            URLs.float_url = `https://www.boursedirect.fr${$(a_tag).attr('data-content')}`
            URLs.float_page = `https://www.boursedirect.fr${$(a_tag).attr('href')}`
          }
        }
        resolve(URLs)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function matchAllSecuritiesWithBourseDirect(source, all_shares, log_tab = 1) {
  return new Promise(function matchAllSecuritiesWithBourseDirect(resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        let chunks = tools.arrayToChunks(all_shares, gfinalConfig[source].chunck_size, log_tab + 1, source)
        let all_matches = new Array()
        for (let i = 0; i < chunks.length; i++) {
          // clg(i);
          // if (i < 70) continue;
          // if (i > 80) continue;
          if (i >= gfinalConfig[source].chunks_limit) {
            lg(`Chunk limit [ ${gfinalConfig[source].chunks_limit} ] reached !`, log_tab + 1, 'info', source)
            lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
            resolve(all_matches)
            return
          }
          lg(``, log_tab + 1, 'info', source)
          lg(
            `Process chunk = <b>${i}</b> | remaining = <b>${chunks.length - (i + 1)}</b>`,
            log_tab + 1,
            'info',
            source
          )
          all_matches = all_matches.concat(
            await Promise.all(
              chunks[i].map(async one_security => {
                return await matchOneSecurityWithBourseDirect(source, one_security, log_tab + 1)
              })
            )
          )
          await tools.pleaseWait(
            gfinalConfig[source].delay_min,
            gfinalConfig[source].delay_max,
            log_tab + 1,
            source
          )
        }
        lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        resolve(all_matches)
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function matchOneSecurityWithBourseDirect(source, securityfromDB, log_tab = 1) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        // Search
        let url = `https://www.boursedirect.fr/api/search/${securityfromDB.column1}`
        let searchresults = await Ffetch.down(
          {
            source: source,
            id: securityfromDB.column1,
            url: url,
            json: true,
          },
          log_tab + 1
        )
        // let search = await tor.downloadUrlUsingTor(
        //   "BourseDirect",
        //   url,
        //   undefined,
        //   undefined,
        //   undefined,
        //   undefined,
        //   undefined,
        //   undefined,
        //   undefined,
        //   undefined,
        //   undefined,
        //   undefined,
        //   undefined,
        //   undefined,
        //   3
        // );
        // let searchresults = search.body;
        let bestmatch = await getBestMatch(source, securityfromDB, searchresults, log_tab)
        if (!bestmatch) {
          //No match was found
          lg(`No match found for this isin: ${securityfromDB.column1}`, log_tab + 1, 'warn', source)
          let chosen_one = {
            similarity_ratio: `NOT FOUND`,
            isin: securityfromDB.column1,
            adjusted_so: securityfromDB.adjusted_so,
            name_on_site: `NOT FOUND`,
            name_in_db: securityfromDB.column2,
            symbol_on_site: `NOT FOUND`,
            symbol_in_db: securityfromDB.column4,
            market_on_site: `NOT FOUND`,
            market_in_db: securityfromDB.column6,
            main_url: `NOT FOUND`,
          }
          resolve(null) //switched this to null so that we can filter NOT FOUND securities
          return
        }
        let similarity_ratio = bestmatch.weight //get similarity ratio
        bestmatch = bestmatch.security //keep security only
        let chosen_api_url = await chooseAPIUrl(bestmatch)
        let chosen_one = {
          similarity_ratio: `${Math.floor(similarity_ratio / 3)}`,
          isin: bestmatch.isin,
          adjusted_so: securityfromDB.adjusted_so,
          name_on_site: bestmatch.name,
          name_in_db: securityfromDB.column2,
          symbol_on_site: bestmatch.ticker,
          symbol_in_db: securityfromDB.column4,
          market_on_site: bestmatch.market.operating.name,
          market_in_db: securityfromDB.column6,
          main_url: `https://www.boursedirect.fr${bestmatch.url}`,
          guess_api_url_type: chosen_api_url.type,
          guess_api_url: chosen_api_url.url,
        }
        resolve(chosen_one)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getBestMatch(source, securityfromDB, searchresults, log_tab = 1) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        if (!searchresults.instruments.data || searchresults.instruments.data.length == 0) {
          //Empty search result
          lg(`Empty search results for : ${securityfromDB.column1}`, log_tab + 1, 'info', source)
          resolve(false)
          return
        }
        let similarityweights = []
        searchresults.instruments.data.forEach((securityfromsite, index) => {
          // console.log(`${stringSimilarity.compareTwoStrings(securityfromDB.column2, securityfromsite.name) * 100} | ${stringSimilarity.compareTwoStrings(securityfromDB.column6.toUpperCase(), securityfromsite.label) * 100} | ${stringSimilarity.compareTwoStrings(securityfromDB.column4, securityfromsite.ticker) * 100}`);
          let thisweight =
            stringSimilarity.compareTwoStrings(securityfromDB.column2, securityfromsite.name) * 100 + //Issuer name
            stringSimilarity.compareTwoStrings(securityfromDB.column6.toUpperCase(), securityfromsite.label) *
              100 + //Market full name
            stringSimilarity.compareTwoStrings(securityfromDB.column4, securityfromsite.ticker) * 100 //Symbol
          similarityweights.push({
            index: index,
            weight: thisweight,
            security: securityfromsite,
          })
          // console.log(Math.floor(thisweight / 3));
        })
        similarityweights.sort(sortByWeights)
        //Add slug details using the index
        // console.log(`${searchresults.companies.data[similarityweights[0].index].identification.slug}`);
        //If there is a company profile at the same index as the instrument
        let slug = ``
        if (searchresults.companies.data[similarityweights[0].index])
          slug = searchresults.companies.data[similarityweights[0].index].identification.slug
        similarityweights[0].security.slug = slug
        resolve(similarityweights[0]) //return best match
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getEuronextSecuritiesFromDB(source, log_tab = 1) {
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
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

//HELPERS
function chooseAPIUrl(bestmatch, log_tab = 1) {
  return new Promise(function chooseAPIUrl(resolve, reject) {
    ;(async () => {
      try {
        let chosen_url = {
          url: null,
          type: `certainty`,
        }
        //If ISIN exists in the slug, choose slug
        if (bestmatch.slug.includes(bestmatch.isin)) {
          // lg(`Certainty`);
          chosen_url.url = `https://www.boursedirect.fr/api/company/${bestmatch.slug}/shareholding`
        } //If not guess URL from name and market
        else {
          // lg(`Prediction`);
          chosen_url.url = `https://www.boursedirect.fr/api/company/${bestmatch.market.operating.name
            .replace(/\s|\./g, '-')
            .toLowerCase()}-${bestmatch.name.replace(/\s|\./g, '-').toLowerCase()}-${bestmatch.isin}-${
            bestmatch.ticker
          }/shareholding`
          chosen_url.type = `prediction`
          chosen_url.url = await cleanFreeFloatURL(chosen_url.url)
        }
        resolve(chosen_url)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function cleanFreeFloatURL(freefloat_url, log_tab = 1) {
  return new Promise(function cleanFreeFloatURL(resolve, reject) {
    ;(async () => {
      try {
        // lg(`URL preclean: ${freefloat_url}`);
        var dict = {
          //Replace one character with one
          "'": '-',
          '&': '-',
        }
        freefloat_url = freefloat_url.replace(/[^\w ]/g, char => dict[char] || char) // Replace french characters
        freefloat_url = freefloat_url.replace(/brussels/g, 'bruxelles')
        freefloat_url = tools.convert_accented_characters(freefloat_url)
        freefloat_url = freefloat_url.replace(/-{2,}/g, '-')
        // freefloat_url = freefloat_url.replace(/--/g, '-');
        freefloat_url = freefloat_url.replace(/[,|)|(]/g, '')
        // freefloat_url = freefloat_url.replace(/,/g, '');
        // lg(`URL postclean: ${freefloat_url}`);
        resolve(freefloat_url)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function sortByWeights(a, b) {
  let comparison = 0
  if (a.weight > b.weight) {
    comparison = -1
  } else if (a.weight < b.weight) {
    comparison = 1
  }
  return comparison
}
//Deprecated
function getFloatFigureForOneSecurityFromAPI(security) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        if (security.freefloat_url === `NOT FOUND`) {
          //Security not found in site, just skip
          security.floatfigure = `NOT FOUND`
          resolve(security)
          return
        }
        // Search
        let response = await tor.downloadUrlUsingTor('BourseDirect', security.freefloat_url)
        if (response.statusCode != 200) {
          //Probably not data for this ISIN
          tools.lg(`Float not found for ${security.isin}`)
          security.floatfigure = 'ISIN NOT FOUND'
          resolve(security)
          return
        }
        let shareholding = response.body
        // console.log(shareholding.body);
        let float_figure = 'N/A'
        shareholding.forEach(one_shareholding => {
          if (one_shareholding[0] === 'Flottant') float_figure = `${one_shareholding[1]} %`
        })
        security.free_float = float_figure
        resolve(security)
        return
      } catch (err) {
        lg(`getFloatFigureForOneSecurity : ${err.message}`)
        reject(`getFloatFigureForOneSecurity : ${err.message}`)
      }
    })()
  })
}
