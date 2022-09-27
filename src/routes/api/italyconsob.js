const express = require('express')
const functions = require(`../../services/functions/Fitalyconsob.js`)
const { catchError, saveToCSV, logUserIP } = require('../../services/tools')

const router = express.Router()
module.exports = router

let source = 'italyconsob'
let logTab = 1

// @route GET /
// @desc Get Italy data in a CSV
// @access Public
router.get('/', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    logUserIP(req)
    let csv_obj = await functions.getItalyConsobFloatUpdates(source, logTab)
    let full_file_path = await saveToCSV(csv_obj, source, logTab, source)
    res.download(full_file_path)
  } catch (err) {
    catchError(err, '', undefined, undefined, 1, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getItalyConsobShares', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    logUserIP(req)
    let csv_obj = await functions.getItalyConsobShares(source, logTab)
    res.send(csv_obj)
  } catch (err) {
    catchError(err, '', undefined, undefined, 1, source)
    res.status(500).send(`Server Error`)
  }
})

router.post('/getItalyConsobSharesInPage', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    logUserIP(req)
    let csv_obj = await functions.getItalyConsobSharesInPage(source, req.body.page_id, logTab)
    res.send(csv_obj)
  } catch (err) {
    catchError(err, '', undefined, undefined, 1, source)
    res.status(500).send(`Server Error`)
  }
})

router.post('/getItalyConsobShareFloatDetails', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    logUserIP(req)
    let csv_obj = await functions.getItalyConsobShareFloatDetails(
      source,
      req.body.label,
      req.body.URI,
      logTab
    )
    res.send(csv_obj)
  } catch (err) {
    catchError(err, '', undefined, undefined, 1, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getItalyConsobFloatUpdates', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    logUserIP(req)
    let csv_obj = await functions.getItalyConsobFloatUpdates()
    res.send(csv_obj)
  } catch (err) {
    catchError(err, '', undefined, undefined, 1, source)
    res.status(500).send(`Server Error`)
  }
})
