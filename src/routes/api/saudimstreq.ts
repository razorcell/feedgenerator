import * as express from 'express'
import {
  getOneSecurityProfileDetails,
  getSaudiMSTREqUpdates,
  getSecuritiesList,
} from '../../services/functions/Fsaudimstreq'
import { logUserIP, catchError, saveToCSV } from '../../services/tools'

const router = express.Router()
export default router

const source = 'saudimstreq'
const logTab = 1
const sourceConfig: SaudiMstrEqConfig = global.gfinalConfig[source]

router.get('/', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    logUserIP(req)
    let csv_obj = await getSaudiMSTREqUpdates(source, sourceConfig, logTab)
    let full_file_path = await saveToCSV(csv_obj, source, logTab, source)
    res.download(full_file_path)
  } catch (err) {
    catchError(err, `/`, undefined, undefined, logTab, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getSecuritiesList', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    logUserIP(req)
    let Notices_files = await getSecuritiesList(source, logTab)
    res.json(Notices_files)
  } catch (err) {
    catchError(err, '/getSecuritiesList', undefined, undefined, 1, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getOneSecurityProfileDetails', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    logUserIP(req)
    let Trs = await getOneSecurityProfileDetails(source, sourceConfig, req.body, logTab)
    res.json(Trs)
  } catch (err) {
    catchError(err, '/getOneSecurityProfileDetails', undefined, undefined, 1, source)
    res.status(500).send(`Server Error`)
  }
})
