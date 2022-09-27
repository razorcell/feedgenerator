const express = require('express')
const { clg } = require('../../services/tools')
const functions = require(`../../services/functions/Firelandan.js`)
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
    let csv_obj = await functions.getIrelandSEUpdates(req.query.datevalue)
    let full_file_path = await tools.saveToCSV(csv_obj, 'ireland')
    res.download(full_file_path)
  } catch (err) {
    tools.catchError(err, 'ireland', undefined, undefined, 1)
    res.status(500).send(`Server Error`)
  }
})

router.post('/getAnnouncementsFromPage', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let data = await functions.getAnnouncementsFromPage(
      req.body.page_id,
      req.body.start_date,
      req.body.end_date
    )
    res.send(data)
  } catch (err) {
    tools.catchError(err, 'getAnnouncementsFromPage', true, 'error', 2)
    res.status(500).send(`Server Error`)
  }
})

router.post('/getAllAnnouncements', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let data = await functions.getAllAnnouncements(req.body.start_date, req.body.end_date, 2)
    res.send(data)
  } catch (err) {
    tools.catchError(err, 'getAllAnnouncements', true, 'error', 2)
    res.status(500).send(`Server Error`)
  }
})

router.post('/getArticleBody', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let data = await functions.getArticleBody(req.body.url, 2)
    res.send(data)
  } catch (err) {
    tools.catchError(err, 'getArticleBody', true, 'error', 2)
    res.status(500).send(`Server Error`)
  }
})
