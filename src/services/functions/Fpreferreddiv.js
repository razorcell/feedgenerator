const tools = require(`../tools`)
const Ffetch = require(`../Ffetch`)
const scraping = require(`../scraping`)

//Simplify logging
const lg = tools.lg

const { clg } = require(`../tools`)

module.exports = {
  getPreferredDividendsUpdates,
  getPreferredSharesFromWCA,
  getDividendsForOneSecurity,
  getDividendsAllSecurities,
}

function getPreferredDividendsUpdates(source, log_tab) {
  return new Promise(function getPreferredDividendsUpdates(resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        let all_data = []
        all_data = await getPreferredSharesFromWCA(source, log_tab + 1)
        all_data = getDividendsAllSecurities(all_data, source, log_tab + 1)
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

function getDividendsAllSecurities(all_shares, source, log_tab) {
  return new Promise(function getDividendsAllSecurities(resolve, reject) {
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
            lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
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
              chunks[i].map(async one_security => {
                return await getDividendsForOneSecurity(source, one_security, log_tab + 3)
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

function getDividendsForOneSecurity(source, security, log_tab) {
  return new Promise(function getDividendsForOneSecurity(resolve, reject) {
    ;(async () => {
      try {
        security['url'] = `https://www.preferred-stock.com/historical.php?symbol=${security.symbol}`
        let page = await Ffetch.down(
          {
            source,
            url: security.url,
            id: security.isin,
          },
          log_tab + 1
        )
        security.url = `<a href="${security.url}" target="_blank">Source</a>`
        let Trs = await scraping.getTrsFromPage(
          page,
          `tr.hyper13`,
          gfinalConfig[source].target_tds,
          99999,
          'text',
          log_tab + 1,
          true,
          source
        )
        if (Trs.length === 0) {
          clg(`Not dividends found for [${security.symbol}]`, 'info', log_tab + 1, source)
          resolve([])
          return
        }
        Trs.shift()
        Trs = Trs.filter(div => !div.year.includes('Total:') && div.year.length > 0)
        Trs = Trs.map(div => {
          return Object.assign({}, security, div)
        })
        resolve(Trs)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}
function getPreferredSharesFromWCA(source, log_tab = 1) {
  return new Promise(function getPreferredSharesFromWCA(resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        let ISINs = await gWCADb.raw(
          `
          SELECT 
              *
          FROM
              (SELECT
                SCM.isin,
                ISUR.IssuerName,
                LOCC.NewLocalCode as symbol,
                SCMKT.MktSegment,
                SCM.PrimaryExchgCD,
                SCEX.SecID                 
              FROM
                  wca.scmst AS SCM
              LEFT JOIN wca.scexh AS SCEX ON SCM.secID = SCEX.SecID
              LEFT JOIN mktsg AS SCMKT ON SCEX.MktsgID = SCMKT.MktsgID
              LEFT JOIN wca.issur AS ISUR ON SCM.IssID = ISUR.IssID
              LEFT JOIN wca.lcc AS LOCC ON SCM.SecID = LOCC.SecID
              WHERE
                  SCM.SectyCD IN ('PRF')
                  AND SCM.PrimaryExchgCD IN ('USAMEX' , 'USNYSE', 'USNASD', 'USOTC', 'BRBVSP', 'CATSE', 'DEFSX', 'SGSSE', 'KRKSE', 'JPTSE', 'LULSE')
                  AND SCM.Actflag NOT IN ('D')
                  AND SCM.ISIN NOT IN ('')
                  AND SCM.ISIN IS NOT NULL
                  AND LOCC.NewLocalCode NOT IN ('')
                  AND LOCC.NewLocalCode IS NOT NULL
              ORDER BY LOCC.Acttime DESC
              LIMIT 999999999) Tmp
          GROUP BY SecID
          `
        )
        lg(`Extracted ${ISINs[0].length} PRF Securities from remote WCA DB`, log_tab + 1, 'info', source)
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
