const express = require('express')
const functions = require(`../../services/functions/Frosario.js`)
const tools = require(`../../services/tools`)

const router = express.Router()
module.exports = router

// @route GET /
// @desc Get Rosario updates
// @access Public
router.get('/', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let csv_obj = await functions.getRosarioUpdates()
    let full_file_path = await tools.saveToCSV(csv_obj, 'rosario')
    res.download(full_file_path)
    // res.send(csv_obj);
  } catch (err) {
    res.status(500).send(`Server Error`)
  }
})
