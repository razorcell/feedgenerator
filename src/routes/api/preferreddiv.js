const express = require('express')
const { clg } = require('../../services/tools')
const functions = require(`../../services/functions/Fpreferreddiv.js`)
const tools = require(`../../services/tools`)

const router = express.Router()
module.exports = router

let source = 'preferreddiv'
let log_tab = 1
// @route GET /
// @desc Get Course direct free float
// @access Public
router.get('/', async function getPreferredDividendsUpdates(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let csv_obj = await functions.getPreferredDividendsUpdates(source, log_tab)
    let full_file_path = await tools.saveToCSV(csv_obj, source, log_tab, source)
    res.download(full_file_path)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getDividendsForOneSecurity', async function getDividendsForOneSecurity(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let dividends = await functions.getDividendsForOneSecurity(source, req.body, log_tab)
    res.json(dividends)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getPreferredSharesFromWCA', async function getPreferredSharesFromWCA(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let securities = await functions.getPreferredSharesFromWCA(source, log_tab)
    res.json(securities)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    res.status(500).send(`Server Error`)
  }
})
