const express = require('express')
const functions = require(`../../services/functions/Ftaiwanmstr.js`)
const { logUserIP, catchError, saveToCSV } = require(`../../services/tools`)

const router = express.Router()
module.exports = router

let source = 'taiwanmstr'
let logTab = 1
// @route GET /
// @desc Get Denmark data in a CSV
// @access Public
router.get('/', async function getTaiwanMSTRUpdates(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    logUserIP(req)
    let csv_obj = await functions.getTaiwanMSTRUpdates(source, logTab)
    let full_file_path = await saveToCSV(csv_obj, source, logTab, source)
    res.download(full_file_path)
  } catch (err) {
    catchError(err, '/', undefined, undefined, logTab, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getSecuritiesList', async function getSecuritiesList(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    logUserIP(req)
    let list = await functions.getSecuritiesList(source, logTab)
    res.set({
      'content-type': 'text/html; charset=big5',
    })
    res.write(JSON.stringify(list))
    res.end()
  } catch (err) {
    catchError(err, '/getSecuritiesList', undefined, undefined, logTab, source)
    res.status(500).send(`Server Error`)
  }
})
