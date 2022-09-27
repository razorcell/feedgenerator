import * as express from 'express'
// const tools = require(`../../services/tools`)
import { catchError, sendEmail } from '../../services/tools'

// const { writeToFile } = require(`../../services/file`)

// import {  } from '../../services/tools'
const Ffetch = require('../../services/Ffetch.js')
const Faxios = require('../../services/Faxios.js')

const source = 'test'
const logTab = 1
const router = express.Router()
export default router

// @route GET /
// @desc Get Test
// @access Public
router.get('/', Test)
router.get('/sendEmail', sendTestEmail)

async function sendTestEmail(req, res) {
  try {
    const status = await sendEmail(
      'general',
      {
        to: 'khalifa.rmili@gmail.com',
        subject: 'Test Send EMail',
      },
      1
    )
    res.json(status)
  } catch (err) {
    res.status(500).send(`Server Error`)
    catchError(err, '/test', undefined, undefined, logTab, source)
  }
}

async function Test(req, res) {
  try {
    const f = FirstFactorial(10)
    function FirstFactorial(num) {
      if (num === 0) {
        return 1
      }
      return num * FirstFactorial(num - 1)
    }
    res.send('OK')
  } catch (err) {
    res.status(500).send(`Server Error`)
    catchError(err, '/test', undefined, undefined, logTab, source)
  }
}

router.get('/proxies', async function Test(req, res) {
  try {
    // lg('PUBLIC PROXIES');
    // Ffetch.down({
    //   source: 'testproxies',
    //   url: `https://api.ipify.org`,
    //   use_public_proxy: 1,
    // })

    const status = await Promise.all([
      // lg('TOR');
      Ffetch.down({
        source: 'testproxies',
        url: `https://api.ipify.org`,
        use_tor: 1,
      })
        .then(data => ({
          TOR: data,
        }))
        .catch(() => ({
          TOR: 'ERROR',
        })),
      // lg('AWS proxy');
      Ffetch.down({
        source: 'testproxies',
        url: `https://api.ipify.org`,
        use_awsproxy: 1,
      })
        .then(data => ({
          AWS: data,
        }))
        .catch(() => ({
          AWS: 'ERROR',
        })),
      // lg('EDI Agadir proxy');
      Ffetch.down({
        source: 'testproxies',
        url: `https://api.ipify.org`,
        use_ediagadir_proxy: 1,
      })
        .then(data => ({
          Agadir: data,
        }))
        .catch(() => ({
          Agadir: 'ERROR',
        })),
    ])

    // Ffetch.down({
    //   source: 'testproxies',
    //   url: `https://api.ipify.org`,
    // })
    res.json(status)
  } catch (err) {
    catchError(err, '/proxies', true)
    res.status(500).send(`Server Error`)
  }
})
