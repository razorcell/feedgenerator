const express = require('express')
const { clg } = require('../../services/tools')
const functions = require(`../../services/functions/Fmsrb.js`)
const tools = require(`../../services/tools`)

const router = express.Router()
module.exports = router

let source = 'msrb'
let log_tab = 1

router.get('/', async function getMSRBUpdates(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let csv_obj = await functions.getMSRBUpdates(source, req.query.datevalue, log_tab)
    let full_file_path = await tools.saveToCSV(csv_obj, source, log_tab, source)
    res.download(full_file_path)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getAllCategoriesNoticesByDate', async function getAllCategoriesNoticesByDate(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let articles = await functions.getAllCategoriesNoticesByDate(source, req.body.date, log_tab)
    res.json(articles)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getNoticesByCategoryAndDate', async function getNoticesByCategoryAndDate(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let { type, date } = req.body
    let articles = await functions.getNoticesByCategoryAndDate(source, JSON.parse(type), date, log_tab)
    res.json(articles)
    // res.send(details);
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getAllNoticesPDFs', async function getAllNoticesPDFs(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let details = await functions.getAllNoticesPDFs(source, req.body, log_tab)
    res.json(details)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getOneNoticePDFs', async function getOneNoticePDFs(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let details = await functions.getOneNoticePDFs(source, req.body, log_tab)
    res.json(details)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/generateGlobalFiles', async function generateGlobalFiles(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let details = await functions.generateGlobalFiles(source, req.body, '20210601', log_tab)
    res.json(details)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    res.status(500).send(`Server Error`)
  }
})
