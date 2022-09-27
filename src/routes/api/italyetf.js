const express = require('express')
const functions = require(`../../services/functions/Fitalyetf.js`)
const { logUserIP, catchError, saveToCSV } = require(`../../services/tools`)

const router = express.Router()
module.exports = router

let source = 'italyetf'
let logTab = 1
// @route GET /
// @desc Get Italy data in a CSV
// @access Public
router.get('/', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    logUserIP(req)
    let csv_obj = await functions.getItalyEtfUpdates(source, logTab)
    let full_file_path = await saveToCSV(csv_obj, source, logTab, source)
    res.download(full_file_path)
  } catch (err) {
    catchError(err, '/', undefined, undefined, logTab, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getItalyEtfs', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    logUserIP(req)
    let csv_obj = await functions.getItalyEtfs(source, logTab)
    res.send(csv_obj)
  } catch (err) {
    catchError(err, '/getItalyEtfs', undefined, undefined, logTab, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getItalyEtfsInPage', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    logUserIP(req)
    let csv_obj = await functions.getItalyEtfsInPage(source, req.query.pageId, logTab)
    res.send(csv_obj)
  } catch (err) {
    catchError(err, '/getItalyEtfsInPage', undefined, undefined, logTab, source)
    res.status(500).send(`Server Error`)
  }
})

router.post('/getOneETFDetails', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    logUserIP(req)
    let csv_obj = await functions.getOneETFDetails(source, req.body.label, req.body.url, logTab)
    res.send(csv_obj)
  } catch (err) {
    catchError(err, '/getOneETFDetails', undefined, undefined, logTab, source)
    res.status(500).send(`Server Error`)
  }
})
