const express = require('express')
const { clg } = require('../../services/tools')
const functions = require(`../../services/functions/Fhkmstr.js`)
const tools = require(`../../services/tools`)

const router = express.Router()
module.exports = router

const lg = tools.lg

router.get('/', async function getHKMSTRCMU(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let csv_obj = await functions.getAllSecurities(`hkmstr`, 'CMU Instruments', 1)
    let full_file_path = await tools.saveToCSV(csv_obj, 'hkmstrcmu')
    res.download(full_file_path)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, 1)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getAllSecurities', async function getAllSecurities(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let data = await functions.getAllSecurities(`hkmstr`, 'CMU Instruments', 1)
    res.json(data)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, 1)
    res.status(500).send(`Server Error`)
  }
})

// router.get("/downloadHKMSTRFile", async (req, res) => {
//   try {
//     req.setTimeout(20 * 60 * 60 * 1000); //force timeout to 4 hours
//     tools.logUserIP(req);
//     let data = await functions.downloadHKMSTRFile(2);
//     res.send(data);
//   } catch (err) {
//     tools.catchError(err, "downloadMaltaMSTRFile", true, "error", 2);
//     res.status(500).send(`Server Error`);
//   }
// });
// router.get("/getFilesURls", async function getFilesURls(req, res) {
//   try {
//     req.setTimeout(20 * 60 * 60 * 1000); //force timeout to 4 hours
//     tools.logUserIP(req);
//     let data = await functions.getFilesURls(2);
//     res.send(data);
//   } catch (err) {
//     tools.catchError(err, tools.gFName(new Error()), undefined, undefined, 1);
//     res.status(500).send(`Server Error`);
//   }
// });
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
