const express = require('express')
const { clg } = require('../../services/tools')
const functions = require(`../../services/functions/Fmalasiaann.js`)
const tools = require(`../../services/tools`)

const router = express.Router()
module.exports = router

//Simplify logging
const lg = tools.lg
const log_tab = 1
const source = 'malasiastock'
// @route GET /
// @desc Get Rosario updates
// @access Public
router.get('/', async function getMalasiaStocks(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let csv_obj = await functions.getMalasiaStocks(source, log_tab)
    let full_file_path = await tools.saveToCSV(csv_obj, source)
    res.download(full_file_path)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, 1)
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
        label: 'STOCK',
        taskID: 'PB030900',
        screenId: 'PB030900',
        txtHeader: `Stock+CodeStock+DescriptionISIN+CodeIssuerFacility+CodeInstrument+IDIssue+DateMaturity+DateCurrencyCurrency+Exchange+Rate`,
      },
      2
    )
    res.json(data)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, 1)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getAllNotices', async function getAllNotices(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let params = {
      label: 'STOCK',
      taskID: 'PB030900',
      screenId: 'PB030900',
      txtHeader: `Stock+CodeStock+DescriptionISIN+CodeIssuerFacility+CodeInstrument+IDIssue+DateMaturity+DateCurrencyCurrency+Exchange+Rate`,
      txtSortingColumn: `7`,
      txtSortingOrder: `-1`,
    }
    let notices = await functions.getAllNotices(`malasiaann`, params, 2)
    res.json(notices)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, 1)
    res.status(500).send(`Server Error`)
  }
})

router.post('/getAllArticles', async function getAllArticles(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let params = {
      label: 'STOCK',
      taskID: 'PB030900',
      screenId: 'PB030900',
      txtHeader: `Stock+CodeStock+DescriptionISIN+CodeIssuerFacility+CodeInstrument+IDIssue+DateMaturity+DateCurrencyCurrency+Exchange+Rate`,
    }
    let notices = await functions.getAllNotices(`malasiaann`, params, 2)
    let articles = await functions.getAllArticles(notices, `malasiaann`, 'MY_FI_BIH', params, 2)
    res.json(articles)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, 1)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getArticleBody', async function getArticleBody(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let Notice = {
      code: '<a href="PublicInfoServlet.do?chkBox=VI200223&amp;mode=DISPLAY&amp;info=STOCK&amp;screenId=PB030900"><u>VI200223</u></a>',
      description: 'BPMB IMTN 2.800% 10.10.2025',
      isin: 'MYBVI2002233',
      issuer: 'BPMB',
      facilitycode: '202000039',
      instrumentid: 'IMTN',
      issuedate: '12/10/2020',
      maturity: '10/10/2025',
      currency: 'MYR',
      exchnagerate: '1',
      id: 'VI200223',
      url: 'PublicInfoServlet.do?chkBox=VI200223&mode=DISPLAY&info=STOCK&screenId=PB030900',
    }
    let data = await functions.getArticleBody(
      Notice,
      `malasiaann`,
      'ISIN_DE_EN',
      {
        label: 'STOCK',
        taskID: 'PB030900',
        screenId: 'PB030900',
        txtHeader: `Stock+CodeStock+DescriptionISIN+CodeIssuerFacility+CodeInstrument+IDIssue+DateMaturity+DateCurrencyCurrency+Exchange+Rate`,
      },
      2
    )
    res.json(data)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, 1)
    res.status(500).send(`Server Error`)
  }
})
