import express from 'express'
import {
  getMexicoCAEQUpdates,
  getAllCompaniesTypes,
  getOneCompaniesType,
  getNoticesForOneCompany,
} from '../../services/functions/Fmexicoeqca'
import { logUserIP, saveToCSV, catchError } from '../../services/tools'

const router = express.Router()
export default router

const source = 'mexicoeqca'
const logTab = 1
const sourceConfig: MexicoEQCASourceConfig = global.gfinalConfig[source]

router.get('/', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    logUserIP(req)
    let csv_obj = await getMexicoCAEQUpdates(source, sourceConfig, logTab)
    let full_file_path = await saveToCSV(csv_obj, source, logTab, source)
    res.download(full_file_path)
  } catch (err) {
    catchError(err, '/', undefined, undefined, logTab, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getNoticesForOneCompany', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    logUserIP(req)
    let details = await getNoticesForOneCompany(source, req.body, sourceConfig, logTab)
    res.json(details)
  } catch (err) {
    catchError(err, '/getNoticesForOneCompany', undefined, undefined, logTab, source)
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
