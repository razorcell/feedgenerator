const express = require('express')
const { clg } = require('../../services/tools')
const functions = require(`../../services/functions/Fstam.js`)
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
    let csv_obj = await functions.getStamUpdates(`Finnish`)
    let full_file_path = await tools.saveToCSV(csv_obj, 'StamFinnish')
    res.download(full_file_path)
  } catch (err) {
    tools.catchError(err, 'Stam-Finnish', undefined, undefined, 1)
    res.status(500).send(`Server Error`)
  }
})

router.post('/getStamSecuritiesForCountry', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let data = await functions.getStamSecuritiesForCountry(req.body.country, 2)
    res.json(data)
  } catch (err) {
    tools.catchError(err, 'getStamSecuritiesForCountry', true, 'general', 2)
    res.status(500).send(`Server Error`)
  }
})

// router.post("/getAllAnnouncements", async (req, res) => {
//   try {
//     req.setTimeout(20 * 60 * 60 * 1000); //force timeout to 4 hours
//     tools.logUserIP(req);
//     let data = await functions.getAllAnnouncements(req.body.datevalue, 2);
//     res.send(data);
//   } catch (err) {
//     tools.catchError(err, "getAllAnnouncements", true, "error", 2);
//     res.status(500).send(`Server Error`);
//   }
// });

router.post('/getAllArticles', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let announcements = await functions.getAllAnnouncements(req.body.datevalue, 2)
    let all_articles = await functions.getAllAnnouncements(announcements, 2)
    res.send(all_articles)
  } catch (err) {
    tools.catchError(err, 'getAllArticles', true, 'error', 2)
    res.status(500).send(`Server Error`)
  }
})

router.post('/getArticleBody', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let announcement = {
      date: '20200812',
      time: '10:45 pm',
      source: 'GNW',
      issuer: 'Mandalay Resources Corporation',
      title: 'Mandalay Resources Corporation Announces Financial Results for the Second Quarter of 2020',
      // url:
      // "https://www.investegate.co.uk/mandalay-resources-corporation/gnw/mandalay-resources-corporation-announces-financial-results-for-the-second-quarter-of-2020/20200812224502H6222/",
      url: 'https://www.investegate.co.uk/agresti-6-spv-s-r-l---irsh-/rns/agresti---notice-of-results-meeting-11-08-2020/202008130904400455W/',
    }

    let data = await functions.getArticleBody(announcement, 2)
    res.json(data)
  } catch (err) {
    tools.catchError(err, 'getArticleBody', true, 'error', 2)
    res.status(500).send(`Server Error`)
  }
})
