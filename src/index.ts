/* global gprojectPath, gservicesPath */

import express from 'express'
var bodyParser = require('body-parser')

require('dotenv-safe').config({
  allowEmptyValues: true,
  example: __dirname + '/../.env',
})

import {
  initGlobalFinalConfig,
  catchError,
  createEurNxtEqDbConnection,
  createWCADbConnection,
  createNecessaryFolders,
} from './services/tools'

import { startScheduledTasks } from './services/cron'

import LogService from './services/LogService'
const logService = LogService.getInstance()

logService.setLogger('download')
let generalLogger = logService.setLogger('general')

initGlobalFinalConfig()

const app = express()

app.use(bodyParser.json({ limit: '5mb' }))
app.use(bodyParser.urlencoded({ limit: '5mb', extended: true, parameterLimit: 50000 }))

app.get('/', (req, res) => res.send('FeedScraper running OK'))

import ItalyRouter from './routes/api/italy'
import EuronextETFRouter from './routes/api/euronextetf'
import ParaguayRouter from './routes/api/paraguay'
import StatusRouter from './routes/api/status'
import HeritageRouter from './routes/api/heritage'
import SaudiMstrEqRouter from './routes/api/saudimstreq'
import MexicoETFRouter from './routes/api/mexicoetf'
import MexicoREITSRouter from './routes/api/mexicoreits'
import MexicoEQCARouter from './routes/api/mexicoeqca'

app.use('/api/bolivia', require('./routes/api/bolivia'))
app.use('/api/denmark', require('./routes/api/denmark'))
app.use('/api/eurnxteq', require('./routes/api/eurnxteq'))
app.use('/api/marketwatch', require('./routes/api/marketwatch'))
app.use('/api/mae2', require('./routes/api/mae'))
app.use('/api/italyetf', require('./routes/api/italyetf'))
app.use('/api/jse', require('./routes/api/jse'))
app.use('/api/italyconsob', require('./routes/api/italyconsob'))
app.use('/api/boursedirect', require('./routes/api/boursedirect'))
app.use('/api/germanff', require('./routes/api/germanff'))
app.use('/api/rosario', require('./routes/api/rosario'))
app.use('/api/belarus', require('./routes/api/belarus'))
app.use('/api/londonse', require('./routes/api/londonse'))
app.use('/api/irelandan', require('./routes/api/irelandan'))
app.use('/api/maltaan', require('./routes/api/maltaan'))
app.use('/api/maltanews', require('./routes/api/maltanews'))
app.use('/api/maltamstr', require('./routes/api/maltamstr'))
app.use('/api/investigate', require('./routes/api/investigate'))
app.use('/api/stamdanish', require('./routes/api/stamdanish'))
app.use('/api/stamfinnish', require('./routes/api/stamfinnish'))
app.use('/api/stamnorwegian', require('./routes/api/stamnorwegian'))
app.use('/api/stamswedish', require('./routes/api/stamswedish'))
app.use('/api/irelandbondsmstr', require('./routes/api/irelandbondsmstr'))
app.use('/api/irelandbondsnews', require('./routes/api/irelandbondsnews'))
app.use('/api/sgxmassgsouts', require('./routes/api/sgxmassgsouts'))
app.use('/api/sgxmassgsouts2', require('./routes/api/sgxmassgsouts2'))
app.use('/api/sgxmassavouts', require('./routes/api/sgxmassavouts'))
app.use('/api/sgxmassavinginterest', require('./routes/api/sgxmassavinterest'))
app.use('/api/sgxmassgsauctions', require('./routes/api/sgxmassgsauctions'))
app.use('/api/sgxmassgsauctionsn', require('./routes/api/sgxmassgsauctions_new'))
app.use('/api/sgxmastbillauctions', require('./routes/api/sgxmastbillauctions'))
app.use('/api/sgxmassavingauctions', require('./routes/api/sgxmassavingauctions'))
app.use('/api/sgxmasmasbillauctions', require('./routes/api/sgxmasmasbillauctions'))
app.use('/api/sgxmasfrnauctions', require('./routes/api/sgxmasfrnauctions'))
app.use('/api/cbonds', require('./routes/api/cbonds'))
app.use('/api/nasdaqsweden', require('./routes/api/nasdaqsweden'))
app.use('/api/taiwanmstr', require('./routes/api/taiwanmstr'))
app.use('/api/hkmstrcmu', require('./routes/api/hkmstrcmu'))
app.use('/api/hkmstrbills', require('./routes/api/hkmstrbills'))
app.use('/api/malasiaann', require('./routes/api/malasiaann'))
app.use('/api/malasiaannpdf', require('./routes/api/malasiaannpdf'))
app.use('/api/malaysiaauctglob', require('./routes/api/malasiaauctglob'))
app.use('/api/malasiaauct', require('./routes/api/malasiaauct'))
app.use('/api/malasiastock', require('./routes/api/malasiastock'))
app.use('/api/safricasens', require('./routes/api/safricasens'))
app.use('/api/kacd', require('./routes/api/kacd'))
app.use('/api/kase', require('./routes/api/kase'))
app.use('/api/germandlist', require('./routes/api/germandlist'))
app.use('/api/marketscreener', require('./routes/api/marketscreener'))
app.use('/api/mrktscreenarabic', require('./routes/api/marketscreener_ara'))
app.use('/api/saudidividends', require('./routes/api/saudidividends'))
app.use('/api/preferreddiv', require('./routes/api/preferreddiv'))
app.use('/api/finanzen', require('./routes/api/finanzen'))
app.use('/api/slovenia', require('./routes/api/slovenia'))
app.use('/api/poland', require('./routes/api/poland'))
app.use('/api/italyreits', require('./routes/api/italyreits'))
app.use('/api/actusnews', require('./routes/api/actusnews'))
app.use('/api/msrb', require('./routes/api/msrb'))
app.use('/api/msrb2', require('./routes/api/msrb'))
app.use('/api/businesswire', require('./routes/api/businesswire'))
app.use('/api/globalnewswire', require('./routes/api/globalnewswire'))
app.use('/api/lesechos', require('./routes/api/lesechos'))
app.use('/api/fisd', require('./routes/api/fisd'))
app.use('/api/paraguay2', ParaguayRouter)
app.use('/api/paraguay', require('./routes/api/paraguay_old'))
app.use('/api/italy', ItalyRouter)
app.use('/api/euronextetf', EuronextETFRouter)
app.use('/api/heritage', HeritageRouter)
app.use('/api/test', StatusRouter)
app.use('/api/saudimstreq', SaudiMstrEqRouter)

app.use('/api/mexicoso', require('./routes/api/mexicoso'))
app.use('/api/mexicoeqca', MexicoEQCARouter)

app.use('/api/mexicoetf', MexicoETFRouter)
app.use('/api/mexicoreits', MexicoREITSRouter)

try {
  // await functions.createDBConnection();
  createEurNxtEqDbConnection()
  createWCADbConnection()
  startScheduledTasks()
  // await tools.createAFEDDbConnection();
} catch (err) {
  catchError(err, 'DB connection')
}
//Folder structure
const necessaryFolders = [`${__dirname}/downloads`, `${__dirname}/logs`]
createNecessaryFolders(necessaryFolders)

const server = app.listen(parseInt(process.env.APP_LISTEN_PORT), process.env.APP_LISTEN_HOST, () => {
  generalLogger.info(
    `FeedScraper API listening on ${process.env.APP_LISTEN_HOST}:${process.env.APP_LISTEN_PORT}`
  )
})
server.timeout = 0

process.on('SIGINT', function () {
  console.log('\nGracefully shutting down from SIGINT (Ctrl+C)')
  process.exit()
})
