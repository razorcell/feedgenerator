const tools = require(`../tools`)
const Ffetch = require(`../Ffetch`)
const scraping = require(`../scraping`)
const file = require(`../file`)
const moment = require('moment')
const tableify = require('tableify')

//Simplify logging
const lg = tools.lg

const { clg } = require(`../tools`)

module.exports = {
  getSGXMASFRNAuctionsUpdates,
  getFRNAuctionsList,
}

function getSGXMASFRNAuctionsUpdates(source, log_tab) {
  return new Promise(function getSGXMASFRNAuctionsUpdates(resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        let auctions = await getFRNAuctionsList(source, log_tab + 1)
        let all_details = await getAllAuctionsDetails(`sgxmas`, auctions, 'SG_FI_GOV_FRN', log_tab + 1)
        lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        resolve(all_details)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getFRNAuctionsList(source, log_tab) {
  return new Promise(function getFRNAuctionsList(resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        let json_results = await Ffetch.down(
          {
            source: source,
            url: `https://www.mas.gov.sg/api/v1/bondsandbills/m/mfrnissuecalendar?rows=200&filters=ann_date:[2020-12-31%20TO%202021-12-30]&sort=ann_date%20asc`,
            json: true,
          },
          log_tab + 1
        )
        lg(
          `Extracted ${json_results.result.records.length} FRN Bonds securities`,
          log_tab + 1,
          'info',
          source
        )
        lg(`END - ${tools.gFName(new Error())}`, log_tab)
        resolve(json_results.result.records)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getAllAuctionsDetails(source, securities, file_prefix, log_tab) {
  return new Promise(function getAllAuctionsDetails(resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        let chunks = tools.arrayToChunks(securities, gfinalConfig[source].chunck_size, 2)
        let all_details = []
        for (let i = 0; i < chunks.length; i++) {
          // if (i < 12) continue;
          if (i >= gfinalConfig[source].chunks_limit) {
            lg(`Chunk limit [ ${gfinalConfig[source].chunks_limit} ] reached !`, log_tab + 1, 'info', source)
            all_details = all_details.filter(row => row != null)
            resolve(all_details)
            return
          }
          lg(``, log_tab + 1, 'info', source)
          lg(`Process chunk = ${i} | remaining = ${chunks.length - (i + 1)}`, log_tab + 1, 'info', source)
          all_details = all_details.concat(
            await Promise.all(
              chunks[i].map(async security => {
                return await getOneAuctionDetails(source, security, file_prefix, log_tab + 2)
              })
            )
          )
          all_details = [].concat.apply([], all_details) //flattern the array
          await tools.pleaseWait(
            gfinalConfig[source].delay_min,
            gfinalConfig[source].delay_max,
            log_tab,
            source
          )
        }
        // Filter Null values corresponding to Table header Trs or Invalid dates
        all_details = all_details.filter(row => row != null)
        lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
        resolve(all_details)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getOneAuctionDetails(source, security, prefix, log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        let formated_issue_date = security.issue_date
        security['IssueCode'] = security.issue_code
        delete security.issue_code
        security['ISIN'] = security.isin_code
        delete security.isin_code
        security['Tenor'] = `${security.auction_tenor}-week`
        delete security.auction_tenor
        security['AnnDate'] = security.ann_date
        delete security.ann_date
        security['AuctionDate'] = security.auction_date
        delete security.auction_date
        security['IssueDate'] = security.issue_date
        delete security.issue_date
        security['MaturityDate'] = security.maturity_date
        delete security.maturity_date
        let json_result = await Ffetch.down({
          source: source,
          url: `https://www.mas.gov.sg/api/v1/bondsandbills/m/listbondsandbills?rows=1&filters=issue_code:${security.IssueCode}%20AND%20issue_date:${formated_issue_date}%20AND%20auction_tenor:[*%20TO%20*]`,
          json: true,
        })

        security['details'] = json_result.result.records
        security[
          'url'
        ] = `https://www.mas.gov.sg/bonds-and-bills/auctions-and-issuance-calendar/Auction-MAS-Bill?issue_code=${security.IssueCode}&issue_date=${formated_issue_date}`
        if (!json_result.success || json_result.result.records.length === 0) {
          security['status'] = 'Upcoming'
          delete security.details
        } else {
          // clg(security.details);
          let details = json_result.result.records[0]
          security['status'] = 'Closed'
          security['Total Amount Offered'] = `${details.auction_amt} Million $`
          security['Minimum denomination'] = `${''} 1,000 $`
          security['Method of sale'] = `${''} Uniform price auction`
          security[
            'Competitive applications'
          ] = `${''} Must be expressed as an annual yield, to 2 decimal places`
          security[
            'Non-competitive applications'
          ] = `${''} Accepted at the cut-off yield of successful competitive applications, with pro-rated allotment if applications exceed 40% of amount offered`
          security['Yield and price'] = `${''} To be determined at auction`
          security['Total Amount Alloted'] = `${details.total_amt_allot} Million $`
          security['Total Amount Applied'] = `${details.total_bids} Million $`
          security[
            '% of Competitive Applications at Cut-off Allotted'
          ] = `Approximately ${details.pct_cmpt_appls_cutoff} %`
          security['Bid-to-Cover Ratio'] = `${details.bid_to_cover} `
          security['Cut-off Yield'] = `${details.cutoff_yield} `
          security['Cut-off Price'] = `${details.cutoff_price} `
          security['Median Yield'] = `${details.median_yield} `
          security['Median Price'] = `${details.median_price} `
          security['Average Yield'] = `${details.avg_yield} `
          security['Average Price'] = `${details.avg_price} `
          delete security.details
        }
        var html = tableify(security)
        let HTML_details = {
          title: `${security.ISIN} - ${security.IssueCode} - ${security.Tenor} / ${security['status']}`,
          issuer: `${security.IssueCode}`,
          date: moment().format('YYYY-MM-DD'),
          time: '',
          url: security.url,
          body: html,
          prefix: prefix,
          path: process.env.SGXMAS_EXPORTED_FILES_PATH,
          filename_date: false,
        }
        //Cleanups
        let HTML_file_info = await file.SaveHTMLFile(HTML_details, log_tab + 1)
        let Docx_file_info = await file.SaveDocxFile(HTML_details, log_tab + 1)
        security.htmlfilename = HTML_file_info.filename
        security.docxfilename = Docx_file_info.filename
        security.size = HTML_file_info.size
        resolve({
          ISIN: security.ISIN,
          IssueCode: security.IssueCode,
          AnnDate: security.AnnDate,
          AuctionDate: security.AuctionDate,
          IssueDate: security.IssueDate,
          MaturityDate: security.MaturityDate,
          Tenor: security.Tenor,
          status: security.status,
          docxfilename: security.docxfilename,
          htmlfilename: security.htmlfilename,
          size: security.size,
        })
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}
