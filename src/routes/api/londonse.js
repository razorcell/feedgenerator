const express = require('express')
const { clg } = require('../../services/tools')
const functions = require(`../../services/functions/Flondonse.js`)
const tools = require(`../../services/tools`)

const router = express.Router()
module.exports = router

//Simplify logging
const lg = tools.lg

// @route GET /
// @desc Get Rosario updates
// @access Public
router.get('/', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let csv_obj = await functions.getLondonSEUpdates(req.query.datevalue)
    let full_file_path = await tools.saveToCSV(csv_obj, 'londonse')
    res.download(full_file_path)
  } catch (err) {
    lg(`londonse:  ${err.message}`, 2, 'error')
    res.status(500).send(`Server Error`)
  }
})

router.get('/getAnnouncementsList', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    // let all_securities = await functions.getAllSecurities();
    let params = {
      headlines: `16,75,79`,
      beforedate: req.query.datevalue,
      afterdate: req.query.datevalue,
      size: `500`,
      page_id: `0`,
    }
    let data = await functions.getAnnouncementsList(params)
    // clg(data);
    res.send(data)
    // res.send(csv_obj);
  } catch (err) {
    // tools.catchError(err, "general", true, "error", 2);
    lg(`getAnnouncementsList:  ${err.message}`, 2, 'error')
    res.status(500).send(`Server Error`)
  }
})
