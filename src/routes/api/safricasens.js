const express = require('express')
const { clg } = require('../../services/tools')
const functions = require(`../../services/functions/Fsafricasens.js`)
const tools = require(`../../services/tools`)

const router = express.Router()
module.exports = router

//Simplify logging
const lg = tools.lg

const source = 'safricasens'
const log_tab = 1

// @route GET /
// @desc Get Rosario updates
// @access Public
router.get('/', async function getSouthAfricaSENS(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let csv_obj = await functions.getSouthAfricaSENS(source, req.query.datevalue, log_tab)
    let full_file_path = await tools.saveToCSV(csv_obj, source, log_tab, source)
    res.download(full_file_path)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, 1, source)
    res.status(500).send(`Server Error`)
  }
})

router.post('/getNoticesForDateRange', async function getNoticesForDateRange(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let data = await functions.getNoticesForDateRange(
      `safricasens`,
      {
        start: req.body.start,
        end: req.body.end,
      },
      2
    )
    res.json(data)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, 1, source)
    res.status(500).send(`Server Error`)
  }
})

// router.get("/getAllNotices", async function getAllNotices(req, res) {
//   try {
//     req.setTimeout(20 * 60 * 60 * 1000); //force timeout to 4 hours
//     tools.logUserIP(req);
//     let params = {
//       label: 'STOCK',
//       taskID: 'PB030900',
//       screenId: 'PB030900',
//       txtHeader: `Stock+CodeStock+DescriptionISIN+CodeIssuerFacility+CodeInstrument+IDIssue+DateMaturity+DateCurrencyCurrency+Exchange+Rate`,
//     };
//     let notices = await functions.getAllNotices(`malasiaann`, params, 2);
//     res.json(notices);
//   } catch (err) {
//     tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab);
//     reject(`${tools.gFName(new Error())} : ${err.message}`);
//   }
// });

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
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab)
    reject(`${tools.gFName(new Error())} : ${err.message}`)
  }
})

router.get('/getArticleBody', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let notice = {
      subject: 'TFS165 TFS166 - Listing of New Financial Instruments',
      onclick: 'ViewSENSWithHighlight(369951);return false;',
      id: '369951',
    }
    let data = await functions.getArticleBody(notice, `safricasens`, 'ZA_FI_SENS_', 2)
    res.json(data)
  } catch (err) {
    tools.catchError(err, 'getArticleBody', true, 'error', 2)
    res.status(500).send(`Server Error`)
  }
})
