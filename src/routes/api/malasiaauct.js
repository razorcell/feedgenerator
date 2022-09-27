const express = require('express')
const { clg } = require('../../services/tools')
const functions = require(`../../services/functions/Fmalasiaann.js`)
const tools = require(`../../services/tools`)

const router = express.Router()
module.exports = router

//Simplify logging
const lg = tools.lg
let source = 'malasiaauct'
let log_tab = 1

// @route GET /
// @desc Get Rosario updates
// @access Public
router.get('/', async function getMalasiaAuctions(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let csv_obj = await functions.getMalasiaAuctions(1)
    let full_file_path = await tools.saveToCSV(csv_obj, 'malasiaauct')
    res.download(full_file_path)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    res.status(500).send(`Server Error`)
  }
})

router.post('/getNoticesFromPage', async function getNoticesFromPage(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let data = await functions.getNoticesFromPage(
      req.body.page_id,
      `malasiaann`,
      {
        label: 'AUCTIONS',
        taskID: 'PB050400',
        screenId: 'PB050400',
        txtHeader: `Tender+DescriptionTender+CodeStock+CodeIssuerIssue+DateFacility+Agent`,
      },
      2
    )
    res.json(data)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getAllNotices', async function getAllNotices(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let params = {
      label: 'AUCTIONS',
      taskID: 'PB050400',
      screenId: 'PB050400',
      txtHeader: `Tender+DescriptionTender+CodeStock+CodeIssuerIssue+DateFacility+Agent`,
    }
    let notices = await functions.getAllNotices(`malasiaann`, params, 2)
    res.json(notices)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    res.status(500).send(`Server Error`)
  }
})

router.post('/getAllArticles', async function getAllArticles(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let params = {
      label: 'AUCTIONS',
      taskID: 'PB050400',
      screenId: 'PB050400',
      txtHeader: `Tender+DescriptionTender+CodeStock+CodeIssuerIssue+DateFacility+Agent`,
    }
    let notices = await functions.getAllNotices(`malasiaann`, params, 2)
    let articles = await functions.getAllArticles(notices, `malasiaann`, 'MY_FI_BIH', params, 2)
    res.json(articles)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getArticleBody', async function getArticleBody(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let Notice = {
      description: 'MMTO B C C 13.10.2020 1D',
      code: '<a href="PublicInfoServlet.do?chkBox=202000002085%E6MTENDER&amp;mode=DISPLAY&amp;info=TENDERRESULTS&amp;screenId=PB050400"><u>202000002085</u></a>',
      stockcode: 'A20C1103',
      issuer: 'BNM',
      issuedate: '12/10/2020',
      agent: 'BNM',
      id: '202000002085',
      url: 'PublicInfoServlet.do?chkBox=202000002085%E6MTENDER&mode=DISPLAY&info=TENDERRESULTS&screenId=PB050400',
    }
    let data = await functions.getArticleBody(
      Notice,
      `malasiaann`,
      'MY_FI_BIH',
      {
        label: 'AUCTIONS',
        taskID: 'PB050400',
        screenId: 'PB050400',
        txtHeader: `Tender+DescriptionTender+CodeStock+CodeIssuerIssue+DateFacility+Agent`,
      },
      2
    )
    res.json(data)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    res.status(500).send(`Server Error`)
  }
})
