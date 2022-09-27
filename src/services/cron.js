const schedule = require('node-schedule')
const tools = require(`./tools`)
const Ffetch = require(`./Ffetch`)
//Simplify logging
const lg = tools.lg

module.exports = {
  startScheduledTasks,
}

function startScheduledTasks() {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        lg(`Schedule Cron Jobs`)
        if (parseInt(process.env.CRON_UPDATE_PROXIES)) {
          var job_updateproxies = schedule.scheduleJob(
            process.env.CRON_UPDATE_PROXIES_TIME,
            async function () {
              //At 01:00:00
              try {
                let proxies = await Ffetch.updateProxies()
                lg(`Next job_updateproxies starts at : ${job_updateproxies.nextInvocation()}`, 2)
              } catch (err) {
                lg(`job_updateproxies: ${err.message}`, 2, 'error')
              }
            }
          )
          lg(`Next job_updateproxies starts at : ${job_updateproxies.nextInvocation()}`, 2)
        }
        resolve(true)
        return
      } catch (err) {
        lg(`startScheduledTasks: ${err.message}`, 2, 'error')
        reject()
      }
    })()
  })
}
