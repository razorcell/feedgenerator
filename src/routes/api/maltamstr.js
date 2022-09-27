const express = require('express')
const { clg } = require('../../services/tools')
const functions = require(`../../services/functions/Fmaltamstr.js`)
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
    let full_file_path = await functions.downloadMaltaMSTRFile(2)
    res.download(full_file_path)
  } catch (err) {
    tools.catchError(err, 'maltaMASTR', undefined, undefined, 1)
    res.status(500).send(`Server Error`)
  }
})

router.get('/downloadMaltaMSTRFile', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let data = await functions.downloadMaltaMSTRFile(2)
    res.send(data)
  } catch (err) {
    tools.catchError(err, 'downloadMaltaMSTRFile', true, 'error', 2)
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
