const tools = require(`../tools`)
const Ffetch = require(`../Ffetch`)
const scraping = require(`../scraping`)

//Simplify logging
const lg = tools.lg

const { clg } = require(`../tools`)

module.exports = {
  getPolandUpdates,
  getAllSecuritiesDetails,
  getAllSecurities,
  getOneSecurityDetails,
}

function getPolandUpdates(source, log_tab) {
  return new Promise(function getPolandUpdates(resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        let all_data = []
        let mainMarket = await getAllSecurities(source, 'MainMarket', log_tab + 1)
        lg(`Extracted ${mainMarket.length} sec from MainMarket`, log_tab + 1, 'info', source)
        let newConnect = await getAllSecurities(source, 'NewConnect', log_tab + 1)
        lg(`Extracted ${newConnect.length} sec from NewConnect`, log_tab + 1, 'info', source)
        all_data = [].concat.apply(mainMarket, newConnect) //flattern array
        lg(`Processing ${all_data.length} securities in total`, log_tab + 1, 'info', source)
        all_data = await getAllSecuritiesDetails(source, all_data, log_tab + 1)
        lg(`Extracted ${all_data.length} sec from poland exchange`, log_tab + 1, 'info', source)
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

function getAllSecuritiesDetails(source, all_shares, log_tab) {
  return new Promise(function getAllSecuritiesDetails(resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        let chunks = tools.arrayToChunks(all_shares, gfinalConfig[source].chunck_size, log_tab + 1, source)
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
            resolve(all_data)
            return
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
              chunks[i].map(async security => {
                return await getOneSecurityDetails(source, security, log_tab + 3)
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
        resolve(all_data)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getOneSecurityDetails(source, security, log_tab) {
  return new Promise(function getSecuritiesFromPage(resolve, reject) {
    ;(async () => {
      try {
        let page = ''
        if (security.market === 'MainMarket') {
          security.profile_url = `https://www.gpw.pl/ajaxindex.php?start=infoTab&format=html&action=GPWListaSp&gls_isin=${security.isin}&lang=EN&time=1616503433497`
        }
        if (security.market === 'NewConnect') {
          //security.profile_url = `https://newconnect.pl/companies-card?isin=${security.isin}`; //Useless
          security.profile_url = `https://newconnect.pl/ajaxindex.php?start=indicatorsTab&format=html&action=NCCompany&gls_isin=${security.isin}&lang=EN&time=1616519502289`
        }
        page = await Ffetch.down(
          {
            source,
            url: security.profile_url,
            id: security.symbol,
          },
          log_tab + 1
        )
        security.profile_url = `<a href="${security.profile_url}" target="_blank">profileUrl</a>`
        let res = await scraping.getMultiTags(
          `.footable > tbody:nth-child(1) tr`,
          page,
          'object',
          log_tab + 1,
          source
        )
        if (!res.found) {
          lg(`Could not find Profile details`, log_tab + 2, 'warn', source)
        } else {
          let $ = res.$
          let details = res.contents
          for (let row of details) {
            let label = $($(row).find('th').get()[0])
              .text()
              .replace(/[\t|\n]+/g, '')
              .replace(/\(.*\)/, '')
              .trim()
            let value = $($(row).find('td').get()[0])
              .text()
              .replace(/[\t|\n]+/g, '')
              .replace(/\(.*\)/, '')
              .trim()
            // clg(`${label} = ${value}`);
            // if (label === "Date of first listing:") security.listDate = moment(value, "MM.YYYY", true).format("YYYY-MM-DD");
            if (label.includes('Number of shares iss'))
              security.so = value.replace(/ /g, '').replace(/,/g, '').trim()
            // if (label === "Full name:") security.shortName = value.replace("SPÓŁKA AKCYJNA", "");
          }
        }
        //PART2
        if (security.market === 'MainMarket') {
          security.quote_url = `https://www.gpw.pl/ajaxindex.php?start=quotationsTab&format=html&action=GPWListaSp&gls_isin=${security.isin}&lang=EN&time=1616503563410`
        }
        if (security.market === 'NewConnect') {
          security.quote_url = `https://newconnect.pl/ajaxindex.php?start=quotationsTab&format=html&action=NCCompany&gls_isin=${security.isin}&lang=EN&time=1616519001675`
        }
        page = await Ffetch.down(
          {
            source,
            url: security.quote_url,
            id: security.symbol,
          },
          log_tab + 1
        )
        security.quote_url = `<a href="${security.quote_url}" target="_blank">quoteURL</a>`
        res = await scraping.getMultiTags(
          `.footable > tbody:nth-child(1) tr`,
          page,
          'object',
          log_tab + 1,
          source
        )
        if (!res.found) {
          lg(`Could not find Quote details`, log_tab + 2, 'warn', source)
        } else {
          let $ = res.$
          let details = res.contents
          for (let row of details) {
            let label = $($(row).find('th').get()[0])
              .text()
              .replace(/[\t|\n]+/g, '')
              .replace(/\(.*\)/, '')
              .trim()
            let value = $($(row).find('td').get()[0])
              .text()
              .replace(/[\t|\n]+/g, '')
              .trim()
            if (label === 'Data and price on first listng') {
              // clg(`${label} = ${value}`);
              const regex = /([\d]{4}-[\d]{2}-[\d]{2})/gm
              let dates = Array.from(value.matchAll(regex))
              // clg(dates);
              if (dates.length > 0) {
                security.listDate = dates[0][1]
              }
            }
          }
        }
        security = Object.assign(
          {},
          {
            isin: '',
            name: '',
            symbol: '',
            so: '',
            listDate: '',
            market: '',
            url: '',
            profile_url: '',
            quote_url: '',
          },
          security
        )
        resolve(security)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getAllSecurities(source, market, log_tab) {
  return new Promise(function getAllSecurities(resolve, reject) {
    ;(async () => {
      try {
        let page = ``
        if (market === 'MainMarket') {
          page = await Ffetch.down(
            {
              source,
              method: 'POST',
              url: `https://www.gpw.pl/ajaxindex.php`,
              id: `polandAllSec`,
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:86.0) Gecko/20100101 Firefox/86.0',
                Accept: 'text/html, */*; q=0.01',
                'Accept-Language': 'en-US,en;q=0.5',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
              },
              body: `action=GPWCompanySearch&start=ajaxSearch&page=list-of-companies&format=html&lang=EN&letter=&offset=0&limit=${gfinalConfig[source].limit}&order=&order_type=&searchText=&index%5Bempty%5D=on&index%5BWIG20%5D=on&index%5BmWIG40%5D=on&index%5BsWIG80%5D=on&index%5BWIG30%5D=on&index%5BWIG%5D=on&index%5BWIGdiv%5D=on&index%5BWIG-CEE%5D=on&index%5BWIG-Poland%5D=on&index%5BInvestorMS%5D=on&index%5BTBSP.Index%5D=on&index%5BCEEplus%5D=on&index%5BmWIG40TR%5D=on&index%5BNCIndex%5D=on&index%5BsWIG80TR%5D=on&index%5BWIG-banki%5D=on&index%5BWIG-budownictwo%5D=on&index%5BWIG-chemia%5D=on&index%5BWIG-energia%5D=on&index%5BWIG-ESG%5D=on&index%5BWIG-g%C3%B3rnictwo%5D=on&index%5BWIG-informatyka%5D=on&index%5BWIG-leki%5D=on&index%5BWIG-media%5D=on&index%5BWIG-motoryzacja%5D=on&index%5BWIG-nieruchomo%C5%9Bci%5D=on&index%5BWIG-odzie%C5%BC%5D=on&index%5BWIG-paliwa%5D=on&index%5BWIG-spo%C5%BCywczy%5D=on&index%5BWIG-telekomunikacja%5D=on&index%5BWIG-Ukraine%5D=on&index%5BWIG.GAMES%5D=on&index%5BWIG.MS-BAS%5D=on&index%5BWIG.MS-FIN%5D=on&index%5BWIG.MS-PET%5D=on&index%5BWIG20TR%5D=on&index%5BWIG30TR%5D=on&index%5BWIGtech%5D=on&index%5BWIGtechTR%5D=on&sector%5B510%5D=510&sector%5B110%5D=110&sector%5B750%5D=750&sector%5B410%5D=410&sector%5B310%5D=310&sector%5B360%5D=360&sector%5B740%5D=740&sector%5B180%5D=180&sector%5B220%5D=220&sector%5B650%5D=650&sector%5B350%5D=350&sector%5B320%5D=320&sector%5B610%5D=610&sector%5B690%5D=690&sector%5B660%5D=660&sector%5B330%5D=330&sector%5B820%5D=820&sector%5B399%5D=399&sector%5B150%5D=150&sector%5B640%5D=640&sector%5B540%5D=540&sector%5B140%5D=140&sector%5B830%5D=830&sector%5B790%5D=790&sector%5B520%5D=520&sector%5B210%5D=210&sector%5B170%5D=170&sector%5B730%5D=730&sector%5B420%5D=420&sector%5B185%5D=185&sector%5B370%5D=370&sector%5B630%5D=630&sector%5B130%5D=130&sector%5B620%5D=620&sector%5B720%5D=720&sector%5B710%5D=710&sector%5B810%5D=810&sector%5B430%5D=430&sector%5B120%5D=120&sector%5B450%5D=450&sector%5B160%5D=160&sector%5B530%5D=530&sector%5B440%5D=440&country%5BPOLSKA%5D=on&country%5BAUSTRALIA%5D=on&country%5BAUSTRIA%5D=on&country%5BBelgia%5D=on&country%5BBU%C5%81GARIA%5D=on&country%5BCYPR%5D=on&country%5BCZECHY%5D=on&country%5BDANIA%5D=on&country%5BESTONIA%5D=on&country%5BFRANCJA%5D=on&country%5BGLOBAL%5D=on&country%5BGUERNSEY%5D=on&country%5BHISZPANIA%5D=on&country%5BHOLANDIA%5D=on&country%5BINNY%5D=on&country%5BIRLANDIA%5D=on&country%5BKANADA%5D=on&country%5BLITWA%5D=on&country%5BLUKSEMBURG%5D=on&country%5BNIEMCY%5D=on&country%5BNorwegia%5D=on&country%5BREPUBLIKA+CZESKA%5D=on&country%5BS%C5%81OWACJA%5D=on&country%5BS%C5%82owenia%5D=on&country%5BSTANY+ZJEDNOCZONE%5D=on&country%5BSZWAJCARIA%5D=on&country%5BSZWECJA%5D=on&country%5BUKRAINA%5D=on&country%5BW%C4%98GRY%5D=on&country%5BWIELKA+BRYTANIA%5D=on&country%5BW%C5%81OCHY%5D=on&country%5BJERSEY%5D=on&voivodship%5B11%5D=on&voivodship%5B16%5D=on&voivodship%5B5%5D=on&voivodship%5B13%5D=on&voivodship%5B17%5D=on&voivodship%5B7%5D=on&voivodship%5B2%5D=on&voivodship%5B10%5D=on&voivodship%5B8%5D=on&voivodship%5B4%5D=on&voivodship%5B15%5D=on&voivodship%5B9%5D=on&voivodship%5B6%5D=on&voivodship%5B3%5D=on&voivodship%5B12%5D=on&voivodship%5B14%5D=on`,
              // savetofile: true,
            },
            log_tab + 1
          )
        } else if (market === 'NewConnect') {
          page = await Ffetch.down(
            {
              source,
              method: 'POST',
              url: `https://newconnect.pl/ajaxindex.php`,
              id: `polandAllSec`,
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:86.0) Gecko/20100101 Firefox/86.0',
                Accept: 'text/html, */*; q=0.01',
                'Accept-Language': 'en-US,en;q=0.5',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
              },
              body: `format=html&lang=EN&offset=0&limit=${gfinalConfig[source].limit}&letter=&action=NCCompany&start=listAjax&order=ncc_name&order_type=ASC&searchText=&countries%5B1000%5D=on&countries%5B1002%5D=on&countries%5B1003%5D=on&countries%5B1004%5D=on&countries%5B1005%5D=on&countries%5B1006%5D=on&countries%5B1007%5D=on&marketSectors%5B643%5D=on&marketSectors%5B513%5D=on&marketSectors%5B132%5D=on&marketSectors%5B541%5D=on&marketSectors%5B549%5D=on&marketSectors%5B750%5D=on&marketSectors%5B415%5D=on&marketSectors%5B139%5D=on&marketSectors%5B443%5D=on&marketSectors%5B521%5D=on&marketSectors%5B612%5D=on&marketSectors%5B419%5D=on&marketSectors%5B414%5D=on&marketSectors%5B621%5D=on&marketSectors%5B539%5D=on&marketSectors%5B622%5D=on&marketSectors%5B590%5D=on&marketSectors%5B611%5D=on&marketSectors%5B522%5D=on&marketSectors%5B512%5D=on&marketSectors%5B660%5D=on&marketSectors%5B222%5D=on&marketSectors%5B532%5D=on&marketSectors%5B421%5D=on&marketSectors%5B441%5D=on&marketSectors%5B413%5D=on&marketSectors%5B131%5D=on&marketSectors%5B170%5D=on&marketSectors%5B190%5D=on&marketSectors%5B511%5D=on&marketSectors%5B519%5D=on&marketSectors%5B361%5D=on&marketSectors%5B411%5D=on&marketSectors%5B629%5D=on&marketSectors%5B823%5D=on&marketSectors%5B790%5D=on&marketSectors%5B720%5D=on&marketSectors%5B710%5D=on&marketSectors%5B631%5D=on&marketSectors%5B531%5D=on&marketSectors%5B422%5D=on&marketSectors%5B449%5D=on&marketSectors%5B412%5D=on&marketSectors%5B450%5D=on&marketSectors%5B129%5D=on&marketSectors%5B644%5D=on&marketSectors%5B180%5D=on&marketSectors%5B829%5D=on&marketSectors%5B822%5D=on&marketSectors%5B150%5D=on&marketSectors%5B639%5D=on&marketSectors%5B432%5D=on&marketSectors%5B649%5D=on&marketSectors%5B322%5D=on&marketSectors%5B423%5D=on&marketSectors%5B160%5D=on&marketSectors%5B830%5D=on&marketSectors%5B0%5D=on&marketSectors%5B290%5D=on&marketSectors%5B212%5D=on&marketSectors%5B730%5D=on&marketSectors%5B351%5D=on&marketSectors%5B642%5D=on&marketSectors%5B641%5D=on&marketSectors%5B149%5D=on&marketSectors%5B142%5D=on&marketSectors%5B141%5D=on&marketSectors%5B370%5D=on&marketSectors%5B359%5D=on&marketSectors%5B821%5D=on&marketSectors%5B312%5D=on&marketSectors%5B634%5D=on&marketSectors%5B633%5D=on&marketSectors%5B442%5D=on&marketSectors%5B810%5D=on&marketSectors%5B690%5D=on&marketSectors%5B431%5D=on&marketSectors%5B439%5D=on&marketSectors%5B632%5D=on&marketSectors%5B650%5D=on&marketSectors%5B230%5D=on&provinces%5B2%5D=on&provinces%5B3%5D=on&provinces%5B4%5D=on&provinces%5B5%5D=on&provinces%5B6%5D=on&provinces%5B7%5D=on&provinces%5B8%5D=on&provinces%5B9%5D=on&provinces%5B10%5D=on&provinces%5B11%5D=on&provinces%5B12%5D=on&provinces%5B13%5D=on&provinces%5B14%5D=on&provinces%5B15%5D=on&provinces%5B16%5D=on&provinces%5B17%5D=on`,
              savetofile: true,
            },
            log_tab + 1
          )
        }
        let res = await scraping.getMultiTags(`a`, page, 'object', log_tab + 1, source)
        if (!res.found) {
          lg(`Could not find [a] tag for issuer`, log_tab + 2, 'warn', source)
          resolve([])
          return
        }
        let all = res.contents
        let $ = res.$
        all = all.map(sec => {
          return {
            isin: $(sec).attr('href').split('=')[1],
            name: $(sec)
              .text()
              .replace(/[\t|\n]+/g, '')
              .replace(/\(.*\)/, '')
              .trim(),
            symbol: $($(sec).find('span').get()[0])
              .text()
              .replace(/[\t|\n]+/g, '')
              .replace(/[()]/g, '')
              .trim(),
            market: market,
            url: `<a href="https://www.gpw.pl/${$(sec).attr('href')}" target="_blank">mainURL</a>`,
          }
        })
        // clg(all);
        resolve(all)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}
