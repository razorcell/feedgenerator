const cheerio = require('cheerio')
const tor = require(`../tor`)
const tools = require(`../tools`)

var marketwatch_headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:71.0) Gecko/20100101 Firefox/71.0',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  Connection: 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Cache-Control': 'max-age=0',
  Cookie:
    'refresh=on; letsGetMikey=enabled; mw_loc=%7B%22country%22%3A%22MA%22%2C%22region%22%3A%22%22%2C%22city%22%3A%22CASABLANCA%22%2C%22county%22%3A%5B%22%22%5D%2C%22continent%22%3A%22AF%22%7D; utag_main=v_id:016f13d469590046943f49db53b80004e001c00d00bd0$_sn:3$_ss:0$_st:1576600165301$vapi_domain:marketwatch.com$_prevpage:MW_Quote_Page%3Bexp-1576601965302$ses_id:1576597313121%3Bexp-session$_pn:5%3Bexp-session; AMCV_CB68E4BA55144CAA0A4C98A5%40AdobeOrg=1585540135%7CMCIDTS%7C18248%7CMCMID%7C33856919847361249284616163802357229134%7CMCAID%7CNONE%7CMCOPTOUT-1576600948s%7CNONE%7CMCAAMLH-1577198548%7C6%7CMCAAMB-1577198548%7Cj8Odv6LonN4r3an7LhD3WZrU1bUpAkFkkiY1ncBR96t2PTI%7CMCSYNCSOP%7C411-18255%7CvVersion%7C4.4.0; vidoraUserId=o1t059d7puid16f2n39oukbgrbif7o; fullcss-home=site-96ac3b67db.min.css; icons-loaded=true; MicrosoftApplicationsTelemetryDeviceId=c4ca4f07-c7bd-26ca-c350-a87afca75972; MicrosoftApplicationsTelemetryFirstLaunchTime=1576585685774; _ncg_sp_id.f57d=2b1d3ab9-28de-447e-8d7a-030ac861d391.1576585686.1.1576598367.1576585686.2262c43c-51c6-4e63-8e03-48497e298f71; _ncg_id_=16f13d4c939-4925a98e-0adf-492e-b99a-4ff1402af5fe; _parsely_visitor={%22id%22:%2293ffc094-446b-4dab-9ae0-04704c14662e%22%2C%22session_count%22:3%2C%22last_session_ts%22:1576597314651}; cX_P=k49ueuf550eglc5n; usr_bkt=HY0f8Of9M1; cX_S=k49ueufcb1qt6xel; _ga=GA1.2.879603262.1576585688; _gid=GA1.2.616418126.1576585688; _fbp=fb.1.1576585688182.1811139520; AMCVS_CB68E4BA55144CAA0A4C98A5%40AdobeOrg=1; s_ppv=MW_Quote_Page%2C28%2C28%2C944; s_tp=3360; s_cc=true; __gads=ID=2ba491b9f88d98b4:T=1576585688:S=ALNI_MYxOijEQL_93CRQMCv-aMti2ziuww; __qca=P0-1427922600-1576585688419; cX_G=cx%3Aoox5wnj0ihtw18ybvevb75yzo%3Ai1ouj6ttdt90; cto_bundle=PF3Aml90M0NFSnBUdUN1WXcxdnZYMUlrU25ZNnpXa1VrNFNoVW5JN2o1bnV3cWluQXdYN2ZXQ05WU255a2c0ZjgwZCUyQjZmNEVWQWpHZUUyRjF6Tng0ZzBXUG94UFpjUDZGdWxIUFV0VExHcTM1VzBWY1RKaGlYQzZCSzRuS1BsdzA4JTJCY2NlVDExeWxTTlRGWFJMUjRZekFTTmhWRGZRUE9vTDJwZGtTdkh6RUtiQVpnJTNE; s_sq=%5B%5BB%5D%5D; fullcss-section=section-cab9cd8d72.min.css; seenads=0; fullcss-quote=quote-e4e1069c2f.min.css; recentqsmkii=Stock-BE-ACCB|Stock-FR-ALDV|Stock-BE-ABO; _ntv_uid=59be659b-9d55-4bea-bb07-264967f85894; _ncg_sp_ses.f57d=*; _parsely_session={%22sid%22:3%2C%22surl%22:%22https://www.marketwatch.com/investing/stock/aldv?countrycode=fr%22%2C%22sref%22:%22https://www.marketwatch.com/investing/stock/accb?countrycode=be%22%2C%22sts%22:1576597314651%2C%22slts%22:1576592492722}; kayla=g=346da199a6bc4483ae10c9664fcba019; _gat_UA-111452396-3=1; _gat_UA-111452396-5=1',
}

module.exports = {
  getAllEuronextSecurities,
  getMarketwatchUpdates,
  getMarketwatchOneSecurityDetails,
}

function getAllEuronextSecurities() {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        //Get all securities from our local database
        localDB = await tools.createDatabaseConnection(
          gfinalConfig.ExcelanalyzerDB.host,
          gfinalConfig.ExcelanalyzerDB.username,
          gfinalConfig.ExcelanalyzerDB.password,
          gfinalConfig.ExcelanalyzerDB.db_name
        )
        let [rows] = await localDB.query(
          `SELECT column1 as isin, column3 as label, column4 as symbol, column6 as market FROM EurNxtEq_live WHERE column4 != '' LIMIT ${gfinalConfig.marketwatch.get_securities_limit_size}`
        )
        resolve(rows)
      } catch (err) {
        tools.catchError(err, 'getAllEuronextSecurities')
        reject()
      }
    })()
  })
}

function getMarketwatchUpdates() {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        let securities_list = await getAllEuronextSecurities() // returns Array
        tools.lg(`Extracted  ${securities_list.length} Securities`)
        let chunks = tools.arrayToChunks(
          securities_list,
          gfinalConfig.marketwatch.get_securities_details_chunck_size
        )
        let master_data = new Array()
        for (let i = 0; i < chunks.length; i++) {
          tools.lg(`Process chunk = ${i} | remaining = ${chunks.length - (i + 1)}`)
          await tools.pleaseWait(5, 10)
          master_data = master_data.concat(await getMarketwatchChunkSecuritiesDetails(chunks[i]))
        }
        resolve(master_data)
      } catch (err) {
        tools.catchError(err, 'getEuronextEquitiesUpdates')
        reject()
      }
    })()
  })
}

function getMarketwatchChunkSecuritiesDetails(chunk) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        let this_chunck_data = await Promise.all(
          chunk.map(async (security, index) => {
            let country_code = security.isin.slice(0, 2)
            let one_security_details = await getMarketwatchOneSecurityDetails(
              security.isin,
              security.symbol,
              country_code
            )
            return {
              isin: security.isin,
              label: security.label,
              symbol: security.symbol,
              dividend_amount: one_security_details.dividend_amount,
              dividend_exdate: one_security_details.dividend_exdate,
              market: security.market,
              country_code: one_security_details.country_code,
              url: `<a href="https://www.marketwatch.com/investing/stock/${security.symbol}?countrycode=${one_security_details.country_code}" target="_blank">Link</a>`,
            }
          })
        )
        resolve(this_chunck_data)
      } catch (err) {
        tools.catchError(err, 'getDenmarkChunkBondDetails')
        reject()
      }
    })()
  })
}

function getMarketwatchOneSecurityDetails(isin, symbol, country_code, type = 'Shares') {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        // tools.lg(`isin= ${isin} | market_symbol= ${symbol}`);
        //Get Shares outstanding and instrument type
        let url = null
        if (type == 'Shares')
          url = `https://www.marketwatch.com/investing/stock/${symbol}?countrycode=${country_code}`
        if (type == 'ETF')
          url = `https://www.marketwatch.com/investing/fund/${symbol}?countrycode=${country_code}`
        let response = await tor.downloadUrlUsingTor('Marketwatch', url, marketwatch_headers)
        // file.writeToFile(`downloads/Marketwatch-${isin}.html`, response.body);
        let $ = cheerio.load(response.body)
        let dividend_amount = null
        let dividend_exdate = null
        for (let i = 0; i < 30; i++) {
          let block_label = $(`li.kv__item:nth-child(${i}) > small:nth-child(1)`).text()
          if (block_label === `Dividend`)
            dividend_amount = $(`li.kv__item:nth-child(${i}) > span:nth-child(2)`).text()
          if (block_label === `Ex-Dividend Date`)
            dividend_exdate = $(`li.kv__item:nth-child(${i}) > span:nth-child(2)`).text()
        }
        resolve({
          dividend_amount: dividend_amount,
          dividend_exdate: dividend_exdate,
          country_code: country_code,
        })
      } catch (err) {
        tools.catchError(err, 'getMarketwatchOneSecurityDetails')
        reject()
      }
    })()
  })
}
