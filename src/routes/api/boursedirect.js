const express = require('express')
const functions = require(`../../services/functions/Fboursedirect.js`)
const tools = require(`../../services/tools`)

const router = express.Router()
module.exports = router
let source = 'boursedirect'
let log_tab = 1
// @route GET /
// @desc Get Course direct free float
// @access Public
router.get('/', async function getBdFreeFloatUpdates(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let csv_obj = await functions.getBdFreeFloatUpdates(source, log_tab)
    let full_file_path = await tools.saveToCSV(csv_obj, source, log_tab + 1, source)
    res.download(full_file_path)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/boursedirectshares', async function boursedirectshares(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let securities = await functions.getEuronextSecuritiesFromDB()
    let matches = await functions.matchAllSecuritiesWithBourseDirect(securities)
    res.json(matches)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    res.status(500).send(`Server Error`)
  }
})
router.get('/getEuronextSecuritiesFromDB', async function getEuronextSecuritiesFromDB(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let securities = await functions.getEuronextSecuritiesFromDB()
    res.json(securities)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    res.status(500).send(`Server Error`)
  }
})
