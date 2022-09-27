const { createLogger, format, transports } = require('winston')
require('winston-daily-rotate-file')
const fs = require('fs')
const process = require('process')
const env = process.env.NODE_ENV || 'development'
const tools = require('./tools')

const logDir = tools.getPath('logs')

// Create the log directory if it does not exist
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir)
}
//Create the transport for general and download logs
const general_log_dailyRotateFileTransport = new transports.DailyRotateFile({
  filename: `${logDir}/%DATE%_general_logs.log`,
  datePattern: 'YYYY-MM-DD',
})

const dowbload_log_dailyRotateFileTransport = new transports.DailyRotateFile({
  filename: `${logDir}/%DATE%_download_logs.log`,
  datePattern: 'YYYY-MM-DD',
})

let general_log = createLogger({
  // change level if in dev environment versus production
  level: env === 'development' ? 'verbose' : 'info',
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
  ),
  transports: [
    new transports.Console({
      level: 'info',
      format: format.combine(
        format.colorize(),
        format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
      ),
    }),
    general_log_dailyRotateFileTransport,
  ],
})

let download_log = createLogger({
  // change level if in dev environment versus production
  level: env === 'development' ? 'verbose' : 'info',
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
  ),
  transports: [
    new transports.Console({
      level: 'info',
      format: format.combine(
        format.colorize(),
        format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
      ),
    }),
    dowbload_log_dailyRotateFileTransport,
  ],
})

module.exports = {
  general_log,
  download_log,
}
