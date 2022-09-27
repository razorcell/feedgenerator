const express = require('express')
const functions = require(`../../services/functions/Fgermanff.js`)
const tools = require(`../../services/tools`)

const router = express.Router()
module.exports = router

let source = 'germanff'
let log_tab = 1

// @route GET /
// @desc Get Course direct free float
// @access Public
router.get('/', async function getPolandUpdates(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let csv_obj = await functions.getGermanFreeFloatUpdates(source, log_tab)
    let full_file_path = await tools.saveToCSV(csv_obj, source, log_tab, source)
    res.download(full_file_path)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/matchAllSecuritiesFromHypobank', async function matchAllSecuritiesFromHypobank(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let securities = await functions.getGermanSecuritiesFromWCA()
    let matches = await functions.matchAllSecuritiesWithHypoBank(securities, `germanff`, 2)
    res.json(matches)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/matchOneSecurity', async function matchOneSecurity(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let matches = await functions.matchOneSecurityWithHypoBank(
      source,
      {
        ISIN: `DE0005002505`,
      },
      log_tab + 1
    )
    // let matches = await functions.matchAllSecuritiesWithHypoBank(securities, `germanff`, 2);
    res.json(matches)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getFloatFigureForOneSecurity', async function getFloatFigureForOneSecurity(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let matches = await functions.getFloatFigureForOneSecurity(
      source,
      {
        similarity_ratio: '33 %',
        isin: 'DE0005002505',
        name_on_site: 'ANTERRA VERMOEGENSVERW.',
        symbol_on_site: 'STO',
        main_url: 'https://kurse.hypovereinsbank.de/hvb-markets/stocks/Overview.htm?id=15089278',
        freefloat_url:
          'https://kurse.hypovereinsbank.de/hvb-markets/ajax/stocks/overview/keyData.htm?id=15089278',
        id: '15089278',
      },
      log_tab + 1
    )
    // let matches = await functions.matchAllSecuritiesWithHypoBank(securities, `germanff`, 2);
    res.json(matches)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getGermanSecuritiesFromWCA', async function getGermanSecuritiesFromWCA(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let securities = await functions.getGermanSecuritiesFromWCA()
    res.json(securities)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    res.status(500).send(`Server Error`)
  }
})
