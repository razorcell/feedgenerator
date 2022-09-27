const fs = require('fs')

const tools = require(`./tools`)
// console.log(gservicesPath);
// console.info(`tools module content = `, tools);
const XLSX = require('xlsx')
const moment = require('moment')
const htmlDocx = require('html-docx-js-typescript')
const PDFMerger = require('pdf-merger-js')
// const flattener = require('pdf-flatten')
const { PDFDocument } = require('pdf-lib')
const util = require('util')
var path = require('path')

const streamPipeline = util.promisify(require('stream').pipeline)
const stream = require('stream')

const pdftk = require('node-pdftk')
const exec = util.promisify(require('child_process').exec)

const { clg, lg } = require(`./tools`)
//Required package
// var fs = require("fs");
// const logger = require('./logger.js');

module.exports = {
  objectToHTML,
  writeToFile,
  convertExcelToCSV,
  generateFileName,
  buildHTMLDoc,
  getFileSize,
  generateGlobalFiles,
  ArrayToExcel,
  getValidDateFormat,
  SaveDocxFile,
  SaveHTMLFile,
  mergePDFs,
  pdfDecrypt,
}

async function pdfDecrypt(source, pdfsourcepath, password, pdfdestinationpath, method = 'QPDF', log_tab) {
  try {
    var command = ''
    lg(`Decrypt ${path.basename(pdfsourcepath)} using ${method}`, log_tab + 1, 'info', source)
    if (method == 'QPDF') {
      if (pdfdestinationpath) {
        command = `qpdf --decrypt --password=${password} "${pdfsourcepath}" "${pdfdestinationpath}"`
      } else {
        command = `qpdf --replace-input --decrypt --password=${password} "${pdfsourcepath}"`
      }
      await exec(command)
      return true
    } else if (method == 'PDFTK') {
      //Not working after tests, keep it fr reference
      pdftk.configure({
        //   bin: process.env.PDFTK_BIN_PATH,
        //   Promise: require('bluebird'),
        // ignoreWarnings: false,
        //   tempDir: process.env.TEMP_DIR,
      })
      let output = await pdftk.input(pdfsourcepath).output(pdfdestinationpath)
      clg(output)
    } else if (method == 'PDFTK_CMD') {
      //This method is still not working for empty passwords, but would work if you have actual characters in pwd
      command = `pdftk ${pdfsourcepath} output ${pdfdestinationpath} owner_pw '${password}'`
      clg(command)
      await exec(command)
    }
    return
  } catch (err) {
    tools.catchError(err, 'pdfDecrypt', undefined, undefined, log_tab, source)
    lg(
      `Could not decrypt file: ${path.basename(pdfsourcepath)} using ${method}`,
      log_tab + 1,
      'error',
      source
    )
    return false
  }
}

function generateFileName(
  prefix,
  title,
  issuer,
  date,
  size,
  extension = 'html',
  log_tab,
  filename_date = true
) {
  return new Promise(function generateFileName(resolve, reject) {
    ;(async () => {
      try {
        let file_name = `${prefix}_${filename_date ? date : ''}_${issuer
          .replace(/[^a-z|A-Z|0-9]/gm, `-`)
          .substring(0, 10)
          .trim()
          .replace(/-+/gm, `-`)}_${title
          .replace(/[^a-z|A-Z|0-9]/gm, `-`)
          .trim()
          .replace(/-+/gm, `-`)
          .substring(0, 10)}_${size.replace(/\s/gm, `-`).replace(`.`, `-`)}.${extension}`
        resolve(file_name)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, params.source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}
async function mergePDFs(params, log_tab = 1, source = 'general') {
  try {
    params = Object.assign(
      {},
      {
        files: [],
        targetFileName: 'ALL_PDF',
        fileNameKey: undefined,
        file_prefix: 'GLOBAL',
        exportPath: __dirname + '/../downloads/',
        filesPath: __dirname + '/../downloads/',
        desired_date: moment().format('YYYYMMDD'),
        addDate: true,
        method: 'PDFMerger',
      },
      params
    )
    lg(`START - mergePDFs`, log_tab, 'info', source)
    lg(`Merging ${params.files.length} PDF files`, log_tab + 1, 'info', source)
    let unmergedFiles = []
    let targetFileShort = `${params.file_prefix}_${params.addDate ? params.desired_date : ''}_${
      params.targetFileName
    }.pdf`
    let targetFileLong = `${params.exportPath}${targetFileShort}`

    if (params.method === 'PDFMerger') {
      var merger = new PDFMerger()
      params.files.forEach((file, index) => {
        if (params.fileNameKey === undefined) {
          //Simple array of files
          lg(`Adding file[${index}]: ${file}`, log_tab + 1, 'info', source)
          merger.add(`${params.filesPath}${file}`)
        } else {
          //array of object keys
          lg(`Adding file[${index}]: ${file[params.fileNameKey]}`, log_tab + 1, 'info', source)
          merger.add(`${params.filesPath}${file[params.fileNameKey]}`)
        }
      })
      await merger.save(targetFileLong) //save under given name and reset the internal document
    } else if (params.method === 'PDFLIB') {
      const mergedPdf = await PDFDocument.create()
      for await (const [index, file] of params.files.entries()) {
        let pdfBytes
        let thisFile
        if (params.fileNameKey === undefined) {
          //Simple array of files
          thisFile = `${params.filesPath}${file}`
        } else {
          //array of object keys
          thisFile = `${params.filesPath}${file[params.fileNameKey]}`
        }
        lg(`Adding file[${index}]: ${path.basename(thisFile)}`, log_tab + 1, 'info', source)
        let pdf = null
        //Check & Decrypt
        // if (isPDfEncrypted(source, thisFile, log_tab + 1)) {
        // lg(`Decryting file[${path.basename(thisFile)}]`, log_tab + 1, 'info', source)
        const isDecrypted = await pdfDecrypt(source, thisFile, '', false, 'QPDF', log_tab + 1)
        if (!isDecrypted) {
          lg(`Skipping file: ${path.basename(thisFile)}`, log_tab + 1, 'warn', source)
          unmergedFiles.push(file)
        } else {
          try {
            pdfBytes = fs.readFileSync(thisFile)
            pdf = await PDFDocument.load(pdfBytes)
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())
            copiedPages.forEach(page => {
              mergedPdf.addPage(page)
            })
          } catch (err) {
            tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
            lg(`Skipping file, supposed to be OK: ${path.basename(thisFile)}`, log_tab + 1, 'warn', source)
            unmergedFiles.push(file)
          }
        }
      }
      const mergedPdfFileBuffer = await mergedPdf.save()
      await saveFile(source, {
        source: { data: mergedPdfFileBuffer, type: 'Buffer' },
        targetFileShort: targetFileShort,
        exportPath: params.exportPath,
      })
    }
    lg(`Resulting file :  ${path.basename(targetFileLong)}`, log_tab + 1, 'info', source)
    lg(`END - mergePDFs`, log_tab, 'info', source)
    return {
      mergedPdf: targetFileShort,
      unmergedFiles,
    }
  } catch (err) {
    lg(err, log_tab, 'error', source)
    // clg(err)
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    return new Error(err)
  }
}

async function saveFile(source, params, log_tab) {
  try {
    params = {
      source: {
        data: null,
        type: 'Stream',
      },
      targetFileShort: 'TargetFile',
      exportPath: global.gDownloadsPath,
      ...params,
    }
    var SourceStream = new stream.PassThrough()
    if (params.source.type === 'Buffer') {
      SourceStream.end(params.source.data) // Write your buffer to Stream
    } else if (params.source.type === 'Stream') {
      SourceStream = params.source.data
    }
    let targetFileLong = `${params.exportPath}${params.targetFileShort}`
    const destinationStream = fs.createWriteStream(targetFileLong)
    await streamPipeline(SourceStream, destinationStream)
    return params.targetFileShort
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}

function generateGlobalFiles(params, log_tab = 1, source = 'general') {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        params = Object.assign(
          {},
          {
            html: 'html',
            file_column: 'filename', //where to put the files
            file_columns: undefined,
          },
          params
        )
        let HTML = ''
        // let file_name_prefix = params.prefix;
        if (params.articles.length == 0) {
          HTML += `<p style="text-align: center; font-size:17px"><b>${params.file_prefix}</b></p>`
          HTML += `<p style="text-align: center">There is no announcements for ${params.desired_date}</p>`
        } else {
          params.articles.forEach(article => {
            HTML +=
              article[params.html] +
              `<p style="text-align: center">-----------///////////////////////////////////////////////////////////////----------</p>
               <p style="text-align: center">-----------//////////////////////         END         ////////////////////----------</p>
               <p style="text-align: center">-----------///////////////////////////////////////////////////////////////----------</p>`
          })
        }
        let WORD = await htmlDocx.asBlob(HTML)
        let size = tools.formatBytes(Buffer.byteLength(HTML, 'utf8'))

        let filename_word = `${params.file_prefix}_${params.desired_date}_${size
          .replace(/\s/gm, `-`)
          .replace(`.`, `-`)
          .replace(/-+/gm, '-')}.docx`
        let filename_html = `${params.file_prefix}_${params.desired_date}_${size
          .replace(/\s/gm, `-`)
          .replace(`.`, `-`)
          .replace(/-+/gm, '-')}.html`
        await writeToFile(`${params.export_path}${filename_word}`, WORD, log_tab + 1)
        await writeToFile(`${params.export_path}${filename_html}`, HTML, log_tab + 1)
        let docx = {}
        Object.keys(params.skeleton).forEach(function (key) {
          docx[key] = `ALL_WORD`
          if (params.file_columns !== undefined && params.file_columns.includes(key))
            docx[key] = filename_word
          if (key === 'date') docx[key] = params.desired_date
          if (key === 'filename') docx[key] = filename_word
          if (key === 'size') docx[key] = size
        })
        let html = {}
        Object.keys(params.skeleton).forEach(function (key) {
          html[key] = `ALL_HTML`
          if (params.file_columns !== undefined && params.file_columns.includes(key))
            html[key] = filename_html
          if (key === 'date') html[key] = params.desired_date
          if (key === 'filename') html[key] = filename_html
          if (key === 'size') html[key] = size
        })
        resolve({
          docx,
          html,
        })
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getFileSize(data, log_tab, source = 'general') {
  return new Promise(function getFileSize(resolve, reject) {
    ;(async () => {
      try {
        let size = tools.formatBytes(Buffer.byteLength(data, 'utf8'))
        resolve(size)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function buildHTMLDoc(
  title = 'N/A',
  issuer = 'N/A',
  date = moment().format('YYYYMMDD'),
  time = moment().format('HHmmss'),
  url = 'N/A',
  body = 'N/A',
  log_tab,
  rem_comment = true,
  rem_line_break = true,
  source = 'general'
) {
  return new Promise(function buildHTMLDoc(resolve, reject) {
    ;(async () => {
      try {
        //Build HTML
        let header = `
        <h3>${title}</h3>
        <h4>${issuer}</h4>
        <p>Released: ${date} ${time}</p>
        `
        let footer = `<br><p>Source: <a href="${url}" target="_blank">${url}</a></p>`
        // let HTML = header + body.replace(/(\\n|\\t)/g, "") + footer;
        if (rem_comment) body = body.replace(/\/\*.*\*\//gs, '')
        if (rem_line_break) body = body.replace(/\r?\n|\r/g, '')
        let HTML =
          header +
          body
            .replace(/<!--.*?-->/gs, '')
            .replace(/<img[^>]*>/g, '')
            .replace(/<meta[^>]*>/g, '')
            .replace(/<style[^>]*>/g, '')
            .replace(/¦/g, ' ')
            .replace(/(undefined|false)/, '') +
          footer

        //Calculate Size
        resolve(HTML)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function SaveHTMLFile(details, log_tab = 1, source = 'general') {
  return new Promise(function SaveHTMLFile(resolve, reject) {
    ;(async () => {
      try {
        let HTML = await buildHTMLDoc(
          details.title,
          details.issuer,
          details.date,
          details.time,
          details.url,
          details.body,
          log_tab + 2,
          details['rem_comment'],
          details['rem_line_break']
        )
        let size = await getFileSize(HTML)
        let filename = await generateFileName(
          details.prefix,
          details.title,
          details.issuer,
          details.date,
          size,
          'html',
          log_tab + 3,
          details['filename_date'] ? details.filename_date : false
        )
        await writeToFile(`${details.path}${filename}`, HTML)
        resolve({
          filename: filename,
          size: size,
        })
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function SaveDocxFile(details, log_tab = 1, source = 'general') {
  return new Promise(function SaveDocxFile(resolve, reject) {
    ;(async () => {
      try {
        let HTML = await buildHTMLDoc(
          details.title,
          details.issuer,
          details.date,
          details.time,
          details.url,
          details.body,
          log_tab + 2,
          details['rem_comment'],
          details['rem_line_break']
        )
        let size = await getFileSize(HTML)
        let filename = await generateFileName(
          details.prefix,
          details.title,
          details.issuer,
          details.date,
          size,
          'docx',
          log_tab + 3,
          details['filename_date'] ? details.filename_date : false
        )
        let WORD = await htmlDocx.asBlob(HTML)
        await writeToFile(`${details.path}${filename}`, WORD)
        resolve({
          filename: filename,
          size: size,
        })
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function objectToHTML(data, type = 'one', log_tab = 1, source = 'general') {
  return new Promise(function objectToHTML(resolve, reject) {
    ;(async () => {
      try {
        let html = ''
        if (type === 'lines') {
          Object.keys(data).forEach(key => {
            html += `<strong><u>${key}</u></strong> : <span><i>${data[key]}</i></span><br><br>`
          })
        } else if (type === 'json') {
          html = JSON.stringify(data, null, '<br>')
        } else {
          if (type === 'one') {
            Object.keys(data).forEach(key => {
              html += `<tr><th>${key}</th><td>${
                data[key] ? data[key].replace('*', '.') : data[key]
              }</td></tr>`
            })
          }
          html += '</tbody></table>'
        }
        resolve(html)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function writeToFile(fullFilePath, data, log_tab = 1, source = 'general') {
  return new Promise(function writeToFile(resolve, reject) {
    if (fullFilePath.match(/^downloads\//gm)) {
      //download folder relative path was provided
      fullFilePath = `${__dirname}/../${fullFilePath}`
    }
    fs.writeFile(fullFilePath, data, function (err) {
      if (err) {
        tools.catchError(err, 'writeToFile', true, 'general', log_tab + 1)
        reject(`Error writting to file : ${err.message}`)
      }
      resolve(fullFilePath)
    })
    // lg(`File : ${file_path_name} save SUCCESS`, log_tab + 1, "info", source);
    return
  })
}

function convertExcelToCSV(
  excel_file_full_path,
  filename,
  log_tab,
  sheetName = false,
  csv_delimiter = `;`,
  export_location = `downloads/`,
  source = 'general'
) {
  return new Promise(function convertExcelToCSV(resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        var workbook = XLSX.readFile(excel_file_full_path)
        var sheetNames = workbook.SheetNames
        let CSV_output = ''
        if (sheetName) {
          CSV_output = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName], {
            FS: csv_delimiter,
          })
        } else {
          sheetNames.forEach(function (sheetname) {
            CSV_output += XLSX.utils.sheet_to_csv(workbook.Sheets[sheetname], {
              FS: csv_delimiter,
            })
          })
        }
        let final_file_name = `${export_location}${filename}.csv`
        await writeToFile(final_file_name, CSV_output)
        lg(`convertExcelToCSV - ${final_file_name}`, log_tab + 1)
        lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        resolve(final_file_name)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function ArrayToExcel(
  array,
  filename = 'exported_file',
  sheetName = 'sheet1',
  log_tab,
  save_to = `downloads/`
) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ArrayToExcel`, log_tab + 1)
        let wb = XLSX.utils.book_new()
        let ws = XLSX.utils.json_to_sheet(array)
        XLSX.utils.book_append_sheet(wb, ws, sheetName)
        let thesheet = wb.Sheets[sheetName]
        // console.log(thesheet);
        for (let r = 2; r <= array.length + 1; r++) {
          thesheet[`E${r}`].t = 'd'
          thesheet[`F${r}`].t = 'd'
        }
        // console.log(thesheet);

        XLSX.writeFile(wb, `${save_to}${filename}.xlsx`)
        lg(`END - ArrayToExcel - ${filename}`, log_tab + 1)
        resolve()
        return
      } catch (err) {
        tools.catchError(err, 'ArrayToExcel', undefined, undefined, 3)
        reject(`ArrayToExcel : ${err.message}`)
      }
    })()
  })
}

function getValidDateFormat(array, col, log_tab, source = 'general') {
  return new Promise(function getValidDateFormat(resolve, reject) {
    ;(async () => {
      try {
        lg(`getValidDateFormat column[${col}]`, log_tab + 1, 'info', source)
        let formats = [
          {
            string: `D/MM/YYYY`,
            score: 0,
          },
          {
            string: `D/M/YYYY`,
            score: 0,
          },
          {
            string: `DD/MM/YYYY`,
            score: 0,
          },
          {
            string: `DD/M/YYYY`,
            score: 0,
          },
          {
            string: `M/DD/YYYY`,
            score: 0,
          },
          {
            string: `M/D/YYYY`,
            score: 0,
          },
          {
            string: `MM/DD/YYYY`,
            score: 0,
          },
          {
            string: `MM/D/YYYY`,
            score: 0,
          },
        ]
        array.some((row, i) => {
          formats.forEach((format, indx) => {
            if (moment(row[col], format.string, true).isValid()) {
              formats[indx].score++
            } else {
              // lg(`Invalid date format ${format.string} : ${row[col]}`)
            }
          })
        })
        formats = formats.sort((a, b) => b.score - a.score)
        lg(`Formats Analysis = ${JSON.stringify(formats)}`, log_tab + 2, 'info', source)
        resolve(formats[0].string)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

// let params = {
//   articles: {},
//   skeleton: {
//     date: "",
//     time: ``,
//     issuer: ``,
//     title: ``,
//     url: ``,
//     filename: ``,
//     size: ``,
//   },
//   title: "",
//   desired_date: "",
//   file_prefix: "",
//   export_path: "",
// };

// function htmlToPDF(params, html, log_tab) {
//   return new Promise(function htmlToPDF(resolve, reject) {
//     (async () => {
//       try {
//         lg(`START - ${tools.gFName(new Error())}`, log_tab, "info", params.source);
//         params = Object.assign(
//           {},
//           {
//             source: "general",
//             html: html,
//             targetFileName: "HTML_TO_PDF",
//             file_prefix: "htmlToPDF",
//             exportPath: global.gDownloadsPath,
//             desired_date: moment().format("YYYYMMDD"),
//           },
//           params
//         );
//         var options = {
//           format: "A3",
//           orientation: "portrait",
//           border: "10mm",
//           header: {
//             height: "45mm",
//             contents: '<div style="text-align: center;">Author: Khalifa rmili</div>',
//           },
//           footer: {
//             height: "28mm",
//             contents: {
//               first: "Cover page",
//               2: "Second page", // Any page number is working. 1-based index
//               default: '<span style="color: #444;">{{page}}</span>/<span>{{pages}}</span>', // fallback value
//               last: "Last Page",
//             },
//           },
//         };
//         var document = {
//           html: html,
//           data: {},
//           path: `${params.exportPath}${params.targetFileName}.pdf`,
//           type: "",
//         };
//         await pdf.create(document, options);
//         lg(`END - ${tools.gFName(new Error())}`, log_tab, "info", params.source);
//         resolve(params.targetFileName);
//         return;
//       } catch (err) {
//         tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, params.source);
//         reject(`${tools.gFName(new Error())} : ${err.message}`);
//       }
//     })();
//   });
// }
