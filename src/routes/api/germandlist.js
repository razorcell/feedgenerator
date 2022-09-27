const express = require('express')
const functions = require(`../../services/functions/Fgermandlist.js`)
const tools = require(`../../services/tools`)
const lg = tools.lg

const router = express.Router()
module.exports = router

let source = 'germandlist'
let log_tab = 1

// @route GET /
// @desc Get Course direct free float
// @access Public
router.get('/', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let csv_obj = await functions.getGermanMissingDelistingUpdates(source, log_tab)
    let full_file_path = await tools.saveToCSV(csv_obj, source, log_tab, source)
    res.download(full_file_path)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, 1, source)
    res.status(500).send(`Server Error`)
  }
})
