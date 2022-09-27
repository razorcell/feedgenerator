const express = require('express')
const { clg } = require(`../../services/tools`)
const functions = require(`../../services/functions/Fsgxmassavinterest.js`)
const tools = require(`../../services/tools`)

const router = express.Router()
module.exports = router

//Simplify logging
const lg = tools.lg
let source = 'sgxmassavinterest'
let log_tab = 1

router.get('/', async function getSGXMASSavingsInterestUpdates(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let csv_obj = await functions.getSGXMASSavingsInterestUpdates(source, log_tab)
    let full_file_path = await tools.saveToCSV(csv_obj, source)
    res.download(full_file_path)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, 1, source)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getSGXMASSavingsInterestData', async function getSavingsBondsList(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    req.body['source'] = `sgxmas`
    let data = await functions.getSGXMASSavingsInterestData(source, log_tab)
    res.send(data)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, 1, source)
    res.status(500).send(`Server Error`)
  }
})

// router.post("/getAllNotices", async (req, res) => {
//   try {
//     req.setTimeout(20 * 60 * 60 * 1000); //force timeout to 4 hours
//     tools.logUserIP(req);
//     let notices = await functions.getAllNotices(
//       2
//     );
//     res.send(notices);
//   } catch (err) {
//     tools.catchError(err, "getAllNotices", true, "error", 2);
//     res.status(500).send(`Server Error`);
//   }
// });

// router.post("/getAllArticles", async (req, res) => {
//   try {
//     req.setTimeout(20 * 60 * 60 * 1000); //force timeout to 4 hours
//     tools.logUserIP(req);
//     let notices = await functions.getAllNotices(
//       2
//     );
//     let articles = await functions.getAllArticles(notices,
//       2
//     );
//     res.send(articles);
//   } catch (err) {
//     tools.catchError(err, "getAllArticles", true, "error", 2);
//     res.status(500).send(`Server Error`);
//   }
// });

// router.post("/getArticleBody", async (req, res) => {
//   try {
//     req.setTimeout(20 * 60 * 60 * 1000); //force timeout to 4 hours
//     tools.logUserIP(req);
//     let Notice = {
//       date: "10 September 2020",
//       issuer: "",
//       title: "Ireland sells €1.25 billion of bonds maturing in 2031 and 2050 by auction",
//       url: "https://www.ntma.ie/news/ireland-sells-1-25-billion-of-bonds-maturing-in-2031-and-2050-by-auction"
//     };
//     let data = await functions.getArticleBody(Notice, 2);
//     res.json(data);
//   } catch (err) {
//     tools.catchError(err, "getArticleBody", true, "error", 2);
//     res.status(500).send(`Server Error`);
//   }
// });
