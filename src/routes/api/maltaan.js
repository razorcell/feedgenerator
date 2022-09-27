const express = require('express')
const { clg } = require('../../services/tools')
const functions = require(`../../services/functions/Fmaltaan.js`)
const tools = require(`../../services/tools`)

const router = express.Router()
module.exports = router

let source = 'maltaan'
let log_tab = 1

//Simplify logging
const lg = tools.lg

// @route GET /
// @desc Get Rosario updates
// @access Public
router.get('/', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let csv_obj = await functions.getMaltaANUpdates(source, log_tab)
    let full_file_path = await tools.saveToCSV(csv_obj, source, log_tab, source)
    res.download(full_file_path)
  } catch (err) {
    tools.catchError(err, 'maltaan', undefined, undefined, log_tab, source)
    res.status(500).send(`Server Error`)
  }
})

router.post('/getAnnouncementsFromPage', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let data = await functions.getAnnouncementsFromPage(
      source,
      req.body.page_id,
      req.body.announcement_type,
      log_tab
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
    let data = await functions.getAllAnnouncements(source, req.body.announcement_type, log_tab)
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
    let data = await functions.getArticleBody(source, req.body, log_tab)
    res.json(data)
  } catch (err) {
    tools.catchError(err, 'getArticleBody', true, 'error', 2)
    res.status(500).send(`Server Error`)
  }
})
