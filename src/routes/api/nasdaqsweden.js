const express = require('express')
const tools = require(`../../services/tools`)
const functions = require(`../../services/functions/Fnasdaqsweden.js`)

const router = express.Router()
module.exports = router

let source = 'nasdaqsweden'
let log_tab = 1
// @route GET /
// @desc Get Denmark data in a CSV
// @access Public
router.get('/', async function getNasdaqswedenUpdates(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let csv_obj = await functions.getNasdaqswedenUpdates(source, log_tab)
    let full_file_path = await tools.saveToCSV(csv_obj, source, log_tab, source)
    res.download(full_file_path)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, 1)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getSecuritiesList', async function getSecuritiesList(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let params = {
      XPath: '//inst',
      marketvalue: 'GITS:FIINFLATIONLINKEDBONDS40015',
    }
    let csv_obj = await functions.getSecuritiesList(params, `nasdaqsweden`, 1)
    res.send(csv_obj)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, 1)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getAllSecurities', async function getAllSecurities(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let csv_obj = await functions.getAllSecurities(`nasdaqsweden`, 1)
    res.send(csv_obj)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, 1)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getOneDetails', async function getOneDetails(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let security = {
      isin: 'SE0001149311',
      issuer: 'Svenska Staten',
      name: 'XSSERGKB_1047',
      url: 'http://www.nasdaqomxnordic.com/bonds/sweden/microsite?Instrument=XSSERGKB_1047',
    }
    let csv_obj = await functions.getOneDetails(security, `nasdaqsweden`, 1)
    res.send(csv_obj)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, 1)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getOneOutstandingDetails', async function getOneOutstandingDetails(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let security = {
      isin: 'SE0001149311',
      issuer: 'Svenska Staten',
      name: 'XSSERGKB_1047',
      url: 'http://www.nasdaqomxnordic.com/bonds/sweden/microsite?Instrument=XSSERGKB_1047',
    }
    let csv_obj = await functions.getOneOutstandingDetails(security, `nasdaqsweden`, 1)
    res.send(csv_obj)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, 1)
    res.status(500).send(`Server Error`)
  }
})
