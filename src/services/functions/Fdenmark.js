const tools = require(`../tools`)
const Ffetch = require(`../Ffetch`)
const tor = require(`../tor`)
const cheerio = require('cheerio')
//Simplify logging
const lg = tools.lg

const { clg } = require(`../tools`)

module.exports = {
  getDenmarkUpdates,
}

function getDenmarkUpdates(source, log_tab) {
  return new Promise(function getDenmarkUpdates(resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        let bonds_list = await getDenmarkBonds(source, log_tab + 1) // returns Array
        lg(`Extracted  ${bonds_list.length} Bonds`)
        let chunks = tools.arrayToChunks(bonds_list, gfinalConfig.denmark.get_bonds_details_chunck_size)
        let master_data = new Array()
        for (let i = 0; i < chunks.length; i++) {
          let delay = tools.getRandomInt(3, 10)
          lg(
            `Process chunk = ${i} | remaining = ${chunks.length - i} |  Wait ${delay} seconds...`,
            log_tab + 1,
            'info',
            source
          )
          await tools.sleep(delay * 1000)
          master_data = master_data.concat(await getDenmarkChunkBondDetails(source, chunks[i], log_tab + 1))
        }
        lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)

        resolve(master_data)
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getDenmarkBonds(source, log_tab) {
  return new Promise(function getDenmarkBonds(resolve, reject) {
    ;(async () => {
      try {
        let all_data = new Array()
        let end_reached = false
        let page_id = 0
        while (!end_reached) {
          lg(`Get Denmark bonds page : ${page_id}`, log_tab + 1, 'info', source)
          let this_page_data = await getDenmarkBondsListInPage(source, page_id, log_tab + 1)
          all_data = all_data.concat(this_page_data)
          lg(`[${this_page_data.length}] Bonds in this page`, log_tab + 1, 'info', source)
          page_id++
          if (this_page_data.length < 1 || page_id >= gfinalConfig.denmark.page_limit) {
            end_reached = true
            lg(`END REACHED`, log_tab + 1, 'info', source)
          }
        }
        resolve(all_data)
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getDenmarkBondsListInPage(source, page_id, log_tab) {
  return new Promise(function getDenmarkBondsListInPage(resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        let size = gfinalConfig.denmark.get_bonds_list_size
        page_id = page_id * size
        let URI = `http://www.nasdaqomxnordic.com/webproxy/DataFeedProxy.aspx`
        var dataString = `xmlquery=%3Cpost%3E%0A%3Cparam+name%3D%22Exchange%22+value%3D%22NMF%22%2F%3E%0A%3Cparam+name%3D%22SubSystem%22+value%3D%22Prices%22%2F%3E%0A%3Cparam+name%3D%22Action%22+value%3D%22GetMarket%22%2F%3E%0A%3Cparam+name%3D%22inst__a%22+value%3D%220%2C1%2C2%2C5%2C21%2C23%22%2F%3E%0A%3Cparam+name%3D%22ext_xslt%22+value%3D%22%2FnordicV3%2Fpaging_inst_table.xsl%22%2F%3E%0A%3Cparam+name%3D%22Market%22+value%3D%22GITS%3ACO%3ACPHCB%22%2F%3E%0A%3Cparam+name%3D%22RecursiveMarketElement%22+value%3D%22True%22%2F%3E%0A%3Cparam+name%3D%22XPath%22+value%3D%22%2F%2Finst%5B%40itid%3D\'2\'+or+%40itid%3D\'3\'%5D%22%2F%3E%0A%3Cparam+name%3D%22ext_xslt_lang%22+value%3D%22en%22%2F%3E%0A%3Cparam+name%3D%22ext_xslt_tableId%22+value%3D%22bondsSearchDKTable%22%2F%3E%0A%3Cparam+name%3D%22ext_xslt_options%22+value%3D%22%2Cnoflag%2C%22%2F%3E%0A%3Cparam+name%3D%22ext_xslt_hiddenattrs%22+value%3D%22%2Cfnm%2Cisrid%2Cdlt%2Ctp%2Cbb%2Cib%2Ccpt%2Crps%2Cos%2Clt%2Cst%2Citid%2Clists%2Cit%2C%22%2F%3E%0A%3Cparam+name%3D%22ext_xslt_notlabel%22+value%3D%22%2Cfnm%22%2F%3E%0A%3Cparam+name%3D%22ext_xslt_jspcbk%22+value%3D%22doPaging%22%2F%3E%0A%3Cparam+name%3D%22ext_xslt_jsscbk%22+value%3D%22doSortPager%22%2F%3E%0A%3Cparam+name%3D%22ext_xslt_sorder%22+value%3D%22descending%22%2F%3E%0A%3Cparam+name%3D%22ext_xslt_sattr%22+value%3D%22chp%22%2F%3E%0A%3Cparam+name%3D%22ext_xslt_start%22+value%3D%22${page_id}%22%2F%3E%0A%3Cparam+name%3D%22ext_xslt_size%22+value%3D%22${size}%22%2F%3E%0A%3Cparam+name%3D%22inst__an%22+value%3D%22id%2Cnm%2Cfnm%2Cisin%2Ccpnrt%2Cbp%2Cap%2Clsp%2Cchp%2Catap%2Ced%2Cdlt%2Ccr%2Cisrid%2Ctp%2Cbb%2Cib%2Ccpt%2Crps%2Cos%2Clt%2Cst%2Citid%2Clists%2Cit%22%2F%3E%0A%3Cparam+name%3D%22app%22+value%3D%22%2Fobligationer%2Fdanmark%22%2F%3E%0A%3C%2Fpost%3E`
        var response = await Ffetch.down(
          {
            source: source,
            url: URI,
            method: 'POST',
            body: dataString,
            id: `bondslist[${page_id}]`,
          },
          log_tab + 1
        )
        // var response = await tor.downloadUrlUsingTor("Denmark", URI, gfinalConfig[source].defheaders, "POST", dataString, false);
        const $ = cheerio.load(response)
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
        // clg(isins_labels_array);
        lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        resolve(isins_labels_array)
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getDenmarkChunkBondDetails(source, chunk, log_tab) {
  return new Promise(function getDenmarkChunkBondDetails(resolve, reject) {
    ;(async () => {
      try {
        let this_chunck_data = await Promise.all(
          chunk.map(async (bond, index) => {
            let one_bond_details = await getDenmarkOneBondDetails(source, bond.isin, bond.label, log_tab + 1)
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
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getDenmarkOneBondDetails(source, isin, label, log_tab) {
  return new Promise(function getDenmarkOneBondDetails(resolve, reject) {
    ;(async () => {
      try {
        let link = `http://www.nasdaqomxnordic.com/webproxy/DataFeedProxy.aspx`
        var dataString = `xmlquery=%3Cpost%3E%0A%3Cparam+name%3D%22Exchange%22+value%3D%22NMF%22%2F%3E%0A%3Cparam+name%3D%22SubSystem%22+value%3D%22Prices%22%2F%3E%0A%3Cparam+name%3D%22Action%22+value%3D%22GetInstrument%22%2F%3E%0A%3Cparam+name%3D%22inst__a%22+value%3D%220%2C1%2C2%2C5%2C21%2C23%22%2F%3E%0A%3Cparam+name%3D%22Exception%22+value%3D%22false%22%2F%3E%0A%3Cparam+name%3D%22ext_xslt%22+value%3D%22%2FnordicV3%2Finst_table.xsl%22%2F%3E%0A%3Cparam+name%3D%22Instrument%22+value%3D%22${encodeURIComponent(
          label
        )}%22%2F%3E%0A%3Cparam+name%3D%22inst__an%22+value%3D%22oa%2Cdp%2Cdrd%22%2F%3E%0A%3Cparam+name%3D%22inst__e%22+value%3D%221%2C3%2C6%2C7%2C8%22%2F%3E%0A%3Cparam+name%3D%22trd__a%22+value%3D%227%2C8%22%2F%3E%0A%3Cparam+name%3D%22t__a%22+value%3D%221%2C2%2C10%2C7%2C8%2C18%2C31%22%2F%3E%0A%3Cparam+name%3D%22json%22+value%3D%221%22%2F%3E%0A%3Cparam+name%3D%22app%22+value%3D%22%2Fbonds%2Fdenmark%2Fmicrosite%22%2F%3E%0A%3C%2Fpost%3E`
        // lg(`Label= ${label} | isin= ${isin}`);
        // let response = await tor.downloadUrlUsingTor("Denmark_one_bond", link, gfinalConfig[source].defheaders, "POST", dataString, false);
        var json = await Ffetch.down(
          {
            source: source,
            url: link,
            method: 'POST',
            body: dataString,
            json: true,
            id: `details[${isin}]`,
          },
          log_tab + 1
        )
        // file.writeToFile(`downloads/${isin}.html`, response.body);
        // let json = JSON.parse(response);
        resolve({
          circulating_volume: json['inst']['@oa'],
          drawing_percent: json['inst']['@dp'],
          repayment_date: json['inst']['@drd'],
        })
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}
