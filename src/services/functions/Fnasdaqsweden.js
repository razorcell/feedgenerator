const cheerio = require('cheerio')
const Ffetch = require(`../Ffetch`)
const tools = require(`../tools`)
const scraping = require(`../scraping`)

const { clg } = require(`../tools`)

//Simplify logging
const lg = tools.lg

module.exports = {
  getNasdaqswedenUpdates,
  getSecuritiesList,
  getAllSecurities,
  getOneDetails,
  getOneOutstandingDetails,
}

function getNasdaqswedenUpdates(source, log_tab) {
  return new Promise(function getNasdaqswedenUpdates(resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        let securities = await getAllSecurities(source, log_tab + 1)
        securities = await getAllDetails(securities, source, log_tab + 1)
        securities = await getAllOutstandingDetails(securities, source, log_tab + 1)
        lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        resolve(securities)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getAllSecurities(source, log_tab) {
  return new Promise(function getAllSecurities(resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        let all_data = new Array()
        let indx = 0
        for (let type of gfinalConfig.nasdaqsweden.types) {
          lg(`Process Type [ ${type.name} ] reached ! `, log_tab + 1, 'info', source)
          let this_page_data = await getSecuritiesList(type, source, log_tab + 2)
          lg(`Extracted = ${this_page_data.length} from this type`, log_tab + 2, 'info', source)
          all_data = all_data.concat(this_page_data)
          await tools.pleaseWait(gfinalConfig[source].delay_min, gfinalConfig[source].delay_max, log_tab + 2)
        }
        lg(`Total Securities extracted= ${all_data.length}`, log_tab + 1, 'info', source)
        lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        resolve(all_data)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getSecuritiesList(type, source, log_tab) {
  return new Promise(function getSecuritiesList(resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        let body = `xmlquery=<post>
        <param+name="Exchange"+value="NMF"/>
        <param+name="Subsystem"+value="Prices"/>
        <param+name="Action"+value="GetMarket"/>
        <param+name="XPath"+value="${type.XPath}"/>
        <param+name="Market"+value="${type.marketvalue}"/>
        <param+name="ext_xslt"+value="/nordicV3/isr_inst_vert_table_testt.xsl"/>
        <param+name="ext_xslt_lang"+value="en"/>
        <param+name="ext_xslt_tableId"+value="bondsSearchTable"/>
        <param+name="ext_xslt_hiddenattrs"+value=",id,fnm,isrid,isr,ts,"/>
        <param+name="ext_xslt_link"+value="nm"/>
        <param+name="inst__an"+value="id,nm,fnm,isin,bp,ap,hp,lp,t,isrid,isr,ts"/>
        <param+name="app"+value="/bonds/sweden"/>
        </post>`
        body = encodeURI(body).replace(/%20/gm, '')
        let res = await Ffetch.down(
          {
            source: source,
            url: `http://www.nasdaqomxnordic.com/webproxy/DataFeedProxy.aspx`,
            method: 'POST',
            body: body,
            // log_req: true,
          },
          log_tab + 1
        )
        let securities = await getSecuritiesFromHTML(res, `nasdaqsweden`, log_tab + 1)
        lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        resolve(securities)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getSecuritiesFromHTML(html, source, log_tab) {
  return new Promise(function getSecuritiesFromHTML(resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        let Trs = await scraping.getTrsFromPage(
          html,
          `tr.odd,tr.even`,
          gfinalConfig[source].target_tds,
          99999,
          'html',
          log_tab + 1,
          true,
          source
        )
        let securities = Trs.map(tr => {
          let $ = cheerio.load(tr.label)
          return {
            isin: tr.isin,
            issuer: $($('a').get()[0]).attr('isr'),
            name: $($('a').get()[0]).attr('name'),
            url: `<a href="http://www.nasdaqomxnordic.com/bonds/sweden/microsite?Instrument=${$(
              $('a').get()[0]
            ).attr('name')}" target="_blank">Source</a>`,
          }
        })
        // clg(securities);
        lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        resolve(securities)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab + 2)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getAllDetails(securities, source, log_tab) {
  return new Promise(function getAllDetails(resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        let chunks = tools.arrayToChunks(securities, gfinalConfig[source].chunck_size, log_tab + 1, source)
        let all_details = []
        for (let i = 0; i < chunks.length; i++) {
          if (i >= gfinalConfig[source].chunks_limit) {
            lg(`Chunk limit [ ${gfinalConfig[source].chunks_limit} ] reached !`, log_tab + 1, 'info', source)
            resolve(all_details)
            return
          }
          lg(``, log_tab + 1, 'info', source)
          lg(`Process chunk = ${i} | remaining = ${chunks.length - (i + 1)}`, log_tab + 1, 'info', source)
          all_details = all_details.concat(
            await Promise.all(
              chunks[i].map(async security => {
                return await getOneDetails(security, source, log_tab + 2)
              })
            )
          )
          all_details = [].concat.apply([], all_details) //flattern the array
          await tools.pleaseWait(
            gfinalConfig[source].delay_min,
            gfinalConfig[source].delay_max,
            log_tab + 1,
            source
          )
        }
        lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        resolve(all_details)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab + 2)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getOneDetails(security, source, log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        let query = `xmlquery=<post>
        <param+name="Subsystem"+value="Prices"/>
        <param+name="Action"+value="GetInstrument"/>
        <param+name="Instrument"+value="${security.name}"/>
        <param+name="inst__an"+value="id,nm,fnm,isin,cr,cpnrt,midp,ch,hp,lp,ed,t,isrid,corrbp,corrap,tv,bp,ap,isr,lists,oa,ncd,ec,lip,ts"/>
        <param+name="ext_xslt"+value="/nordicV3/fixedincome/inst_vert_table_bondsse.xsl"/>
        <param+name="ext_xslt_tableId"+value="bondInformationTable"/>
        <param+name="ext_xslt_type"+value="info"/>
        <param+name="ext_xslt_hiddenattr"+value=",isrid,ts,"/>
        <param+name="ext_xslt_lang"+value="en"/>
        <param+name="app"+value="/bonds/sweden/microsite"/>
        </post>`
        query = encodeURI(query).replace(/%20/gm, '')
        let body = await Ffetch.down(
          {
            source: source,
            url: `http://www.nasdaqomxnordic.com/webproxy/DataFeedProxy.aspx`,
            method: 'POST',
            body: query,
            // log_req: true,
          },
          log_tab + 1
        )
        let Trs = await scraping.getTagsFromPage(
          {
            body,
            target_block: `#bondInformationTable`,
            target_tags: `tr`,
            tag_return_type: 'html',
            // return_type: 'object',
          },
          log_tab + 1,
          source
        )
        Trs = Trs.map(tr => {
          let tds = cheerio(tr).filter('td')
          if (cheerio(tds[0]).attr('title') === 'Name of this instrument')
            security['localcode'] = cheerio(tds[1]).text()
          // if (cheerio(tds[0]).attr('title') === 'Trading currency') security['currency'] = cheerio(tds[1]).text();
          // if (cheerio(tds[0]).attr('title') === 'Coupon rate') security['couponrate'] = cheerio(tds[1]).text();
          // if (cheerio(tds[0]).attr('title') === 'Expiration date') security['expirationdate'] = cheerio(tds[1]).text();
          return {
            title: cheerio(tds[0]).attr('title'),
            value: cheerio(tds[1]).text(),
          }
        })
        if (security['localcode'] == undefined) security['localcode'] = ''
        // clg(Trs);
        resolve(security)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getAllOutstandingDetails(securities, source, log_tab) {
  return new Promise(function getAllOutstandingDetails(resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        let chunks = tools.arrayToChunks(securities, gfinalConfig[source].chunck_size, log_tab + 1, source)
        let all_details = []
        for (let i = 0; i < chunks.length; i++) {
          if (i >= gfinalConfig[source].chunks_limit) {
            lg(`Chunk limit [ ${gfinalConfig[source].chunks_limit} ] reached !`, log_tab + 1, 'info', source)
            resolve(all_details)
            return
          }
          lg(``, log_tab + 1, 'info', source)
          lg(`Process chunk = ${i} | remaining = ${chunks.length - (i + 1)}`, log_tab + 1, 'info', source)
          all_details = all_details.concat(
            await Promise.all(
              chunks[i].map(async security => {
                return await getOneOutstandingDetails(security, source, log_tab + 2)
              })
            )
          )
          all_details = [].concat.apply([], all_details) //flattern the array
          await tools.pleaseWait(
            gfinalConfig[source].delay_min,
            gfinalConfig[source].delay_max,
            log_tab + 1,
            source
          )
        }
        lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        resolve(all_details)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab + 2)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getOneOutstandingDetails(security, source, log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        let query = `xmlquery=<post>
        <param+name="Subsystem"+value="Prices"/>
        <param+name="Action"+value="GetInstrument"/>
        <param+name="Instrument"+value="${security.name}"/>
        <param+name="inst__an"+value="id,nm,fnm,isin,cr,cpnrt,midp,ch,hp,lp,ed,t,isrid,corrbp,corrap,tv,bp,ap,isr,lists,oa,ncd,ec,lip,ts"/>
        <param+name="ext_xslt"+value="/nordicV3/fixedincome/inst_vert_table_bondsse.xsl"/>
        <param+name="ext_xslt_tableId"+value="bondInformationTable"/>
        <param+name="ext_xslt_type"+value="price"/>
        <param+name="ext_xslt_hiddenattr"+value=",isrid,ts,"/>
        <param+name="ext_xslt_lang"+value="en"/>
        <param+name="app"+value="/bonds/sweden/microsite"/>
        </post>`
        query = encodeURI(query).replace(/%20/gm, '')
        let body = await Ffetch.down(
          {
            source: source,
            url: `http://www.nasdaqomxnordic.com/webproxy/DataFeedProxy.aspx`,
            method: 'POST',
            body: query,
            // log_req: true,
          },
          log_tab + 1
        )
        let Trs = await scraping.getTagsFromPage(
          {
            body,
            target_block: `#bondInformationTable`,
            target_tags: `tr`,
            tag_return_type: 'html',
            // return_type: 'object',
          },
          log_tab + 1,
          source
        )
        Trs = Trs.map(tr => {
          let tds = cheerio(tr).filter('td')
          if (cheerio(tds[0]).attr('title') === 'Outstanding amount')
            security['outstanding'] = cheerio(tds[1]).text().replace(/,/g, '')
          // if (cheerio(tds[0]).attr('title') === 'Trading currency') security['currency'] = cheerio(tds[1]).text();
          // if (cheerio(tds[0]).attr('title') === 'Coupon rate') security['couponrate'] = cheerio(tds[1]).text();
          // if (cheerio(tds[0]).attr('title') === 'Expiration date') security['expirationdate'] = cheerio(tds[1]).text();
          return {
            title: cheerio(tds[0]).attr('title'),
            value: cheerio(tds[1]).text(),
          }
        })
        if (security['outstanding'] == undefined) security['outstanding'] = ''
        // clg(Trs);
        resolve(security)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}
