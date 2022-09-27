// const Main = require('./services/main.js');
// const logger = require("./logger.js");
const cheerio = require('cheerio')
const tor = require('./tor.js')
const file = require('./file.js')
const tools = require('./tools')
const { clg, typeOf } = require('./tools')

const CATEGORIES_NAMES = [
  'Valores de Titularización de Contenido Crediticio',
  'Pagarés Bursátiles',
  'Bonos Bancarios Bursátiles',
  'Pagarés de Mesa de Negociación',
  'Cuotas de Fondos de Inversión Cerrados',
  'Bonos de Largo Plazo',
  'Bonos Municipales',
]

const CATEGORIES = [
  'Valores+de+Titularizaci%C3%B3n+de+Contenido+Crediticio',
  'Pagar%C3%A9s+Burs%C3%A1tiles',
  'Bonos+Bancarios+Burs%C3%A1tiles',
  'Pagar%C3%A9s+de+Mesa+de+Negociaci%C3%B3n',
  'Cuotas+de+Fondos+de+Inversi%C3%B3n+Cerrados',
  'Bonos+de+Largo+Plazo',
  'Bonos+Municipales',
]

var denmark_headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:79.0) Gecko/20100101 Firefox/79.0',
  Accept: 'text/html, */*; q=0.01',
  'Accept-Language': 'fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3',
  'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
  Origin: 'http://www.nasdaqomxnordic.com',
  Connection: 'close',
  // Referer:
  //   "http://www.nasdaqomxnordic.com/obligationer/danmark?languageId=1&amp;Instrument=null",
  // Cookie: `__utma=77775883.1691848645.1572179050.1597166324.1597173094.10; JSESSIONID=F188173CD7B5BBD259BA58C2BDD4D18D; NSC_MC_Obtebrpnyopsejd_IUUQ=ffffffff09be0e1e45525d5f4f58455e445a4a423660; ASP.NET_SessionId=yzdvzw554jpph4ihif5jmd45; __utmc=77775883; ak_bmsc=5F59EF10B04632DA0842E84477E79B9E0210A78CFA5D000037C5325F686C9654~pl07rgMrB+1J+/CIe0a2wpYUucCyKlpHQ3vtzbeWwpCS0VGRc7Rw33+01YcaMiHrMTNq+eCbKo7oMpHgNrngxmXtVl9Bgzwae1Aua2WBw+zIXDiJJnodZS9Og0tcw2YGlkrcx7u2ieNlLrKC/Z65AhiScDtaB5lX+dP1FvFB5JEJMq1f+wm6fXr7hyJsEEtTyetYsh3HnlJ1pcHkBjQH270QQ4QpRFVXRjkqwWPh3QLzOqpjnm+H58cOzAgQkp5ZVo; __utmz=77775883.1597166324.9.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none); RT=z=1&dm=nasdaqomxnordic.com&si=h9f6gzwaw7f&ss=kdq7la8b&sl=0&tt=0; bm_mi=3FD7E79480F944FF081B913F7D47BB1C~TSRp+n6gFtGAwttAWvAKt4o5LR8yLmEK7qCm6OwAdA5LI6jmmcyLpqFC3ydOgdrCpFRf/mBWa1vhhyIukCjTHDzSVWjZwibL87lZJDIUJyqw2E8VyMFmlbCnh5xz03R5nr1s6Yr5ZMqt23Bda0I+HMh5oOGt1RAAu4ByZ262Z4CC+0huQow1n7SaQtCPvGtumIekP+80CgpYek5oKBdXUdUSx2LA5px3IOjq3JX9YsUgJZXpIOAha0UjHF5Iq6n8NvhsQrpuTI/W4V50E9PQ5g==; bm_sv=F93B7F5C5C67BFCD0D7224E42442FC8F~v2XLZFyVhRjxfM9v7fv5TtnV6HLHVQuswT37o5CXIhlr79phd83DONfdJYbmvctBjIIVc96fhJq3lmGaIfB8a32ZHlX0qINVGxf/ZY05zfHlouJQgO1Xp0+j1W1jDulIUWjQs+dc2qCPswitOTuOK+vOf7FkjMyVakNrk7aayyw=; __utmb=77775883.1.10.1597173094; __utmt=1`,
}

module.exports = {
  getParaguayUpdates,
  getItalyBonds,
  getBoliviaBonds,
  getDenmarkUpdates,
  getDenmarkOneBondDetails,
  getBondsList,
}

function getDenmarkBondsListInPage(source, page_id, log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        let size = gfinalConfig.denmark.get_bonds_list_size
        page_id = page_id * size
        let URI = `http://www.nasdaqomxnordic.com/webproxy/DataFeedProxy.aspx`
        var dataString = `xmlquery=%3Cpost%3E%0A%3Cparam+name%3D%22Exchange%22+value%3D%22NMF%22%2F%3E%0A%3Cparam+name%3D%22SubSystem%22+value%3D%22Prices%22%2F%3E%0A%3Cparam+name%3D%22Action%22+value%3D%22GetMarket%22%2F%3E%0A%3Cparam+name%3D%22inst__a%22+value%3D%220%2C1%2C2%2C5%2C21%2C23%22%2F%3E%0A%3Cparam+name%3D%22ext_xslt%22+value%3D%22%2FnordicV3%2Fpaging_inst_table.xsl%22%2F%3E%0A%3Cparam+name%3D%22Market%22+value%3D%22GITS%3ACO%3ACPHCB%22%2F%3E%0A%3Cparam+name%3D%22RecursiveMarketElement%22+value%3D%22True%22%2F%3E%0A%3Cparam+name%3D%22XPath%22+value%3D%22%2F%2Finst%5B%40itid%3D\'2\'+or+%40itid%3D\'3\'%5D%22%2F%3E%0A%3Cparam+name%3D%22ext_xslt_lang%22+value%3D%22en%22%2F%3E%0A%3Cparam+name%3D%22ext_xslt_tableId%22+value%3D%22bondsSearchDKTable%22%2F%3E%0A%3Cparam+name%3D%22ext_xslt_options%22+value%3D%22%2Cnoflag%2C%22%2F%3E%0A%3Cparam+name%3D%22ext_xslt_hiddenattrs%22+value%3D%22%2Cfnm%2Cisrid%2Cdlt%2Ctp%2Cbb%2Cib%2Ccpt%2Crps%2Cos%2Clt%2Cst%2Citid%2Clists%2Cit%2C%22%2F%3E%0A%3Cparam+name%3D%22ext_xslt_notlabel%22+value%3D%22%2Cfnm%22%2F%3E%0A%3Cparam+name%3D%22ext_xslt_jspcbk%22+value%3D%22doPaging%22%2F%3E%0A%3Cparam+name%3D%22ext_xslt_jsscbk%22+value%3D%22doSortPager%22%2F%3E%0A%3Cparam+name%3D%22ext_xslt_sorder%22+value%3D%22descending%22%2F%3E%0A%3Cparam+name%3D%22ext_xslt_sattr%22+value%3D%22chp%22%2F%3E%0A%3Cparam+name%3D%22ext_xslt_start%22+value%3D%22${page_id}%22%2F%3E%0A%3Cparam+name%3D%22ext_xslt_size%22+value%3D%22${size}%22%2F%3E%0A%3Cparam+name%3D%22inst__an%22+value%3D%22id%2Cnm%2Cfnm%2Cisin%2Ccpnrt%2Cbp%2Cap%2Clsp%2Cchp%2Catap%2Ced%2Cdlt%2Ccr%2Cisrid%2Ctp%2Cbb%2Cib%2Ccpt%2Crps%2Cos%2Clt%2Cst%2Citid%2Clists%2Cit%22%2F%3E%0A%3Cparam+name%3D%22app%22+value%3D%22%2Fobligationer%2Fdanmark%22%2F%3E%0A%3C%2Fpost%3E`
        var response = await tor.downloadUrlUsingTor(
          'Denmark',
          URI,
          denmark_headers,
          'POST',
          dataString,
          false
        )
        const $ = cheerio.load(response.body)
        let trs_ignore_first_two = $('table#bondsSearchDKTable > tbody > tr').get()
        let filter = new RegExp('[\\t\\n\\r\\f\\v]', 'gm')
        let isinRegex = new RegExp('([A-Z]{2})([A-Z0-9]{9,11})', 'gm')
        let isins_labels_objects = $(trs_ignore_first_two).map((i, tr) => {
          let isin = $(tr).find('td:nth-child(2)').text().replace(filter, '').match(isinRegex)[0]
          let label = $(tr).find('td:nth-child(1) a').attr('name').replace(filter, '')
          return {
            isin: isin,
            label: label,
          }
        })
        let isins_labels_array = isins_labels_objects.get()
        lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        resolve(isins_labels_array)
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getDenmarkUpdates() {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        let bonds_list = await getDenmarkBonds() // returns Array
        tools.lg(`Extracted  ${bonds_list.length} Bonds`)
        let chunks = tools.arrayToChunks(bonds_list, gfinalConfig.denmark.get_bonds_details_chunck_size)
        let master_data = new Array()
        for (let i = 0; i < chunks.length; i++) {
          let delay = tools.getRandomInt(3, 10)
          clg(`Process chunk = ${i} | remaining = ${chunks.length - i} |  Wait ${delay} seconds...`)
          await tools.sleep(delay * 1000)
          master_data = master_data.concat(await getDenmarkChunkBondDetails(chunks[i]))
        }
        resolve(master_data)
      } catch (err) {
        tools.catchError(err, 'getDenmarkUpdates')
        reject()
      }
    })()
  })
}

function getDenmarkBonds() {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        let all_data = new Array()
        let end_reached = false
        let page_id = 0
        while (!end_reached) {
          tools.lg(`Get Denmark bonds page : ${page_id}`)
          let this_page_data = await getDenmarkBondsListInPage(page_id)
          all_data = all_data.concat(this_page_data)
          tools.lg(`[${this_page_data.length}] Bonds in this page`)
          page_id++
          if (this_page_data.length < 1 || page_id >= gfinalConfig.denmark.page_limit) {
            end_reached = true
            tools.lg(`END REACHED`)
          }
        }
        resolve(all_data)
      } catch (err) {
        tools.catchError(err, 'getDenmarkBonds')
        reject()
      }
    })()
  })
}

function getDenmarkChunkBondDetails(chunk) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        let this_chunck_data = await Promise.all(
          chunk.map(async (bond, index) => {
            let one_bond_details = await getDenmarkOneBondDetails(bond.isin, bond.label)
            return {
              isin: bond.isin,
              name: bond.label,
              circulating_volume: one_bond_details.circulating_volume,
              drawing_percent: one_bond_details.drawing_percent,
              repayment_date: one_bond_details.repayment_date,
              link: `<a href="http://www.nasdaqomxnordic.com/bonds/denmark/microsite?Instrument=${bond.label}" target="_blank">Link</a>`,
            }
          })
        )
        resolve(this_chunck_data)
      } catch (err) {
        tools.catchError(err, 'getDenmarkChunkBondDetails')
        reject()
      }
    })()
  })
}

function getDenmarkOneBondDetails(isin, label) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        let link = `http://www.nasdaqomxnordic.com/webproxy/DataFeedProxy.aspx`
        var dataString = `xmlquery=%3Cpost%3E%0A%3Cparam+name%3D%22Exchange%22+value%3D%22NMF%22%2F%3E%0A%3Cparam+name%3D%22SubSystem%22+value%3D%22Prices%22%2F%3E%0A%3Cparam+name%3D%22Action%22+value%3D%22GetInstrument%22%2F%3E%0A%3Cparam+name%3D%22inst__a%22+value%3D%220%2C1%2C2%2C5%2C21%2C23%22%2F%3E%0A%3Cparam+name%3D%22Exception%22+value%3D%22false%22%2F%3E%0A%3Cparam+name%3D%22ext_xslt%22+value%3D%22%2FnordicV3%2Finst_table.xsl%22%2F%3E%0A%3Cparam+name%3D%22Instrument%22+value%3D%22${encodeURIComponent(
          label
        )}%22%2F%3E%0A%3Cparam+name%3D%22inst__an%22+value%3D%22oa%2Cdp%2Cdrd%22%2F%3E%0A%3Cparam+name%3D%22inst__e%22+value%3D%221%2C3%2C6%2C7%2C8%22%2F%3E%0A%3Cparam+name%3D%22trd__a%22+value%3D%227%2C8%22%2F%3E%0A%3Cparam+name%3D%22t__a%22+value%3D%221%2C2%2C10%2C7%2C8%2C18%2C31%22%2F%3E%0A%3Cparam+name%3D%22json%22+value%3D%221%22%2F%3E%0A%3Cparam+name%3D%22app%22+value%3D%22%2Fbonds%2Fdenmark%2Fmicrosite%22%2F%3E%0A%3C%2Fpost%3E`
        // tools.lg(`Label= ${label} | isin= ${isin}`);
        let response = await tor.downloadUrlUsingTor(
          'Denmark_one_bond',
          link,
          denmark_headers,
          'POST',
          dataString,
          false
        )
        // file.writeToFile(`downloads/${isin}.html`, response.body);
        let json = JSON.parse(response.body)
        resolve({
          circulating_volume: json['inst']['@oa'],
          drawing_percent: json['inst']['@dp'],
          repayment_date: json['inst']['@drd'],
        })
      } catch (err) {
        tools.catchError(err, 'getDenmarkOneBondDetails')
        reject()
      }
    })()
  })
}

//BOLIVIA

function getBoliviaBonds() {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        let all_data = new Array()
        await Promise.all(
          CATEGORIES.map(async (category, index) => {
            tools.lg(`Get Bolivia bonds for category : ${CATEGORIES_NAMES[index]}`)
            let this_page_data = await getBoliviaBondsInCategory(index, category)
            all_data = all_data.concat(this_page_data)
          })
        )
        resolve(all_data)
      } catch (err) {
        tools.lg(`Bolivia: getBoliviaBonds ${err.message}`)
        reject(`Bolivia: getBoliviaBonds`)
      }
    })()
  })
}

function getBoliviaBondsInCategory(index, category) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        let URI = `https://www.bbv.com.bo:11113/Prospectos?Prospecto.Tipo=${category}`
        var response = await tor.downloadUrlUsingTor('Bolivia', URI)
        // file.writeToFile("downloads/test.html", response.body);
        const $ = cheerio.load(response.body)
        let table_rows = $('table > tbody > tr').get()
        let bonds_list = $(table_rows).map((i, tr) => {
          let label = $(tr).find('td:nth-child(1)').text().trim()
          let date = $(tr).find('td:nth-child(2)').text().trim()
          let Caracteristicas = $(tr).find('td:nth-child(3) > a').attr('href')
          // .trim();
          let Prospecto = $(tr).find('td:nth-child(4) > a').attr('href')
          // .trim();
          //https://www.bbv.com.bo:11113/Content/Uploads/2019_CAR_VTD_PMJ.pdf
          return {
            category: CATEGORIES_NAMES[index],
            label: label,
            date: date,
            Caracteristicas: `<a href="https://www.bbv.com.bo:11113${Caracteristicas}">Caracteristicas</a>`,
            Prospecto: `<a href="https://www.bbv.com.bo:11113${Prospecto}">Prospecto</a>`,
          }
        })
        resolve(bonds_list.get())
      } catch (err) {
        tools.lg(`Error downloading Bonds List ${err.message}`)
        reject(`Error downloading Bonds List ${err.message}`)
      }
    })()
  })
}

//Italy

function getItalyBonds() {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        let all_data = new Array()
        let end_reached = false
        let page_id = 1
        while (!end_reached) {
          tools.lg(`Get Italy bonds page : ${page_id}`)
          let this_page_data = await getItalyBondsInPage(page_id)
          //Somehow the previous line returns an Object instead of array, so this line is necessary
          this_page_data = this_page_data.get()
          tools.lg(`[${this_page_data.length}] Bonds in this page`)
          if (this_page_data.length < 1) {
            end_reached = true
            tools.lg(`END REACHED`)
            // clg(all_data);
            tools.lg(`Total rows extracted=${all_data.length}`)
            // clg(all_data);
            resolve(all_data)
          } else {
            // clg("this_page_data=");
            // clg(this_page_data);
            all_data = all_data.concat(this_page_data)
            // tools.lg(`temp total=${all_data.length}`);
            page_id++
          }
        }
      } catch (err) {
        tools.lg(`Italy: getItalyBondsInPage ${err.message}`)
        reject(`Italy: getItalyBondsInPage`)
      }
    })()
  })
}

function getItalyBondsInPage(page_id) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        let size = 2000
        let URI = `https://www.borsaitaliana.it/borsa/obbligazioni/advanced-search.html?page=${page_id}&size=${size}&lang=it`
        var response = await tor.downloadUrlUsingTor('Italy', URI, undefined, undefined, undefined, false)
        // file.writeToFile("downloads/test.html", response.body);
        const $ = cheerio.load(response.body)
        let trs_ignore_first_two = $('table.m-table > tbody > tr').get().slice(2)
        let filter = new RegExp('[\\t\\n\\r\\f\\v]', 'gm')
        let isinRegex = new RegExp('([A-Z]{2})([A-Z0-9]{9,11})', 'gm')
        let isin_label_array = $(trs_ignore_first_two).map((i, tr) => {
          let isin = $(tr).find('td:nth-child(1) a span').text().replace(filter, '').match(isinRegex)[0]
          let label = $(tr).find('td:nth-child(2) span').text().replace(filter, '')
          return {
            isin: isin,
            label: label,
          }
        })
        resolve(isin_label_array)
      } catch (err) {
        tools.lg(`Error downloading Bonds List ${err.message}`)
        reject(`Error downloading Bonds List ${err.message}`)
      }
    })()
  })
}

//Paraguay
function getParaguayUpdates() {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        //---------------STEP 1 EXTRACTING BONDS LINKS ---------------
        tools.lg(`Extracting Bonds list`)
        let bonds_list = await getBondsList()
        // if (bonds_list.length < 10) {
        //   tools.lg(`bonds_list.length < 10`);
        //   reject(`bonds_list.length < 10`);
        // }
        //---------------STEP 2 EXTRACTING DOCS DATA ---------------
        tools.lg(`Extracting Docs lists`)
        let final_data = await getAllBondsData(bonds_list)
        //---------------STEP 3 END ---------------
        if (final_data.length > 30) {
          resolve(final_data)
        } else {
          tools.lg(`final_data.length < 30`)
          reject(final_data)
        }
      } catch (err) {
        reject(err.message)
      }
    })()
  })
}

function getBondsList() {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        let first_page = 'http://bvpasa.com.py/emisores.php'
        let base_url = 'http://bvpasa.com.py/'
        var response = await tor.downloadUrlUsingTor('Paraguay', first_page)
        // file.writeToFile("downloads/first_page.html", response.body);
        const $ = cheerio.load(response.body)
        let bonds_list = $('#tableEmisores > tbody tr')
          .map((i, tr) => {
            // let localcode = $(tr).find("td:nth-child(1)").text();
            let label = $(tr).find('td:nth-child(1)').text()
            let link = base_url + $(tr).find('td:nth-child(3) > a').attr('href')
            var regex = /(?:&cod=)(\S*)/gm
            let localcode = regex.exec(link)[1]
            return {
              localcode: localcode,
              label: label,
              link: link,
              docs: {},
            }
          })
          .get()
        resolve(bonds_list)
      } catch (err) {
        tools.lg(`Step 1: Downloading the firt list of bonds`)
        reject(`Step 1: Downloading the firt list of bonds`)
      }
    })()
  })
}

function getAllBondsData(bonds_list) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        let all_bonds_data = await Promise.all(
          bonds_list.map(async security => {
            try {
              // tools.lg('processing link : ' + security.link);
              let all_docs = await getListDocsForOneSecurity(security)
              return {
                localcode: security.localcode,
                label: security.label,
                link: security.link,
                docs: all_docs,
              }
            } catch (err) {
              tools.lg('Error : ' + err.message)
            }
          })
        )
        resolve(all_bonds_data)
      } catch (err) {
        tools.lg(`Step2: getting all docs: ${err.message}`)
        reject(`Step2: getting all docs: ${err.message}`)
      }
    })()
  })
}

function getListDocsForOneSecurity(security) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        let response = await tor.downloadUrlUsingTor('Paraguay', security.link)
        // file.writeToFile(`downloads/${security.localcode}.html`, response.body);
        const $ = cheerio.load(response.body)
        let docs = $('div.sec-info > table')
          .last()
          .find('tbody > tr > td:nth-child(2) a')
          .map(function (i, elem) {
            return $(elem).text()
          })
          .get()
        resolve(docs)
      } catch (err) {
        tools.lg(`Error downloading Docs for : ${security.localcode} at link: ${security.link}`)
        reject(`Error downloading Docs for : ${security.localcode} at link: ${security.link}`)
      }
    })()
  })
}

//2 - compile data in first page into array / object

//3 - foreach link in array

//3 - 1 got to link

//3 - 2 extract documents list

//3 - 3 push list to our array / object

//4 - foreach security in the list cross check updates in the database
//......
