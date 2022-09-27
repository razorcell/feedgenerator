const express = require('express')
const main = require(`../../services/main.js`)
const tools = require(`../../services/tools`)

const router = express.Router()
module.exports = router

// @route GET /
// @desc Get Paraguay data in a CSV
// @access Public
router.get('/', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let final_data = await main.getParaguayUpdates()
    //Build an Object for the CSV function
    let csv_obj = []
    final_data.forEach(bond => {
      bond.docs.forEach(doc => {
        csv_obj.push({
          localcode: bond.localcode,
          label: bond.label,
          link: `<a href="${bond.link}" target="_blank">Link</a>`,
          doc: doc,
        })
      })
    })
    let full_file_path = await tools.saveToCSV(csv_obj, 'Paraguay')
    // res.charset = "ISO-8859-1";
    res.download(full_file_path)
  } catch (err) {
    tools.lg(`Reply error : ${err.message}`)
    res.status(500).send('Server error')
  }
})

router.get('/getBondsList', async (req, res) => {
  try {
    req.setTimeout(20 * 60 * 60 * 1000) //force timeout to 4 hours
    tools.logUserIP(req)
    let final_data = await main.getBondsList()
    res.json(final_data)
  } catch (err) {
    // logger.general_log.error(`Reply error : ${err.message}`);
    tools.lg(`Reply error : ${err.message}`)
    res.status(500).send('Server error')
  }
})
