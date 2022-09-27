const express = require('express')
const functions = require(`../../services/functions/Feurnxteq.js`)
const { saveToCSV, logUserIP, catchError, gFName } = require(`../../services/tools`)

const router = express.Router()
module.exports = router

let source = 'EurNxtEq'
let logTab = 1

// @route GET /
// @desc Get Denmark data in a CSV
// @access Public
router.get('/', async function getEuronextEquitiesUpdates(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    logUserIP(req)
    let csv_obj = await functions.getEuronextEquitiesUpdates(source, logTab)
    let full_file_path = await saveToCSV(csv_obj, source, logTab, source)
    res.download(full_file_path)
    // res.send(csv_obj);
  } catch (err) {
    catchError(err, gFName(new Error()), undefined, undefined, logTab, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getAllSecurities', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    let csv_obj = await functions.getEuronextEquitiesSecurities(source, 1)
    res.send(csv_obj)
  } catch (err) {
    catchError(err, 'getAllSecurities')
    res.status(500).send(`Server Error`)
  }
})

router.get('/getEuronextEquitiesListInPage', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    let csv_obj = await functions.getEuronextEquitiesListInPage(source, req.params.pageId, logTab)
    res.send(csv_obj)
  } catch (err) {
    catchError(err, 'getEuronextEquitiesListInPage')
    res.status(500).send(`Server Error`)
  }
})

router.post('/details', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    let data = await functions.getEuronextEquitiesOneSecurityDetails(
      source,
      req.body.ISIN,
      req.body.market,
      logTab
    )

    res.send(data)
  } catch (err) {
    catchError(err, 'EuronextEquities')
    res.status(500).send(`Server Error`)
  }
})
