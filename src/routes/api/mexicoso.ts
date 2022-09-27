import express from 'express'
import {
  getMexicoSOUpdates,
  getAllSecurities,
  getOneSecurityDetails,
  getAllCompaniesTypes,
  getOneCompaniesType,
  getAllSecuritiesForOneCompany,
  getListingDateForOneCompany,
} from '../../services/functions/Fmexicoso'
import { logUserIP, saveToCSV, catchError } from '../../services/tools'

const router = express.Router()
module.exports = router

const source = 'mexicoso'
const logTab = 1
const sourceConfig: MexicoSOSourceConfig = global.gfinalConfig[source]

router.get('/', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    logUserIP(req)
    let csv_obj = await getMexicoSOUpdates(source, sourceConfig, logTab)
    let full_file_path = await saveToCSV(csv_obj, source, logTab, source)
    res.download(full_file_path)
  } catch (err) {
    catchError(err, '/', undefined, undefined, logTab, source)
    res.status(500).send(`Server Error`)
  }
})
router.post('/getAllSecurities', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    logUserIP(req)
    let securities = await getAllSecurities(source, req.body, sourceConfig, logTab)
    res.json(securities)
  } catch (err) {
    catchError(err, '/getAllSecurities', undefined, undefined, logTab, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getOneSecurityDetails', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    logUserIP(req)
    let details = await getOneSecurityDetails(source, req.body, logTab)
    res.json(details)
  } catch (err) {
    catchError(err, '/getOneSecurityDetails', undefined, undefined, logTab, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getAllCompaniesTypes', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    logUserIP(req)
    let details = await getAllCompaniesTypes(source, sourceConfig, logTab)
    res.json(details)
  } catch (err) {
    catchError(err, '/getAllCompaniesTypes', undefined, undefined, logTab, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getOneCompaniesType', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    logUserIP(req)
    let details = await getOneCompaniesType(source, req.body, logTab)
    res.json(details)
  } catch (err) {
    catchError(err, '/getOneCompaniesType', undefined, undefined, logTab, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getListingDateForOneCompany', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    logUserIP(req)
    let details = await getListingDateForOneCompany(source, req.body, sourceConfig, logTab)
    res.json(details)
  } catch (err) {
    catchError(err, '/getListingDateForOneCompany', undefined, undefined, logTab, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getAllSecuritiesForOneCompany', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    logUserIP(req)
    let details = await getAllSecuritiesForOneCompany(source, req.body, logTab)
    res.json(details)
  } catch (err) {
    catchError(err, '/getAllSecuritiesForOneCompany', undefined, undefined, logTab, source)
    res.status(500).send(`Server Error`)
  }
})
