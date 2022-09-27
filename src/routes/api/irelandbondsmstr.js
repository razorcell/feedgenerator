const express = require('express')
const { clg } = require('../../services/tools')
const functions = require(`../../services/functions/Firelandbondsmstr.js`)
const tools = require(`../../services/tools`)

const router = express.Router()
module.exports = router

//Simplify logging
const lg = tools.lg

// @route GET /
// @desc Get Rosario updates
// @access Public
router.get('/', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let csv_obj = await functions.getIrelandBondsMSTRUpdates(req.query.datevalue, 1)
    let full_file_path = await tools.saveToCSV(csv_obj, 'irelandbondsmstr')
    res.download(full_file_path)
  } catch (err) {
    tools.catchError(err, 'maltaMASTR', undefined, undefined, 1)
    res.status(500).send(`Server Error`)
  }
})

router.get('/downloadIrelandBondsMSTRFileByDate', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let file_details = await functions.downloadIrelandBondsMSTRFileByDate(req.query.date, 2)
    res.send(file_details)
  } catch (err) {
    tools.catchError(err, 'downloadIrelandBondsMSTRFileByDate', true, 'error', 2)
    res.status(500).send(`Server Error`)
  }
})

router.get('/downloadIrelandBondsMSTRFileByCard', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let Bonds_card = [
      {
        card_title: 'Irish Government Bonds Outstanding Report',
        card_url: 'https://www.ntma.ie/government_bonds/Outstanding-Bonds-Report-2020-09-10.pdf',
      },
    ]
    let data = await functions.downloadIrelandBondsMSTRFileByCard(Bonds_card, 2)
    res.send(data)
  } catch (err) {
    tools.catchError(err, 'downloadIrelandBondsMSTRFileByCard', true, 'error', 2)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getIrelandBondsMSTRDownloadLink', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let data = await functions.getIrelandBondsMSTRDownloadLink(1)
    res.send(data)
  } catch (err) {
    tools.catchError(err, 'getIrelandBondsMSTRDownloadLink', true, 'error', 2)
    res.status(500).send(`Server Error`)
  }
})

// router.post("/getAnnouncementsFromPage", async (req, res) => {
//   try {
//     req.setTimeout(20 * 60 * 60 * 1000); //force timeout to 4 hours
//     tools.logUserIP(req);
//     let data = await functions.getAnnouncementsFromPage(
//       req.body.page_id,
//       req.body.announcement_type
//     );
//     res.send(data);
//   } catch (err) {
//     tools.catchError(err, "getAnnouncementsFromPage", true, "error", 2);
//     res.status(500).send(`Server Error`);
//   }
// });

// router.post("/getAllAnnouncements", async (req, res) => {
//   try {
//     req.setTimeout(20 * 60 * 60 * 1000); //force timeout to 4 hours
//     tools.logUserIP(req);
//     let data = await functions.getAllAnnouncements(
//       req.body.announcement_type,
//       2
//     );
//     res.send(data);
//   } catch (err) {
//     tools.catchError(err, "getAllAnnouncements", true, "error", 2);
//     res.status(500).send(`Server Error`);
//   }
// });
