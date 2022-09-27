const express = require('express')
const tools = require(`../../services/tools`)
const functions = require(`../../services/functions/Fkase.js`)

const router = express.Router()
module.exports = router

// @route GET /
// @desc Get Denmark data in a CSV
// @access Public
router.get('/', async function getKACDUpdates(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let csv_obj = await functions.getKASEUpdates('kase', 1)
    let full_file_path = await tools.saveToCSV(csv_obj, 'kase')
    res.download(full_file_path)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, 1)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getSecuritiesFromHTML', async function getSecuritiesFromHTML(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let list = await functions.getSecuritiesFromHTML('kase', 1)
    res.json(list)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, 1)
    res.status(500).send(`Server Error`)
  }
})
