const express = require('express')
const { clg } = require('../../services/tools')
const functions = require(`../../services/functions/Ffisd.js`)
const tools = require(`../../services/tools`)

const router = express.Router()
module.exports = router

let source = 'fisd'
let log_tab = 1

router.get('/', async function geFisdUpdates(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let csv_obj = await functions.getFISDUpdates(source, log_tab)
    let full_file_path = await tools.saveToCSV(csv_obj, source, log_tab, source)
    res.download(full_file_path)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    res.status(500).send(`Server Error`)
  }
})
router.get('/getAllNotices', async function getAllNotices(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let articles = await functions.getAllNotices(source, log_tab)
    res.json(articles)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getNoticesForPage', async function getNoticesForPage(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let articles = await functions.getNoticesForPage(source, req.body.pageID, log_tab)
    res.json(articles)
    // res.send(details);
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getAllNoticesDetails', async function getAllNoticesDetails(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let details = await functions.getAllNoticesDetails(source, req.body, log_tab)
    res.json(details)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/login', async function login(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let details = await functions.loginPupe(source, log_tab)
    res.send(details)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getAll', async function login(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let details = await functions.getAll(source, log_tab)
    res.send(details)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getOnePageDetails', async function getOneNoticeDetails(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)

    let details = await functions.getOnePageDetails(source, req.body, log_tab)
    res.send(details)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    res.status(500).send(`Server Error`)
  }
})
