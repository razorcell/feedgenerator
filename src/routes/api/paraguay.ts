import * as express from 'express'
import { logUserIP, catchError, saveToCSV } from '../../services/tools'
import {
  getParaguayBondsUpdates,
  getAllIssuers,
  getIssuersInPage,
  getBondsForIssuer,
} from '../../services/functions/Fparaguay'

const source = 'paraguay2'
const logTab = 1
const sourceConfig: sourceConfig = global.gfinalConfig[source]

const router = express.Router()
export default router

router.get('/', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    logUserIP(req)
    let csv_obj = await getParaguayBondsUpdates(source, sourceConfig, logTab)
    let full_file_path = await saveToCSV(csv_obj, source, logTab, source)
    res.download(full_file_path)
  } catch (err) {
    catchError(err, `/`, undefined, undefined, logTab, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getAllIssuers', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    logUserIP(req)
    let csv_obj = await getAllIssuers(source, sourceConfig, logTab)
    res.json(csv_obj)
  } catch (err) {
    catchError(err, `/getAllIssuers`, undefined, undefined, logTab, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getIssuersInPage', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    logUserIP(req)
    const pageId = req.body.pageId
    let csv_obj = await getIssuersInPage(source, pageId, logTab)
    res.send(csv_obj)
  } catch (err) {
    catchError(err, `/getIssuersListInPage`, undefined, undefined, logTab, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getBondsForIssuer', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    logUserIP(req)
    const issuer = req.body
    let csv_obj = await getBondsForIssuer(source, issuer, logTab)
    res.send(csv_obj)
  } catch (err) {
    catchError(err, `/getBondsForIssuer`, undefined, undefined, logTab, source)
    res.status(500).send(`Server Error`)
  }
})

// router.get('/getAllSecurities', async (req, res) => {
//   try {
//     req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
//     logUserIP(req)
//     let csv_obj = await getAllSecurities(source, sourceConfig, logTab)
//     res.json(csv_obj)
//   } catch (err) {
//     catchError(err, `/getAllSecurities`, undefined, undefined, logTab, source)
//     res.status(500).send(`Server Error`)
//   }
// })
