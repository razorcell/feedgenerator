const express = require('express')
const functions = require(`../../services/functions/Fsgxmas.js`)
const { gFName, logUserIP, catchError, saveToCSV } = require(`../../services/tools`)

const router = express.Router()
module.exports = router

let source = 'sgxmassavingauctions'
let log_tab = 1

router.get('/', async function getSGXMASSavingsAuctionsUpdates(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    logUserIP(req)
    let csv_obj = await functions.getSGXMASSavingsAuctionsUpdates(source, log_tab)
    let full_file_path = await saveToCSV(csv_obj, source, log_tab, source)
    res.download(full_file_path)
  } catch (err) {
    catchError(err, gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
})

router.get('/getSavingsAuctionsList', async function getSavingsAuctionsList(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    logUserIP(req)
    let Notices_files = await functions.getSavingsAuctionsList(source, 2)
    res.json(Notices_files)
  } catch (err) {
    catchError(err, gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
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
