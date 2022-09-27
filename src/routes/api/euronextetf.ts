import * as express from 'express'
import { logUserIP, catchError, saveToCSV } from '../../services/tools'
import {
  getEuronextETFs,
  getEuronextEtfListInPage,
  getAllSecurities,
} from '../../services/functions/Feuronextetf'

const router = express.Router()
export default router

let source = 'euronextetf'
let logTab = 1

const sourceConfig: EuronextETFSourceConfig = global.gfinalConfig[source]

router.get('/', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    logUserIP(req)
    let csv_obj = await getEuronextETFs(source, sourceConfig, logTab)
    let full_file_path = await saveToCSV(csv_obj, source, logTab, source)
    res.download(full_file_path)
  } catch (err) {
    catchError(err, '/', undefined, undefined, logTab, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getEuronextEtfListInPage', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    logUserIP(req)
    const pageId = req.body.pageId
    let csv_obj = await getEuronextEtfListInPage(source, pageId, sourceConfig, logTab)
    res.send(csv_obj)
  } catch (err) {
    catchError(err, '/getEuronextEtfListInPage', undefined, undefined, logTab, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getAllSecurities', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    logUserIP(req)
    let csv_obj = await getAllSecurities(source, sourceConfig, logTab)
    res.json(csv_obj)
  } catch (err) {
    catchError(err, '/getAllSecurities', undefined, undefined, logTab, source)
    res.status(500).send(`Server Error`)
  }
})
