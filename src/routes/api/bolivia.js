const express = require('express')
const main = require(`../../services/main.js`)
const tools = require(`../../services/tools`)

const router = express.Router()
module.exports = router

// @route GET /
// @desc Get Bolivia data in a CSV
// @access Public
router.get('/', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let csv_obj = await main.getBoliviaBonds()
    let full_file_path = await tools.saveToCSV(csv_obj, 'Bolivia')
    tools.lg(full_file_path)
    res.download(full_file_path)
  } catch (err) {
    tools.catchError(err, 'Bolivia')
    res.status(500).send(`Server Error`)
  }
})
