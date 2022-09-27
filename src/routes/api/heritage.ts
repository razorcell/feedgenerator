import * as express from 'express'
import { logUserIP, catchError, saveToCSV } from '../../services/tools'
import { getAllIssuers, downloadAllFeatures, downloadFeature } from '../../services/functions/Fheritage'
import { features } from '../../config/geojson'

const source = 'heritage'
const logTab = 1
const sourceConfig: sourceConfig = global.gfinalConfig[source]

const router = express.Router()
export default router

// router.get('/downloadPictures', async (req, res) => {
//   try {
//     req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
//     logUserIP(req)
//     let csv_obj = await downloadPictures(source, sourceConfig, logTab)
//     res.json(csv_obj)
//   } catch (err) {
//     catchError(err, `/downloadPictures`, undefined, undefined, logTab, source)
//     res.status(500).send(`Server Error`)
//   }
// })

router.get('/downloadAllFeatures', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    logUserIP(req)
    // const features = req.body
    const heritageFearures = await downloadAllFeatures(source, features, sourceConfig, logTab)
    const downloadedFeatures = heritageFearures.map(feature => feature.imageName)
    res.json(downloadedFeatures)
  } catch (err) {
    catchError(err, `/downloadAllFeatures`, undefined, undefined, logTab, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/downloadFeature', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    logUserIP(req)
    const feature = req.body
    let csv_obj = await downloadFeature(source, feature, logTab)
    res.send(csv_obj)
  } catch (err) {
    catchError(err, `/downloadFeature`, undefined, undefined, logTab, source)
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
