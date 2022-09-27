const express = require('express')
const { clg } = require('../../services/tools')
const functions = require(`../../services/functions/Fmaltanews.js`)
const tools = require(`../../services/tools`)

const router = express.Router()
module.exports = router

//Simplify logging
const lg = tools.lg
let source = 'maltanews'
let log_tab = 1
// @route GET /
// @desc Get Rosario updates
// @access Public
router.get('/', async function getMaltaNewsUpdates(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let csv_obj = await functions.getMaltaNewsUpdates(source, log_tab)
    let full_file_path = await tools.saveToCSV(csv_obj, source, log_tab, source)
    res.download(full_file_path)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, 1, source)
    res.status(500).send(`Server Error`)
  }
})

router.post('/getAnnouncementsFromPage', async function getAnnouncementsFromPage(req, res) {
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
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, 1, source)
    res.status(500).send(`Server Error`)
  }
})

router.post('/getAllAnnouncements', async function getAllAnnouncements(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let data = await functions.getAllAnnouncements(source, req.body.announcement_type, log_tab)
    res.send(data)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, 1, source)
    res.status(500).send(`Server Error`)
  }
})

router.post('/getArticleBody', async function getArticleBody(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let announcement = {
      Id: 0,
      Code: 'SPF18',
      Name: 'Annual General Meeting of the Company',
      Date: '13/Aug/2020',
      DateTime: '/Date(1597347124583)/',
      FriendlyUrl: '/announcement-mrk09',
      Summary: 'SP Finance plc',
      Description: null,
      Type: 3,
    }

    let data = await functions.getArticleBody(source, req.body, log_tab)
    res.json(data)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, 1, source)
    res.status(500).send(`Server Error`)
  }
})
