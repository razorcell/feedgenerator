import { createLogger, format, transports, Logger } from 'winston'
import DailyRotateFile = require('winston-daily-rotate-file')

export default class LogService {
  private static _loggers: Map<string, Logger | undefined> = new Map()
  private static _instance: LogService

  private constructor() {}

  static getInstance() {
    if (this._instance) {
      return this._instance
    }

    this._instance = new LogService()
    return this._instance
  }

  getLogger(label: string): Logger | undefined {
    return LogService._loggers.get(label)
  }

  setLogger(label: string, path?: string): Logger {
    if (this.getLogger(label)) {
      return LogService._loggers.get(label) as Logger
    }
    if (!path) {
      path = __dirname + '/../logs'
    }
    console.log(`create logFile [${label}] at:`, path)
    const logger: Logger = this.createLog(label, path)
    LogService._loggers.set(label, logger)
    return logger
  }

  createLog(label: string, path: string): Logger {
    //Create the transport for general and download logs
    const general_log_dailyRotateFileTransport = new DailyRotateFile({
      //   filename: `${getPath('logs')}/%DATE%_${label}_logs.log`,

      filename: `${path}/%DATE%_${label}_logs.log`,
      datePattern: 'YYYY-MM-DD',
    })
    return createLogger({
      // change level if in dev environment versus production
      // level: env === "development" ? "silly" : "info",
      level: 'silly',
      format: format.combine(
        // format.colorize(),
        // format.prettyPrint(),
        // format.metadata(),
        // format.json(),
        format.timestamp({
          format: 'YYMMDD HH:mm',
        }),
        format.printf(info => {
          if (info.level === 'info') return `${info.timestamp} ${info.message}`
          if (info.level === 'warn')
            return `${info.timestamp} <span style="color:purple">${info.message}</span>`
          if (info.level === 'error')
            return `${info.timestamp} <span style="color:red">${info.message}</span>`
          if (info.level === 'verbose')
            return `${info.timestamp} <span style="color:blue">${info.message}</span>`
          else return `${info.timestamp} ${info.message}`
        })
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
  }
}
