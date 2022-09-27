const express = require('express')
const functions = require(`../../services/functions/Fglobalnewswire.js`)
const { logUserIP, catchError, gFName, saveToCSV, clg } = require(`../../services/tools`)

const router = express.Router()
module.exports = router

let source = 'globalnewswire'
let log_tab = 1

router.get('/', async function getActusNewsUpdates(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    logUserIP(req)
    let csv_obj = await functions.getActusNewsUpdates(source, log_tab)
    let full_file_path = await saveToCSV(csv_obj, source, log_tab, source)
    res.download(full_file_path)
  } catch (err) {
    catchError(err, gFName(new Error()), undefined, undefined, log_tab, source)
    res.status(500).send(`Server Error`)
  }
})
router.get('/getAllNotices', async function getAllNotices(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    logUserIP(req)
    let articles = await functions.getAllNotices(source, log_tab)
    res.json(articles)
  } catch (err) {
    catchError(err, gFName(new Error()), undefined, undefined, log_tab, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getNoticesForPage', async function getNoticesForPage(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    logUserIP(req)
    let articles = await functions.getNoticesForPage(source, req.body.pageID, log_tab)
    res.json(articles)
    // res.send(details);
  } catch (err) {
    catchError(err, gFName(new Error()), undefined, undefined, log_tab, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getAllNoticesDetails', async function getAllNoticesDetails(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    logUserIP(req)
    let details = await functions.getAllNoticesDetails(source, req.body, log_tab)
    res.json(details)
  } catch (err) {
    catchError(err, gFName(new Error()), undefined, undefined, log_tab, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getOneNoticeDetails', async function getOneNoticeDetails(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    logUserIP(req)
    let details = await functions.getOneNoticeDetails(source, req.body, log_tab)
    res.send(details)
  } catch (err) {
    catchError(err, gFName(new Error()), undefined, undefined, log_tab, source)
    res.status(500).send(`Server Error`)
  }
})
