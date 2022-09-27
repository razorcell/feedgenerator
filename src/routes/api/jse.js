const express = require('express')
const functions = require(`../../services/functions/Fjse.js`)
const tools = require(`../../services/tools`)

const router = express.Router()
module.exports = router

// @route GET /
// @desc Get Italy data in a CSV
// @access Public
router.get('/', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let csv_obj = await functions.getJseUpdates()
    let full_file_path = await tools.saveToCSV(csv_obj, 'jse')
    res.download(full_file_path)
  } catch (err) {
    res.status(500).send(`Server Error`)
  }
})

router.get('/downloadJSEFile2', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let csv_obj = await functions.downloadJSEFile2()
    // let full_file_path = await tools.saveToCSV(csv_obj, "jse");
    // res.download(full_file_path);
    res.send('OK')
  } catch (err) {
    res.status(500).send(`Server Error`)
  }
})
router.post('/getDataFromPDF', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let csv_obj = await functions.getDataFromPDF(req.body.full_file_path)
    let full_file_path = await tools.saveToCSV(csv_obj, 'jse')
    res.download(full_file_path)
  } catch (err) {
    res.status(500).send(`Server Error`)
  }
})

// router.get("/getItalyEtfs", async (req, res) => {
//     try {
//         req.setTimeout(20 * 60 * 60 * 1000); //force timeout to 4 hours
//         tools.logUserIP(req);
//         let csv_obj = await functions.getItalyEtfs();
//         res.send(csv_obj);
//     } catch (err) {
//         res.status(500).send(`Server Error`);
//     }
// });
// router.post("/getOneETFDetails", async (req, res) => {
//     try {
//         req.setTimeout(20 * 60 * 60 * 1000); //force timeout to 4 hours
//         tools.logUserIP(req);
//         let csv_obj = await functions.getOneETFDetails(
//             req.body.label,
//             req.body.url
//         );
//         // let full_file_path = await tools.saveToCSV(csv_obj, 'ItalyEtf');
//         // res.download(full_file_path);
//         res.send(csv_obj);
//     } catch (err) {
//         res.status(500).send(`Server Error`);
//     }
// });
