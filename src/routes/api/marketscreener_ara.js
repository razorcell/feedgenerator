const express = require('express')
const functions = require(`../../services/functions/Fmarketscreener.js`)
const tools = require(`../../services/tools`)

const router = express.Router()
module.exports = router

let source = 'marketscreener_ara'
let log_tab = 1
// @route GET /
// @desc Get Course direct free float
// @access Public
router.get('/', async function getMarketScreenerFreeFloatUpdates(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let csv_obj = await functions.getMarketScreenerFreeFloatUpdates(source, log_tab)
    let full_file_path = await tools.saveToCSV(csv_obj, source, 1, source)
    res.download(full_file_path)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, 1, source)
    res.status(500).send(`Server Error`)
  }
})

router.get(
  '/matchAllSecuritiesWithMarketScreener',
  async function matchAllSecuritiesWithMarketScreener(req, res) {
    try {
      req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
      tools.logUserIP(req)
      let securitiesFromDB = await functions.getEuronextSecuritiesFromDB()
      let matches = await functions.matchAllSecuritiesWithMarketScreener(
        securitiesFromDB,
        source,
        log_tab + 1
      )
      res.json(matches)
    } catch (err) {
      tools.catchError(err, tools.gFName(new Error()), undefined, undefined, 1, source)
      res.status(500).send(`Server Error`)
    }
  }
)

router.get(
  '/matchOneSecurityWithMarketScreener',
  async function matchOneSecurityWithMarketScreener(req, res) {
    try {
      req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
      tools.logUserIP(req)
      let matches = await functions.matchOneSecurityWithMarketScreener(req.body, 'marketscreener_ara')
      res.json(matches)
    } catch (err) {
      tools.catchError(err, tools.gFName(new Error()), undefined, undefined, 1, source)
      res.status(500).send(`Server Error`)
    }
  }
)

router.get('/getFloatFigureForOneSecurity', async function getFloatFigureForOneSecurity(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let matches = await functions.getMarketScreenerFloatFigureForOneSecurity(req.body, source, log_tab + 1)
    res.json(matches)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, 1, source)
    res.status(500).send(`Server Error`)
  }
})
router.get('/getSearachResultsFromPageHTML', async function getSearachResultsFromPageHTML(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let matches = await functions.getSearachResultsFromPageHTML(req.body)
    res.json(matches)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, 1, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getMiddleEastSecuritiesFromWCA', async function getMiddleEastSecuritiesFromWCA(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let securities = await functions.getMiddleEastSecuritiesFromWCA()
    res.json(securities)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, 1, source)
    res.status(500).send(`Server Error`)
  }
})
