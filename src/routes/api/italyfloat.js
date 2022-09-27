const express = require('express')
const functions = require(`../../services/functions/Fitalyfloat.js`)
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
    let csv_obj = await functions.getItalyFloatUpdates()
    let full_file_path = await tools.saveToCSV(csv_obj, 'ItalyFloat')
    res.download(full_file_path)
    // res.send(csv_obj);
  } catch (err) {
    res.status(500).send(`ItalyFloat - Server Error`)
  }
})

router.get('/getItalyShares', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let csv_obj = await functions.getItalyShares()
    // let full_file_path = await tools.saveToCSV(csv_obj, "ItalyFloat");
    // res.download(full_file_path);
    res.send(csv_obj)
  } catch (err) {
    res.status(500).send(`getItalyShares - Server Error`)
  }
})

router.post('/getItalySharesInPage', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let csv_obj = await functions.getItalySharesInPage(req.body.letter, req.body.page)
    // let full_file_path = await tools.saveToCSV(csv_obj, 'ItalyEtf');
    // res.download(full_file_path);
    res.send(csv_obj)
  } catch (err) {
    res.status(500).send(`getItalySharesInPage - Server Error`)
  }
})

router.post('/getItalySharesInLetter', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let csv_obj = await functions.getItalySharesInLetter(req.body.letter)
    // let full_file_path = await tools.saveToCSV(csv_obj, 'ItalyEtf');
    // res.download(full_file_path);
    res.send(csv_obj)
  } catch (err) {
    res.status(500).send(`getItalySharesInLetter - Server Error`)
  }
})
router.post('/getShareID', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let csv_obj = await functions.getShareID(req.body.isin)
    // let full_file_path = await tools.saveToCSV(csv_obj, 'ItalyEtf');
    // res.download(full_file_path);
    res.send(csv_obj)
  } catch (err) {
    res.status(500).send(`getShareID - Server Error`)
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
