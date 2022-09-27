const tools = require(`../tools`)
const Ffetch = require(`../Ffetch`)
const scraping = require(`../scraping`)
const moment = require('moment')
const file = require(`../file`)
const Faxios = require(`../Faxios`)
const _ = require('lodash')

//Simplify logging
const lg = tools.lg

const { clg, makeid } = require(`../tools`)

module.exports = {
  getMSRBUpdates,

  getAllCategoriesNoticesByDate,
  getNoticesByCategoryAndDate,

  getAllNoticesPDFs,
  getOneNoticePDFs,

  generateGlobalFiles,
}

async function getMSRBUpdates(source, date, log_tab) {
  try {
    lg(`START - getMSRBUpdates`, log_tab, 'info', source)
    lg(`Date = ${date}`, log_tab + 1, 'info', source)
    let allData = []
    let allNotices = await getAllCategoriesNoticesByDate(source, date, log_tab + 1)
    allNotices = await getAllNoticesPDFs(source, allNotices, date, log_tab + 1)
    lg(`Extracted ${allNotices.length} Relevant Notices From MSRB`, log_tab + 1, 'info', source)
    let globalFiles = await generateGlobalFiles(source, allNotices, date, log_tab + 1)
    allData = await cleanUPs(source, allNotices, globalFiles, log_tab + 1)
    lg(`END - getMSRBUpdates`, log_tab, 'info', source)
    return allData
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}

async function getAllCategoriesNoticesByDate(source, date, log_tab) {
  try {
    lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
    let chunks = tools.arrayToChunks(
      gfinalConfig[source].categories,
      gfinalConfig[source].categoriesChunckSize,
      log_tab + 1,
      source
    )
    let all_data = []
    for (let i = 0; i < chunks.length; i++) {
      if (i >= gfinalConfig[source].categoriesChuncksLimit) {
        lg(
          `${tools.gFName(new Error())} : Chunk limit [ ${
            gfinalConfig[source].categoriesChuncksLimit
          } ] reached !`,
          log_tab + 1,
          'info',
          source
        )
        lg(`END - ${tools.gFName(new Error())}`, log_tab + 1, 'info', source)
        all_data = [].concat.apply([], all_data) //flattern array
        return all_data.filter(notice => notice != null)
      }
      lg(``, log_tab + 1, 'info', source)
      lg(
        `${tools.gFName(new Error())} : Process chunk = ${i} | remaining = ${chunks.length - (i + 1)}`,
        log_tab + 2,
        'info',
        source
      )
      all_data = all_data.concat(
        await Promise.all(
          chunks[i].map(async category => {
            return await getNoticesByCategoryAndDate(source, category, date, log_tab + 3)
          })
        )
      )
      await tools.pleaseWait(
        gfinalConfig[source].delay_min,
        gfinalConfig[source].delay_max,
        log_tab + 2,
        source
      )
    }
    all_data = [].concat.apply([], all_data) //flattern array
    lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
    return all_data.filter(notice => notice != null)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}

async function getNoticesByCategoryAndDate(source, category, date, log_tab) {
  try {
    if (!moment(date, 'YYYYMMDD', true).isValid()) {
      lg(`Invalid date supplied: ${date}`, log_tab + 2, 'warn')
      return []
    }
    let formattedDate = moment(date, 'YYYYMMDD').format('MM/DD/YYYY')
    let searchReqBody = _.cloneDeep(gfinalConfig[source].searchReqBody)
    searchReqBody.searchCriteriaForm.EventDisclosures = [category.id]
    searchReqBody.searchCriteriaForm.PostingDateBegin = formattedDate
    searchReqBody.searchCriteriaForm.PostingDateEnd = formattedDate

    let page = ''

    const Cookie = {
      Cookie: `__utma=247245968.695870761.1622554069.1623183178.1624454075.11; __utmz=247245968.1623000160.8.2.utmcsr=local.ediagadir|utmccn=(referral)|utmcmd=referral|utmcct=/; Disclaimer5=msrborg; acceptCookies=true; cdat-overlay=cdat-overlay-markup; _ga=GA1.2.695870761.1622554069; MostRecentRequestTimeInTicks=637600366011189801; ASP.NET_SessionId=mghp4bg3brw5i0lqyqosbdmu; __utmc=247245968; AWSALB=gW+gBXS/R6TqqGgLtYDIbkpEh06u+Kg1lDKcEB19Xk55taDBfkBtt0wm3MY95p4g1FIBTUfbbPkZGKWZAOln5CrDTbIsPi/dq67rgn8PmDXQYZDjg6KiihfA6zj/; AWSALBCORS=gW+gBXS/R6TqqGgLtYDIbkpEh06u+Kg1lDKcEB19Xk55taDBfkBtt0wm3MY95p4g1FIBTUfbbPkZGKWZAOln5CrDTbIsPi/dq67rgn8PmDXQYZDjg6KiihfA6zj/; __utmb=247245968.2.10.1624454075; __utmt=1`,
    }
    searchReqBody.searchCriteriaForm.SecurityType = 'ALL'
    let pass = false
    let response = {}
    let CDDocuments = []
    let data = {}
    while (!pass) {
      response = await Faxios.down(
        {
          source: source,
          id: `getNoticesByCategoryAndDate [${category.label}]`,
          method: 'post',
          url: `https://emma.msrb.org/Search/Search.aspx/GetSearchResult`,
          data: JSON.stringify(searchReqBody),
          headers: { ...gfinalConfig[source].getNoticesHeaders, ...Cookie },
          rotate_agent: true,
          responseType: 'json',
        },
        log_tab + 1
      )
      page = response.data
      let d = JSON.parse(page.d)
      data = JSON.parse(d.data)
      // clg(d.data.slice(0, 50))
      if (data === 'TooManyRecordsException' && searchReqBody.searchCriteriaForm.SecurityType === 'ALL') {
        lg(`${category.label}: TooManyRecords using ALL, trying MB only`, log_tab + 1, 'warn', source)
        searchReqBody.searchCriteriaForm.SecurityType = 'MB'
      } else if (
        data === 'TooManyRecordsException' &&
        searchReqBody.searchCriteriaForm.SecurityType === 'MB'
      ) {
        lg(`${category.label}: TooManyRecords using both MB & ALL, ignore`, log_tab + 1, 'warn', source)
        await tools.sendEmail(source, {
          from: 'ediagadir.systems@gmail.com',
          to: 'k.rmili@exchange-data.com,MSmith@fiinet.com',
          subject: `Category: ${category.label} | Could not download Notices using both MB & ALL SecTypes`,
        })
        pass = true
      } else {
        CDDocuments = data.CDDocuments
        pass = true
      }
    }
    let notices = CDDocuments.map(notice => {
      notice = { date: date, ...category, ...notice }
      notice.DSX = category.label
      notice.INM = notice.INM.replace(/[\t|\n|\r|;]+/g, ' ')
      notice.mainUrl = `https://emma.msrb.org/MarketActivity/ContinuingDisclosureDetails/${notice.SID}`
      return notice
    })
    lg(`Extracted ${notices.length} Notices Type [${category.label}]`, log_tab + 1, 'info', source)
    return notices
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}

async function getAllNoticesPDFs(source, allNotices, date, log_tab) {
  try {
    lg(`START - getAllNoticesPDFs`, log_tab, 'info', source)
    let chunks = tools.arrayToChunks(allNotices, gfinalConfig[source].chunck_size, log_tab + 1, source)
    let all_data = []
    for (let i = 0; i < chunks.length; i++) {
      if (i < gfinalConfig[source].chunksStart) continue
      if (i >= gfinalConfig[source].chunks_limit) {
        lg(
          `${tools.gFName(new Error())} : Chunk limit [ ${gfinalConfig[source].chunks_limit} ] reached !`,
          log_tab + 1,
          'info',
          source
        )
        lg(`END - getAllNoticesPDFs`, log_tab + 1, 'info', source)
        all_data = [].concat.apply([], all_data) //flattern array
        return all_data.filter(notice => notice != null)
      }
      lg(``, log_tab + 1, 'info', source)
      lg(
        `${tools.gFName(new Error())} : Process chunk = ${i} | remaining = ${chunks.length - (i + 1)}`,
        log_tab + 2,
        'info',
        source
      )
      all_data = all_data.concat(
        await Promise.all(
          chunks[i].map(async notice => {
            return await getOneNoticePDFs(source, notice, date, log_tab + 3)
          })
        )
      )
      await tools.pleaseWait(
        gfinalConfig[source].delay_min,
        gfinalConfig[source].delay_max,
        log_tab + 2,
        source
      )
    }
    all_data = [].concat.apply([], all_data) //flattern array
    lg(`END - getAllNoticesPDFs`, log_tab, 'info', source)
    return all_data.filter(notice => notice != null)
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}

async function getOneNoticePDFs(source, notice, date, log_tab) {
  try {
    let notices = [] //will include merged an unmerged PDFs
    let page = await Ffetch.down(
      {
        source,
        method: 'GET',
        url: notice.mainUrl,
        id: `getOneNoticePDFs | ${notice.SID}`,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          referrer: 'https://emma.msrb.org/Search/Search.aspx',
          Cookie:
            '__utma=247245968.695870761.1622554069.1628959228.1636296261.16; __utmz=247245968.1623000160.8.2.utmcsr=local.ediagadir|utmccn=(referral)|utmcmd=referral|utmcct=/; Disclaimer5=msrborg; acceptCookies=true; cdat-overlay=cdat-overlay-markup; _ga=GA1.2.695870761.1622554069; MostRecentRequestTimeInTicks=637718750628953872; __utmc=247245968; AWSALB=pety5hSGMcTU7Hu3RfVMDUqCQ5+jUxh/DRblza6ZAr+eVC1Oo4+OJEhQmHb2I+fhspJH3eA9Lbf24+V+KL2gv7epQCM21O0okleTsu2PxPj25Cbt1sreCA4a/OFc; AWSALBCORS=pety5hSGMcTU7Hu3RfVMDUqCQ5+jUxh/DRblza6ZAr+eVC1Oo4+OJEhQmHb2I+fhspJH3eA9Lbf24+V+KL2gv7epQCM21O0okleTsu2PxPj25Cbt1sreCA4a/OFc; __utmb=247245968.2.10.1636296261; __utmt=1; Disclaimer6=msrborg; ASP.NET_SessionId=lkkxf33bzddyubvmm4ahrb3b',
        },
        savetofile: true,
      },
      log_tab + 1
    )
    let aTag = await scraping.getOneTag('a.viewDocsQtipHelp', page, 'object', log_tab + 1, source)
    if (!aTag.found) {
      lg(`Could not find any A tags in Disclosure ID[${notice.SID}]`, log_tab + 1, 'warn', source)
      return []
    }
    //Look for help attribute
    let $ = aTag.$
    aTag = aTag.content
    let PDFs = []
    if (aTag.attr('help') === undefined) {
      lg(`Disclosure ${notice.SID} has 1 PDF`, log_tab + 1, 'info', source)
      PDFs.push({
        fileName: aTag.attr('href').replace('/', ''),
        fileUrl: `https://emma.msrb.org${aTag.attr('href')}`,
      })
    } else {
      lg(`Disclosure ${notice.SID} has multi PDFs`, log_tab + 1, 'info', source)
      let help = `<html>${aTag.attr('help')}</html>`
      let aaTags = await scraping.getMultiTags('a', help, 'object', log_tab + 1, source, 999)
      if (!aaTags.found) {
        lg(`Could not find any Multi (A) tags in Disclosure ID[${notice.SID}]`, log_tab + 1, 'warn', source)
        // return []
      } else {
        aaTags = aaTags.contents
        aaTags.map(aa => {
          PDFs.push({
            fileName: $(aa).attr('href').replace('/', ''),
            fileUrl: `https://emma.msrb.org${$(aa).attr('href')}`,
          })
        })
      }
    }
    //Download PDFs
    notice.PDFs = await Promise.all(
      PDFs.map(async pdf => {
        let { shortName, res } = await Ffetch.downloadBinaryFile(
          source,
          {
            url: pdf.fileUrl,
            prefix: `${date}-MSRB`,
            shortFileName: pdf.fileName.replace(`/`, ''),
            savePath: process.env.MSRB_EXPORTED_FILES_PATH,
          },
          log_tab + 2
        )
        pdf.localFileName = shortName
        pdf.size = parseInt(res.headers.get('Content-Length'))
        return pdf
      })
    )
    if (notice.PDFs.length > 1) {
      const mergedPdfFileName = `${date}-MERGED-${notice.SID}-${makeid(6)}`
      const output = await file.mergePDFs(
        {
          source: source,
          files: notice.PDFs,
          targetFileName: `${notice.SID}`,
          fileNameKey: 'localFileName',
          file_prefix: mergedPdfFileName,
          exportPath: process.env.MSRB_EXPORTED_FILES_PATH,
          filesPath: process.env.MSRB_EXPORTED_FILES_PATH,
          addDate: false,
          method: 'PDFLIB',
        },
        log_tab + 1,
        source
      )
      if (output.unmergedFiles.length > 0) {
        output.unmergedFiles.map(unmergedFile => {
          clg(unmergedFile)
          let tempNotice = _.cloneDeep(notice)
          tempNotice.sourceFile = unmergedFile.fileName
          tempNotice.corrupt = true
          tempNotice.unmerged = 'UNMERGED'
          notices.push(tempNotice)
        })
      } else {
        notice.sourceFile = output.mergedPdf
        notice.size = notice.PDFs.reduce((acc, tmp) => acc + tmp.size, 0)
        notice.corrupt = false
        notice.unmerged = 'MERGED'
        notices.push(notice)
      }
    } else {
      notice.sourceFile = notice.PDFs[0].localFileName
      notice.size = notice.PDFs[0].size
      notice.corrupt = false
      notice.unmerged = 'MERGED'
      notices.push(notice)
    }
    return notices
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}

async function generateGlobalFiles(source, allNotices, date, log_tab) {
  try {
    lg(`START - generateGlobalFiles`, log_tab, 'info', source)
    let globalFiles = await Promise.all(
      gfinalConfig[source].categories.map(async cat => {
        let thisCategoryNotices = allNotices.filter(notice => notice.id === cat.id && !notice.corrupt)
        if (thisCategoryNotices.length > 0) {
          lg(`Generating GlobalFile for [${cat.label}]`, log_tab + 1, 'info', source)
          // let thisGlobalFileName = await file.mergePDFs(
          let output = await file.mergePDFs(
            {
              files: thisCategoryNotices,
              targetFileName: `${cat.label}`,
              fileNameKey: 'sourceFile',
              file_prefix: `${date}-GLOBAL`,
              exportPath: process.env.MSRB_EXPORTED_FILES_PATH,
              filesPath: process.env.MSRB_EXPORTED_FILES_PATH,
              addDate: false,
              method: 'PDFLIB',
            },
            log_tab + 1,
            source
          )
          let thisGlobalFileSize = thisCategoryNotices.reduce((acc, tmp) => acc + tmp.size, 0)
          return {
            date: date,
            id: cat.id,
            label: cat.label,
            DSX: cat.label,
            SID: 'GLOBAL',
            INM: 'GLOBAL',
            FPX: moment(date, 'YYYYMMDD').format('MM/DD/YYYY'),
            mainUrl: '',
            sourceFile: output.mergedPdf,
            size: thisGlobalFileSize,
            unmerged: 'GLOBAL',
          }
        }
      })
    )
    lg(`END - generateGlobalFiles`, log_tab, 'info', source)
    return globalFiles.filter(file => file != null)
  } catch (err) {
    tools.catchError(err, 'generateGlobalFiles', undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}

async function cleanUPs(source, AllData, GlobalFiles, log_tab) {
  try {
    AllData = AllData.map(file => {
      delete file.PDFs
      file.mainUrl = `<a href="${file.mainUrl}" target="_blank">Source</a>`
      return file
    })
    AllData = [...AllData, ...GlobalFiles]
    return AllData
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}
