import express from 'express'
import {
  getMexicoETFUpdates,
  getAllCompanies,
  getAllSecurities,
  getOneSecurityDetails,
  getAllSecuritiesForOneCompany,
  getListingDateForOneCompany,
} from '../../services/functions/Fmexicoetf'
import { logUserIP, saveToCSV, catchError } from '../../services/tools'

const router = express.Router()
export default router

const source = 'mexicoetf'
const logTab = 1
const sourceConfig: MexicoETFSourceConfig = global.gfinalConfig[source]

router.get('/', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    logUserIP(req)
    let csv_obj = await getMexicoETFUpdates(source, sourceConfig, logTab)
    let full_file_path = await saveToCSV(csv_obj, source, logTab, source)
    res.download(full_file_path)
  } catch (err) {
    catchError(err, '/', undefined, undefined, logTab, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getAllCompanies', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    logUserIP(req)
    let details = await getAllCompanies(source, logTab)
    res.json(details)
  } catch (err) {
    catchError(err, '/getAllCompanies', undefined, undefined, logTab, source)
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
