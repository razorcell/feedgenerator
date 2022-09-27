const express = require('express')
const { clg } = require('../../services/tools')
const functions = require(`../../services/functions/Fmalasiaannpdf.js`)
const tools = require(`../../services/tools`)

const router = express.Router()
module.exports = router

//Simplify logging
const lg = tools.lg
let source = 'malasiaannpdf'
let log_tab = 1

// @route GET /
// @desc Get Rosario updates
// @access Public
router.get('/', async function getMalasiaAnnouncementsForDate(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    // let csv_obj = await functions.getMalasiaAnnouncements(1);
    let csv_obj = await functions.getMalasiaAnnouncementsForDate(source, req.query.datevalue, log_tab)
    let full_file_path = await tools.saveToCSV(csv_obj, source, log_tab + 1, source)
    res.download(full_file_path)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, 1, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getAllNoticesForDate', async function getAllNoticesForDate(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let params = {
      label: 'ANNOUNCEMENTS',
      taskID: 'PB010400',
      screenId: 'PB010400',
      txtHeader: `News+IDEmbargo+DateOrganisation+NameNews+TypeNews+SubjectNews+Summary`,
      txtSortingColumn: `2`,
      txtSortingOrder: `-1`,
    }
    let notices = await functions.getAllNoticesForDate(source, req.query.datevalue, params, log_tab)
    res.json(notices)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, 1, source)
    res.status(500).send(`Server Error`)
  }
})

router.post('/getNoticesFromPage', async function getNoticesFromPage(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let data = await functions.getNoticesFromPage(
      req.body.page_id,
      source,
      {
        label: 'ANNOUNCEMENTS',
        taskID: 'PB010400',
        screenId: 'PB010400',
        txtHeader: `News+IDEmbargo+DateOrganisation+NameNews+TypeNews+SubjectNews+Summary`,
        txtSortingColumn: `2`,
        txtSortingOrder: `-1`,
      },
      log_tab
    )
    res.json(data)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, 1, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getAllNotices', async function getAllNotices(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let params = {
      label: 'ANNOUNCEMENTS',
      taskID: 'PB010400',
      screenId: 'PB010400',
      txtHeader: `News+IDEmbargo+DateOrganisation+NameNews+TypeNews+SubjectNews+Summary`,
    }
    let notices = await functions.getAllNotices(`malasiaann`, params, 2)
    res.json(notices)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, 1, source)
    res.status(500).send(`Server Error`)
  }
})

router.post('/getAllArticles', async function getAllArticles(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let params = {
      label: 'ANNOUNCEMENTS',
      taskID: 'PB010400',
      screenId: 'PB010400',
      txtHeader: `News+IDEmbargo+DateOrganisation+NameNews+TypeNews+SubjectNews+Summary`,
    }
    let notices = await functions.getAllNotices(`malasiaann`, params, 2)
    let articles = await functions.getAllArticles(notices, `malasiaann`, 'MY_FI_BIH', params, 2)
    res.json(articles)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, 1, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getArticleBody', async function getArticleBody(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let Notice = {
      newsid:
        '<a href="PublicInfoServlet.do?chkBox=2020101500028&amp;mode=DISPLAY&amp;info=NEWS&amp;screenId=PB010400"><u>2020101500028</u></a>',
      embargodate: '15/10/2020 05:20:00 PM',
      organization: 'MALAYSIAN RATING CORPORATION',
      type: 'RATING ANNOUNCEMENT',
      subject: 'TITIJAYA LAND BERHAD',
      id: '2020101500028',
      url: 'PublicInfoServlet.do?chkBox=2020101500028&mode=DISPLAY&info=NEWS&screenId=PB010400',
    }
    let data = await functions.getArticleBody(
      Notice,
      `malasiaann`,
      'MY_FI_BIH',
      {
        label: 'ANNOUNCEMENTS',
        taskID: 'PB010400',
        screenId: 'PB010400',
        txtHeader: `News+IDEmbargo+DateOrganisation+NameNews+TypeNews+SubjectNews+Summary`,
      },
      2
    )
    res.json(data)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, 1, source)
    res.status(500).send(`Server Error`)
  }
})
