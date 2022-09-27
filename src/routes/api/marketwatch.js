const express = require('express')
const functions = require(`../../services/functions/marketwatch.js`)
const tools = require(`../../services/tools`)

const router = express.Router()
module.exports = router

// @route GET /
// @desc Get Denmark data in a CSV
// @access Public
router.get('/', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let csv_obj = await functions.getMarketwatchUpdates()
    let full_file_path = await tools.saveToCSV(csv_obj, 'Marketwatch')
    res.download(full_file_path)
  } catch (err) {
    tools.catchError(err, 'get /marketwatch')
    res.status(500).send(`Server Error`)
  }
})

router.post('/getMarketwatchOneSecurityDetails', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    let details = await functions.getMarketwatchOneSecurityDetails(
      req.body.isin,
      req.body.symbol,
      req.body.country_code,
      req.body.type
    )
    res.send(details) //json object
  } catch (err) {
    tools.catchError(err, 'post /getMarketwatchOneSecurityDetails')
    res.status(500).send(`Server Error`)
  }
})
