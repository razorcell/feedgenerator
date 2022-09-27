import * as express from 'express'
import { logUserIP, catchError, saveToCSV } from '../../services/tools'
import { getItalyBonds, getItalyBondsInPage } from '../../services/functions/Fitaly'

const router = express.Router()
export default router

let source = 'italy'
let logTab = 1

router.get('/', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    logUserIP(req)
    let csv_obj = await getItalyBonds(source, logTab)
    let full_file_path = await saveToCSV(csv_obj, source, logTab, source)
    res.download(full_file_path)
  } catch (err) {
    catchError(err, '/', undefined, undefined, logTab, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getItalyBondsInPage', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    logUserIP(req)
    const pageId = req.body.pageId
    let csv_obj = await getItalyBondsInPage(source, pageId, logTab)
    res.send(csv_obj)
  } catch (err) {
    catchError(err, '/getItalyBondsInPage', undefined, undefined, logTab, source)
    res.status(500).send(`Server Error`)
  }
})
