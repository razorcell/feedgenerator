const express = require('express')
const { clg } = require(`../../services/tools`)
const functions = require(`../../services/functions/Fcbonds.js`)
const tools = require(`../../services/tools`)

const router = express.Router()
module.exports = router

const source = 'cbonds'
const log_tab = 1
//Simplify logging
const lg = tools.lg

router.get('/', async function getCBondsUpdates(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let csv_obj = await functions.getCBondsUpdates(source, log_tab)
    let full_file_path = await tools.saveToCSV(csv_obj, 'CBonds')
    res.download(full_file_path)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, 1)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getCbondsNoticesFromPage', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let Notices_files = await functions.getCbondsNoticesFromPage(1, `cbonds`, 2)
    // clg(Notices_files);

    res.json(Notices_files)
  } catch (err) {
    tools.catchError(err, 'getNoticesFromPage', true, 'general', 2)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getAllCurrentCbondsNotices', async function getAllCurrentCbondsNotices(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let notices = await functions.getAllCurrentCbondsNotices(source, log_tab)
    // clg(Notices_files);

    res.json(notices)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, 1)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getOneDetailsLink', async function getOneDetailsLink(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)

    let notice = await functions.getOneDetailsLink(
      {
        type: 'New Issue',
        id: '1288811',
        title:
          'New bond issue: Natwest Markets plc issued international bonds (XS2177449464)  for USD 200.0m maturing in 2021',
        date: '20201001',
        time: '112739',
        url: 'https://cbonds.com/news/1288811/',
        text: 'Natwest Markets plc issued international bonds (XS2177449464) for USD 200.0m maturing in 2021. Bonds were sold at a price of 100%.',
      },
      `cbonds`,
      2
    )
    // clg(Notices_files);

    res.json(notice)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, 1)
    res.status(500).send(`Server Error`)
  }
})

router.get('/getOneDetailsFromHTMLTables', async function getOneDetailsFromHTMLTables(req, res) {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)

    let notice = await functions.getOneDetailsFromHTMLTables(
      {
        type: 'New Issue',
        id: '1288759',
        title:
          'New bond issue: D.R. Horton issued international bonds (US23331ABP30)  with a 1.4% coupon for USD 500.0m maturing in 2027',
        date: '20201001',
        time: '100959',
        url: 'https://cbonds.com/news/1288759/',
        text: 'Septe',
        details_url: 'https://cbonds.com/bonds/809671/',
        security_label: 'D.R. Horton, 1.4% 15oct2027, USD',
      },
      `cbonds`,
      2
    )
    // clg(Notices_files);

    res.json(notice)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, 1)
    res.status(500).send(`Server Error`)
  }
})
