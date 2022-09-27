const express = require('express')
const { clg } = require('../../services/tools')
const functions = require(`../../services/functions/Fbelarus.js`)
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
    let csv_obj = await functions.getBelarusUpdates()
    let full_file_path = await tools.saveToCSV(csv_obj, 'belarus')
    res.download(full_file_path)
    // res.send(csv_obj);
  } catch (err) {
    lg(`getBelarus:  ${err.message}`, 2, 'error')
    res.status(500).send(`Server Error`)
  }
})

router.get('/getSecuritiesFromPage', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    // let all_securities = await functions.getAllSecurities();
    let data = await functions.getSecuritiesFromPage(1)

    // clg(data);
    res.send(data)
    // res.send(csv_obj);
  } catch (err) {
    // tools.catchError(err, "general", true, "error", 2);
    lg(`getSecuritiesFromPage:  ${err.message}`, 2, 'error')
    res.status(500).send(`Server Error`)
  }
})
