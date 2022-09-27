const Ffetch = require(`../Ffetch`)
const scraping = require(`../scraping`)
const { lg, catchError } = require(`../tools`)

module.exports = {
  getTaiwanMSTRUpdates,
  getSecuritiesList,
}

async function getTaiwanMSTRUpdates(source, logTab) {
  try {
    lg(`START - getTaiwanMSTRUpdates`, logTab + 1, 'info', source)
    let securities = await getSecuritiesList(source, logTab + 1)
    return securities
  } catch (err) {
    catchError(err, 'getTaiwanMSTRUpdates', undefined, undefined, logTab, source)
    throw new Error(err)
  }
}

async function getSecuritiesList(source, logTab) {
  try {
    lg(`START - getSecuritiesList`, logTab + 1, 'info', source)
    let res = await Ffetch.down(
      {
        id: 'getSecuritiesList',
        source: source,
        url: `https://isin.twse.com.tw/isin/e_C_public.jsp?strMode=3`,
      },
      logTab + 1
    )
    let securities = await getSecuritiesFromHTML(res, source, logTab + 1)
    securities = securities.filter(sec => sec.isin.length != 0)
    return securities
  } catch (err) {
    catchError(err, 'getSecuritiesList', undefined, undefined, logTab, source)
    throw new Error(err)
  }
}

async function getSecuritiesFromHTML(html, source, logTab) {
  try {
    lg(`START - getSecuritiesFromHTML`, logTab + 1, 'info', source)
    let Trs = await scraping.getTrsFromPage(
      html,
      `tbody tr`,
      gfinalConfig[source].target_tds,
      999999999,
      'text',
      logTab + 1
    )
    return Trs
  } catch (err) {
    catchError(err, 'getSecuritiesList', undefined, undefined, logTab, source)
    throw new Error(err)
  }
}
