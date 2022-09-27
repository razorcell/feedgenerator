const express = require('express')
const { clg } = require('../../services/tools')
const functions = require(`../../services/functions/Fdenmark.js`)
const tools = require(`../../services/tools`)

const router = express.Router()
module.exports = router

let source = 'denmark'
let log_tab = 1
// @route GET /
// @desc Get Denmark data in a CSV
// @access Public
router.get('/', async function getDenmarkUpdates(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let csv_obj = await functions.getDenmarkUpdates(source, log_tab)
    let full_file_path = await tools.saveToCSV(csv_obj, source, log_tab, source)
    res.download(full_file_path)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    res.status(500).send(`Server Error`)
  }
})
