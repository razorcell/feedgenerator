const tools = require(`../tools`)
const Ffetch = require(`../Ffetch`)
const scraping = require(`../scraping`)
const file = require(`../file`)
const moment = require('moment')

//Simplify logging
const lg = tools.lg

module.exports = {
  getSGXMASSavingsInterestUpdates,
  getSGXMASSavingsInterestData,
}

async function getSGXMASSavingsInterestUpdates(source, log_tab) {
  try {
    lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
    let interest_data_json = await getSGXMASSavingsInterestData(source, log_tab + 2)
    lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
    return interest_data_json
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}

async function getSGXMASSavingsInterestData(source, log_tab) {
  try {
    lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
    let result = {
      found: false,
    }
    let i = 1
    while (!result.found && i < gfinalConfig[source].max_interest_page_down_trials) {
      let response = await Ffetch.down(
        {
          source: source,
          method: 'POST',
          url: `https://eservices.mas.gov.sg/statistics/fdanet/StepUpInterest.aspx`,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:86.0) Gecko/20100101 Firefox/86.0',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Upgrade-Insecure-Requests': '1',
            Pragma: 'no-cache',
            'Cache-Control': 'no-cache',
          },
          body: `__VIEWSTATE=zjQ9j%2Bz6raAXPriwgXdN7BU45tJFS%2F0be%2F5T0gmLwPCossRFw0D4tjAdrb6fsCIIP9gpozva0mAyV0jI%2FGVkmtSskCcrYa4maBvtBqGDRXod%2FW7o852Y7bWwVJF6gCNJqBR92f7kG8vtX4dzpbttOIi4%2BW0m39tqRQTnyNjkboi7iRiGM1l3RFlQMkyg8K6s%2B43JQR0wEztnRXsdl74XEIVzykdrXeMRvzA8B6hldEQ4HCu%2FeoAjqwEX1DbdAS4zWlzXn0%2FnPs4FAhj9pQG1xClCMRPo%2FOfTrMN35Iz1is6WOd6FSnq0g1xyiHUFODpLBvaH9MynGWO8pkXgWoB%2FKK9CRzbGIJUdDLNhxmCUORhnF1%2Fx2TWsTpvs1I2K0hotuXMkU3dltPGpzRKXbhXeveUGyy1CM3%2F%2BHX8JC51XOXSCAuXswyzuZzJO%2FS2pjKbeiLcbKeSl5pqwYQ0M9twteiKJvuk9VTJz0%2Fe%2BhCBUdoCuQEFeav50cj62H7RW4SKeZ9tBHNqVTV%2FhhXSu93FOokX%2B8OFOk8FtCYCNEjPUey5GFt3p1RliXhcstJyDaadCPehKwSvmYgRLUFBGg63X%2FNp9xOxzz3Gs1N1sPFLoFzZfdrlf9xtdKqcick2uqAg7zPhZBXaH5iXMMO%2BFL39uTE4Wtd67mIyvvcNn%2BDUXMrs0h4MdSFui0wIO2ThlbVZhyqmoNoUh%2Bt8uNEuzpnYK4Vc2wk%2B4ZO8ybTFMPOQqZTfhABqIXy6L9yeZTLN8GzB3qAiic%2FcrFbk3e%2FNsO7H%2Fu%2FpshhrzcRZJJwXVlEEmQF0Eqe9IklP8iSXgUNa%2BHixshll5LqMvR%2BfyuZjEc9gagFkjSjk1EgXYFW1vRtB4OaSxiygRgIN3%2BN8VvWMji5XzORN04AJOK3V8UNdXyPuZMW%2BKrab%2BH9fyoO0f1IdJKqWBhX2N9caJPC8Oe4zvHAHuHYUdKE74z8Kv8wZL4l8bnyO0NUfW1BgaKeoawi9p9ZyTVeWcBGdyZFsvyZrXoYMDjTcgwjylw6JIrBf1X9HFuelWZe%2FPxusp2L%2BdYgk4gWVMMEyVGUg%2FyOx3DL3Al2%2BcLg5Y41029wSP3S31VvdVrTIRo%2BVAbVZuvbirDGxT1YAh4eeUAStNUbvpLs%2FxXjytEyzA51955XcQPC7iSnLgyIheQgtgMwba6TBoxBcCgSn52j5BLIo43STew5I%2FtQ9%2BukQICOZeZHeNIu9gYmJFptVlm0%2FKS8WM27WOnyCT5mUk7PJSh%2FUgUpHH%2Bh53pyao%2F2Sn6KmmB22guybAKNjLDQ%3D%3D&__VIEWSTATEGENERATOR=011F93AE&__EVENTVALIDATION=HSe3CAlfcvevWFd964UwID5YXntg1O%2F9eefm4bbfQ25P24xvj4KCENbizgx4ACwQmjIGl6xsAqZ2vzV%2BXTiGo9FK%2F%2FLAjeUs17dE8bP1n%2FG6rtFlTt7FLpqkprLDag6fDDC3sWYnW5pAvW%2FbVC7jXPXFP%2BE3VsNb7ptoU8nGUdEJDyZVtr8ntHRfJxSQgu%2F5QFy%2F92gkRSnlLt%2BRGEMxiEya4NtGt8fWOuTQbzEwC7SXXsP2X%2FhZfdrv%2FJj4c430cGxbp%2FiiJTgNqQ7ALh%2F9w5sl6lnjqdnpLYvpFi9hlw%2BFvuyfHHSCxQuANmTS0NtXQ5mePesdgMW8o5nt0AHVR3Qllp1jINiMHQZts8Rg1kFLgRL2Bmc%2B7EV%2FUHvO0VxIEM0R4RhTn2eOc9HvzR5a5Gb8VKAJxvDccMefzoGEpo4cYzo1yPNF5yOPgMARuGr694zDn%2F5NvVqVA5IFSOWvkjVk85XhP%2BLnhIRUdtXF1DJAg94HYa8yIkgFtgqNN69MT3laZxC4tXv3ZBuGOD0IBu%2FeRUFrbIm6fBs%2BGZulss3Vy5qS6v4tOBCXNAbC2WZjrfS7Qy79Rm6%2FlmNlgiuvE26o4d2sAJ9Jqy6DsHexMriPbEkx%2F%2B2rTAzvXpzNiOb42DIfppwbBABWBfJPBX94DuEeQ7Ww6DiA4%2Fu5YBTKi2Ftot4IFxNKf9mToPd4I1IYp0CKiU4M4nAGUrgrWPYhUXaRVc5dpRexFLSONprGoAOYSB9GlV4B1hXThn7fXcTTB946CdvVgDhc%2FgxG5pBaEmPuuMUtuZpqtY1XK%2FXimXQ%3D&ctl00%24ContentPlaceHolder1%24StartYearDropDownList=2021&ctl00%24ContentPlaceHolder1%24StartMonthDropDownList=13&ctl00%24ContentPlaceHolder1%24IssueCodeTextBox=&ctl00%24ContentPlaceHolder1%24DisplayButton=Display`,
          savetofile: false,
          id: 'getSGXMASSavingsInterestData',
        },
        log_tab + 1
      )
      result = await scraping.getOneTag(
        `#ContentPlaceHolder1_ResultsContainerPanel`,
        response,
        'html',
        log_tab + 1,
        source
      )
      if (!result.found) {
        lg(
          `Interest Data block not found, Retry[${i}]..... MAX[${gfinalConfig[source].max_interest_page_down_trials}]`,
          log_tab + 1,
          'warn',
          source
        )
        await tools.pleaseWait(
          gfinalConfig[source].delay_min,
          gfinalConfig[source].delay_max,
          log_tab + 1,
          source
        )
      }
      i++
    }
    if (!result.found) {
      lg(`Could not get Interest Data, returning empty Array `, log_tab + 1, 'warn', source)
      return []
    }
    let docx = await file.SaveDocxFile(
      {
        title: 'getSGXMASSavingsInterestData',
        issuer: 'MAS',
        date: moment().format('YYYY-MM-DD'),
        url: `https://eservices.mas.gov.sg/statistics/fdanet/StepUpInterest.aspx`,
        body: result.content,
        rem_comment: false,
        rem_line_break: false,
        prefix: `SG_FI_CF`,
        filename_date: true,
        path: process.env.SGXMAS_EXPORTED_FILES_PATH,
      },
      log_tab + 1
    )
    let html = await file.SaveHTMLFile(
      {
        title: 'getSGXMASSavingsInterestData',
        issuer: 'MAS',
        date: moment().format('YYYY-MM-DD'),
        url: `https://eservices.mas.gov.sg/statistics/fdanet/StepUpInterest.aspx`,
        body: result.content,
        rem_comment: false,
        rem_line_break: false,
        prefix: `SG_FI_CF`,
        filename_date: true,
        path: process.env.SGXMAS_EXPORTED_FILES_PATH,
      },
      log_tab + 1
    )
    let today_data = [
      {
        date: moment().format('YYYY-MM-DD'),
        docx: docx.filename,
        docx_size: docx.size,
        html: html.filename,
        html_size: html.size,
      },
    ]
    lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
    return today_data
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}
