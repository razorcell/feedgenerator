const cheerio = require('cheerio')
const moment = require('moment')
const tableify = require('tableify')

const { lg, gFName, arrayToChunks, catchError, pleaseWait, clg, reg, writeBinaryFile } = require(`../tools`)
const tor = require(`../tor`)
const file = require(`../file`)
const scraping = require(`../scraping`)
const Ffetch = require(`../Ffetch`)
const Faxios = require(`../Faxios`)

module.exports = {
  getSGSBondsList, //first table in the page

  getSGSBondsListSecondTable, //second table in the page

  getSavingsBondsList,
  getSGXMASSavingsBondsUpdates,

  getSGSAuctionsList,
  getSGXMASSGSAuctionsUpdates,

  getSGSAuctions_new_Updates,
  get_SGS_Bonds_Auctions_new_List2021,

  getTBillsAuctionsList,
  getSGXMASTbillsAuctionsUpdates,

  getSavingsAuctionsList,
  getSGXMASSavingsAuctionsUpdates,

  getMASBillsAuctionsList,
  getSGXMASMASBillsAuctionsUpdates,
}

//Oustatdning SGS Bonds table / first one in page
let sgxmas_tds = [
  {
    id: 0,
    name: 'maturity',
  },
  {
    id: 1,
    name: 'issuecode',
  },
  {
    id: 2,
    name: 'isin',
  },
  {
    id: 3,
    name: 'dateissued',
  },
  {
    id: 4,
    name: 'coupon',
  },
  {
    id: 5,
    name: 'amount',
  },
  {
    id: 6,
    name: 'interest',
  },
  {
    id: 7,
    name: 'paydate',
  },
]

async function getSGSBondsList(source, log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        lg(`START - getSGSBondsList`, log_tab + 1)
        let page = await tor.downloadUrlUsingTor(
          'sgxmas',
          `https://www.mas.gov.sg/bonds-and-bills/outstanding-sgs`,
          undefined,
          undefined,
          undefined,
          gfinalConfig[source].use_tor,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          log_tab + 1
        )
        let Trs = await scraping.getTrsFromPage(
          page.body,
          'div.contain:nth-child(1) > table:nth-child(1) tr',
          sgxmas_tds,
          99999999,
          'text',
          log_tab + 1
        )
        let valid_date_format = await file.getValidDateFormat(Trs, 'maturity', log_tab + 1)
        Trs.shift()
        Trs.shift()
        Trs = Trs.map(tr => {
          tr.maturity = moment(tr.maturity, valid_date_format, true).format(`YYYYMMDD`)
          tr.dateissued = moment(tr.dateissued, valid_date_format, true).format(`YYYYMMDD`)
          if (
            !moment(tr.maturity, 'YYYYMMDD', true).isValid() ||
            !moment(tr.dateissued, 'YYYYMMDD', true).isValid()
          ) {
            return null
          } else {
            return tr
          }
        }).filter(row => row != null)
        lg(`END - getSGSBondsList`, log_tab + 1)
        resolve(Trs)
        return
      } catch (err) {
        catchError(err, 'getSGSBondsList', undefined, undefined, log_tab + 3)
        reject(`getSGSBondsList : ${err.message}`)
      }
    })()
  })
}

//Oustatdning SGS Bonds table 2 / second table in page
let sgxmas_outstanding_table2_tds = [
  {
    id: 0,
    name: 'endofperiod',
  },
  {
    id: 1,
    name: 'outstandingbills',
  },
  {
    id: 2,
    name: 'outstandingbonds',
  },
  {
    id: 3,
    name: 'outstandingtotal',
  },
  {
    id: 4,
    name: 'endofperiod2',
  },
  {
    id: 5,
    name: 'endofperiod2month',
  },
  {
    id: 6,
    name: 'outstandingbills2',
  },
  {
    id: 7,
    name: 'outstandingbonds2',
  },
  {
    id: 8,
    name: 'outstandingtotal2',
  },
]

function getSGSBondsListSecondTable(source, log_tab) {
  return new Promise(function getSGSBondsListSecondTable(resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${gFName(new Error())}`, log_tab, 'info', source)
        let response = await Ffetch.down(
          {
            source,
            url: `https://www.mas.gov.sg/bonds-and-bills/outstanding-sgs`,
            id: 'Outstanding SGS Table',
          },
          log_tab + 1
        )
        let Trs = await scraping.getTrsFromPage(
          response,
          'div.contain:nth-child(1) > table:nth-child(4) tr',
          sgxmas_outstanding_table2_tds,
          99999999,
          'text',
          log_tab + 1
        )
        Trs = Trs.slice(3)
        clg(Trs)

        let new_data = []
        for (let row of Trs) {
          new_data.push({
            endofperiod: row.endofperiod !== '' ? parseInt(row.endofperiod) : '',
            month: '',
            outstandingbills: row.outstandingbills,
            outstandingbonds: row.outstandingbonds,
            outstandingtotal: row.outstandingtotal,
          })
          new_data.push({
            endofperiod: row.endofperiod2 !== '' ? parseInt(row.endofperiod2) : '',
            month: row.endofperiod2month,
            outstandingbills: row.outstandingbills2,
            outstandingbonds: row.outstandingbonds2,
            outstandingtotal: row.outstandingtotal2,
          })
        }
        lg(`Extracted ${new_data.length} outstanding data from Table 2`, log_tab + 1, 'info', source)
        new_data = new_data.filter(row => row.endofperiod !== '' || row.month !== '')
        new_data = new_data.sort((a, b) => b.endofperiod - a.endofperiod)
        lg(`END - ${gFName(new Error())}`, log_tab, 'info', source)
        resolve(new_data)
        return
      } catch (err) {
        catchError(err, gFName(new Error()), undefined, undefined, log_tab, source)
        reject(`${gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

//Saving Bonds Outstanding
function getSGXMASSavingsBondsUpdates(log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        lg(`START - getSGXMASSavingsBondsUpdates`, log_tab)
        let params = {
          source: 'sgxmas',
          StartYear: moment().format('YYYY'),
          StartMonth: 1,
          EndYear: moment().format('YYYY'),
          EndMonth: moment().format('M'),
        }
        lg(`Params = ${JSON.stringify(params)}`, log_tab + 2)
        let bonds_List = await getSavingsBondsList(params, log_tab + 2)
        lg(`END - getSGXMASSavingsBondsUpdates`, log_tab + 1)
        resolve(bonds_List)
        return
      } catch (err) {
        catchError(err, 'getSGXMASSavingsBondsUpdates', undefined, undefined, log_tab + 2)
        reject(`getSGXMASSavingsBondsUpdates : ${err.message}`)
      }
    })()
  })
}

let sgxmas_savingsb_tds = [
  {
    id: 0,
    name: 'issuecode',
  },
  {
    id: 1,
    name: 'isin',
  },
  {
    id: 2,
    name: 'dateissued',
  },
  {
    id: 3,
    name: 'maturity',
  },
  {
    id: 4,
    name: 'amountoffered',
  },
  {
    id: 5,
    name: 'amountissued',
  },
  {
    id: 6,
    name: 'ammountoutstanding',
  },
  {
    id: 7,
    name: 'outstanding',
  },
  {
    id: 8,
    name: 'redeemd1',
  },
  {
    id: 9,
    name: 'redeemd2',
  },
  {
    id: 10,
    name: 'redeemd3',
  },
  {
    id: 11,
    name: 'redeemd4',
  },
  {
    id: 12,
    name: 'redeemd5',
  },
  {
    id: 13,
    name: 'redeemd6',
  },
  {
    id: 14,
    name: 'redeemd7',
  },
  {
    id: 15,
    name: 'redeemd8',
  },
  {
    id: 16,
    name: 'redeemd9',
  },
  {
    id: 17,
    name: 'redeemd10',
  },
]

var SGX_MAS_SavingsBonds_headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:80.0) Gecko/20100101 Firefox/80.0',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Content-Type': 'application/x-www-form-urlencoded',
  Origin: 'https://eservices.mas.gov.sg',
  // 'Connection': 'close',
  Referer: 'https://eservices.mas.gov.sg/Statistics/fdanet/AmountOutstanding.aspx',
  'Upgrade-Insecure-Requests': '1',
  Connection: 'keep-alive',
  // 'TE': 'Trailers',
  // 'Cookie': '_sp_id.a65f=3e6303f0-4ca6-493b-9f64-27544b121b03.1600112453.4.1600276734.1600267186.251ca73e-6b4e-44f5-a4a7-f5f9c2804345; AMCV_DF38E5285913269B0A495E5A%40AdobeOrg=1075005958%7CMCIDTS%7C18522%7CMCMID%7C69769430647276965033860212300879272670%7CMCAAMLH-1600881464%7C6%7CMCAAMB-1600881464%7C6G1ynYcLPuiQxYZrsz_pkqfLG9yMXBpb2zX5dvJdYQJzPXImdj0y%7CMCOPTOUT-1600283864s%7CNONE%7CMCSYNCSOP%7C411-18529%7CvVersion%7C4.4.1; _ga=GA1.3.1777467642.1600112456; _gid=GA1.3.929843538.1600112456; _hjid=757bbd17-13c3-4001-a205-228a7506f823; _sp_id.6c1f=2222c7fe-9281-443a-9bff-55ad32ddadcf.1600180146.2.1600276734.1600180226.f5d5a14a-f79e-49db-8a72-9a2075e21839; AMCVS_DF38E5285913269B0A495E5A%40AdobeOrg=1; _hjTLDTest=1; ASP.NET_SessionId=tz4crtewx52gelg2uukci3ws; MAScookie=!n7fajxsE+kfNKeKsmaGRUExspuQYhQJ9vl5yQcpmV/QYn+1VfQKrriHgAhZ+Y/+C9o5x+kjSSeBedk1peteY0NfN+ONJ1GvYOcxucrCfbYz+wRljXyYGHDp38X9i2cWk9awocnEc+ZncYcTO3xa/3nv159jPx78=; TS011284b5=01df21a10a103568063454bdb0ab85a9301b289434eb5500d9e7577934b914e8f1b93266a91bd9b0a7e8332efad9430d8881a69a710999e122ec493f3405219bfed1559795; _sp_ses.a65f=*; _gat=1; _gat_UA-72554732-3=1; _sp_ses.6c1f=*'
}

function getSavingsBondsList(params, log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        lg(`START - getSavingsBondsList`, log_tab + 1)
        let { source, StartYear, StartMonth, EndYear, EndMonth } = params
        var dataString = `__EVENTTARGET=&__EVENTARGUMENT=&__VIEWSTATE=AAAAglyRdbDSJLPpyrLFLI4iEZDK8PGfngLrFQDdAvqbOQAlKr0UuGoE2Z3wKugirJUTtV9oD9Pzk5tY7ltpFH1Rt%2FwE3HJPN6mY9sq95uRnGSNmQupOn%2Bdz%2FCjVsMJhYPyDVZPJpLw8VkrlyKk%2BehkCjvsnGE75wOF%2BEC%2Bc68KkP0qdhnV%2BFaNJqydmtUJUqvb7il8h0f958WtX1LzoBN4USL9Bwx1yrGVxi5mABravbMjWmmpfm2fepaEq1qTbj9shItM6IErqQ0kscuPhvSUTanbklCxB0sSluMpzljOgP%2F4y3OKrOo%2F51kNnzdrvouWrjC4ed3bgkQKB3Z8D%2BbtVbdjlA1Xplc5wmnJlvEhhkvlP2giExOsDhAdkgnaRfqHCYS5DhkfqLPWVpMorXgyOej22mReP14IZ7thcf7fybm3RcFZL4zbMOyL%2FjioPuBPaqZ8c7%2F2BhOLUxHx9M%2FD8%2BMc%2Biw56ri%2FpvbLuA4eyn1hmdyLOkem5%2FssKhLjQFRNp0%2FXhtwsV3IrR2ivQl4jsRL1U0QT2BE9%2FzYQNQyvki5%2BBeEJpSi9om3Vv9PlYnYtOHdfT8hgM%2Fu9NTvj9TMx37KHzv9CgUgqdFBDTG22BlUMpTF4lsqc7wXCM3Alknkj6FnmbTCtSKAWfekJ%2BM%2BSfdYn4TuT%2FRr6sfqMZuG6cCyz%2Fu53RHtBHSl3TEp3yBOL6TBSD%2FUNyC7eeaitrcz1guiQBMrYcJkhl15YK%2B8hawPIDW3xRkbSpIDzhuAuGutvZH%2BTOv746mUTHffbVmpcEnxg1H4MKqGfJM48Shxae9zR4gjC8PvrtVzi%2F7f9OHBCAAtf%2FVaBTCBHflbtvbY5M1XB5uiUUv6mZzvyZaXHA7z51JhD5Dx6skbumm6o8sqt0orI%2BbYZ4U4oFbbqobvXxnqx6FODaqE3v43ct406bxhTPEpA4FtJIr2ILNFO2Bs1e7QyiAFbVUBiUXkcq7LLryAR6ANUZkBnithuFW71bLzqyZwRdvj0wrK7z7lXze2SVliInWN6PrJENEFDesOmc7MuwpqmE3ayIXTnWn83G2WGgaH%2BqSE0MZnNqAC%2BrSztwd0to0zLbQ%2F2mHSN6gGJV6%2Bnhcrm37JaQuGFoZpWOjolm%2Fl35h6Mn%2BlSmLNbZysrAoKkBnHBoxR8br5xPxxRc3DFi6Fcft0or2v35DB0x0l9br6Ciq0h77jbOFFoUWgMcH2IyLKiInK%2BXw1JxcSYle5NK4nBIuv2HQFmMhq1ezjNij%2FJ1RoA2Rz%2FJvaL%2BJn4pEBov8GHgv7ibmqVEH7zwEmgHxbysWAsrmy52RYzXcMe%2BnDrIHAPJ%2B4zKQ68HnQzsa9GIyzE6BgQ0pmBRZX1qrh9FOvNVslFjuqbQtN2GqPWZ1xXq5W%2FW1SPfzgnWmz6BWQyfX1nOwnc7D26Eovec9Y6sGhEJGv1g%2BXoMoqXnx8u1%2BkzWu7xr8OhjX5MB5Aju%2BiEdAqzQv7HtxFcZfgrfCZOUhmTB5O328cf%2BDVYIJ1mXufcuH6yywLk6tKUIQ9s7&__VIEWSTATEGENERATOR=1D575CA5&__EVENTVALIDATION=Rwt8MWquF9G1adL5h%2BOtTSgj8RrKuRQ6XZ5KWXHqh6CZ0duqYGrbQGGZRAo6FjOcl2EjJjXonPGB%2Fg93Z5b4jc32IEKOA8GQwTy%2B9AcaDsSN2DvXTWdAixPTZJbdYnWBSmV1x%2B1xRGgEct5ePeVSonSbCYDfyB9PrzdoGnPvZ0PX0AeUmIsPPsvyVtt2hGrhISYOUO0PgyAfJ0gylb8FeaY6eaKMAhLc1RbHPhVeCoDbmEF8iFfju3U%2BwOa7wao1pv%2FHMQ75jqRwUr9U5rQRsxaG1V0Qd0XdzIuXwsGTYuUPe6tlDuZ5rvHuinwdOnmvSN9q0vKoJtefi1rSC%2FelUg37btaF%2Fv0rQPn5CXVzzAVfh2jHj%2FvKm3Xy0Oueg3LIvYX6%2Bhk398%2FgzZ5rMQBTCjxUbMshoVEh3U7alZcnJA5Oef3q12QDluoMPOmDpo46FX8XkEWIWZh2MZ4QKTTpDMjYC8IAdZXii9MhcipSsbXzMlOAnESPRHk1Uf8YM0KikJTAQhQ8utPEIT9dcxlWMWuycEIDf%2BGx2jj%2BFdMx6kD9H2rHstIOVCJbrp2DQo9B0ZoPqVF5OwYH3ljWfJwe%2FsWRZdmPRRfS8CTo911dUsqBCKcn48NJiHFJK9GHktGixCbGFDcCP4dQItriYsIBp7tJNkxKJka4Y7DPAmveW%2B4tzOC2D67uLWjoPScgQbifDY21LW%2FYlyl8Zk3Wf%2BaFOEnT4vbybeUOC75emcxKUOgDXH8zoxUDO0VOCLQ0VrdKBWnyAB2Mf3JylmQC5g2L1TsfTBSUPOFjiARYkZsfRNGTmH2CohtCiCZf5xHuBB9Vn34vTBusFEQtiap5C815MtOBlDpFVqvAgnZWdMtqy7M739KzAjbUbD2bhg8JJs6pND8c0uSbL0WzmPxDib09v3XjBpUXo4yK5Hl4eDxvQpA1v3EISo8lZO%2BlaRRPUpkEBAU%2FB4tzAThlgoxwVWQmX2Hup0A%2BGqqSzESrbs7zQz5X67sR0IVfT0JWegvGkhd6mKAlEZrShY5WUcXZ6qNbSIU%2BEQYS6bw5HY5fER%2BezenSyyuncv%2Bx4IBbJrQ%2FC0hAV68B87hgFIqk05svDEV6ETx7uHovL7oHTuqY4zKu0NRv00RF8hmfQwSW0iIS9wwu0dcetKmRxxmrnd44J1aYkcC2h7lvlkFvpgODVXF8ALf83Iy5yeCAjpvGGHWqrkL%2B1PBqQAW9eiYlSbK9Z5pgVZa7dAHq7TnH4DPwGVZTOTQ1dT94BMVkC1Arp2yPhhoKVetidjuLY%2BCAHE%2FB2K86SDisfFLwZWDDPHHXaiQzNJ1mYAFFzjf2NnM2jVx%2BpS22&ctl00%24ContentPlaceHolder1%24StartYearDropDownList=${StartYear}&ctl00%24ContentPlaceHolder1%24StartMonthDropDownList=${StartMonth}&ctl00%24ContentPlaceHolder1%24EndYearDropDownList=${EndYear}&ctl00%24ContentPlaceHolder1%24EndMonthDropDownList=${EndMonth}&ctl00%24ContentPlaceHolder1%24DisplayButton=Display`

        let page = await tor.downloadUrlUsingTor(
          source,
          `https://eservices.mas.gov.sg/Statistics/fdanet/AmountOutstanding.aspx`,
          SGX_MAS_SavingsBonds_headers,
          'POST',
          undefined,
          gfinalConfig[source].use_tor,
          undefined,
          dataString,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          log_tab + 1,
          false,
          true
        )
        // await file.writeToFile(`downloads/getSavingsBondsList.html`, page.body);
        let Trs = await scraping.getTrsFromPage(
          page.body,
          'table.results-panel tr',
          sgxmas_savingsb_tds,
          999999,
          'text',
          log_tab + 1
        )
        let valid_date_format = await file.getValidDateFormat(Trs, 'dateissued', log_tab + 1)
        Trs.shift()
        Trs.shift()
        Trs = Trs.map(tr => {
          tr.dateissued = moment(tr.dateissued, valid_date_format, true).format(`YYYYMMDD`)
          tr.maturity = moment(tr.maturity, valid_date_format, true).format(`YYYYMMDD`)
          if (
            !moment(tr.maturity, 'YYYYMMDD', true).isValid() ||
            !moment(tr.dateissued, 'YYYYMMDD', true).isValid()
          ) {
            return null
          } else {
            return tr
          }
        }).filter(row => row != null)
        lg(`END - getSavingsBondsList`, log_tab + 1)
        resolve(Trs)
        return
      } catch (err) {
        catchError(err, 'getSavingsBondsList', undefined, undefined, log_tab + 3)
        reject(`getSavingsBondsList : ${err.message}`)
      }
    })()
  })
}

var SGX_MAS_SGSAuction_headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:80.0) Gecko/20100101 Firefox/80.0',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  // 'Content-Type': 'application/x-www-form-urlencoded',
  Origin: 'https://eservices.mas.gov.sg',
  Connection: 'close',
  Referer: 'https://eservices.mas.gov.sg/Statistics/fdanet/AmountOutstanding.aspx',
  'Upgrade-Insecure-Requests': '1',
  // 'TE': 'Trailers',
  // 'Cookie': '_sp_id.a65f=3e6303f0-4ca6-493b-9f64-27544b121b03.1600112453.4.1600276734.1600267186.251ca73e-6b4e-44f5-a4a7-f5f9c2804345; AMCV_DF38E5285913269B0A495E5A%40AdobeOrg=1075005958%7CMCIDTS%7C18522%7CMCMID%7C69769430647276965033860212300879272670%7CMCAAMLH-1600881464%7C6%7CMCAAMB-1600881464%7C6G1ynYcLPuiQxYZrsz_pkqfLG9yMXBpb2zX5dvJdYQJzPXImdj0y%7CMCOPTOUT-1600283864s%7CNONE%7CMCSYNCSOP%7C411-18529%7CvVersion%7C4.4.1; _ga=GA1.3.1777467642.1600112456; _gid=GA1.3.929843538.1600112456; _hjid=757bbd17-13c3-4001-a205-228a7506f823; _sp_id.6c1f=2222c7fe-9281-443a-9bff-55ad32ddadcf.1600180146.2.1600276734.1600180226.f5d5a14a-f79e-49db-8a72-9a2075e21839; AMCVS_DF38E5285913269B0A495E5A%40AdobeOrg=1; _hjTLDTest=1; ASP.NET_SessionId=tz4crtewx52gelg2uukci3ws; MAScookie=!n7fajxsE+kfNKeKsmaGRUExspuQYhQJ9vl5yQcpmV/QYn+1VfQKrriHgAhZ+Y/+C9o5x+kjSSeBedk1peteY0NfN+ONJ1GvYOcxucrCfbYz+wRljXyYGHDp38X9i2cWk9awocnEc+ZncYcTO3xa/3nv159jPx78=; TS011284b5=01df21a10a103568063454bdb0ab85a9301b289434eb5500d9e7577934b914e8f1b93266a91bd9b0a7e8332efad9430d8881a69a710999e122ec493f3405219bfed1559795; _sp_ses.a65f=*; _gat=1; _gat_UA-72554732-3=1; _sp_ses.6c1f=*'
}

//SGS Auction Notices
let sgxmas_sgsauction_tds = [
  {
    id: 0,
    name: 'maturity',
  },
  {
    id: 1,
    name: 'code_isin',
  },
  {
    id: 2,
    name: 'items',
  },
]

function getSGXMASSGSAuctionsUpdates(log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        lg(`START - getSGXMASSGSAuctionsUpdates`, log_tab)
        let Notices = await getSGSAuctionsList(log_tab + 1)
        let Notices_files = await downloadAllPDFFilesSGSAuctions(Notices, `SG_FI_GOV`, log_tab + 1)
        lg(`END - getSGXMASSGSAuctionsUpdates`, log_tab + 1)
        resolve(Notices_files)
        return
      } catch (err) {
        catchError(err, 'getSGXMASSGSAuctionsUpdates', undefined, undefined, log_tab + 2)
        reject(`getSGXMASSGSAuctionsUpdates : ${err.message}`)
      }
    })()
  })
}

function getSGSAuctionsList(source, log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        lg(`START - getAuctionsList`, log_tab + 1)
        let page = await tor.downloadUrlUsingTor(
          source,
          `https://www.mas.gov.sg/bonds-and-bills/auctions-and-issuance-calendar/previous-sgs-bonds-auction-announcements-and-results`,
          SGX_MAS_SGSAuction_headers,
          'GET',
          undefined,
          gfinalConfig.sgxmas.use_tor,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          log_tab + 1,
          false,
          true
        )
        // await file.writeToFile(`downloads/SGXMASSGSAuctionTest.html`, page.body);
        let Trs = await scraping.getTrsFromPage(
          page.body,
          '.mas-table > table:nth-child(1) > tbody:nth-child(2) tr',
          sgxmas_sgsauction_tds,
          9999999,
          'html',
          log_tab + 1
        )
        Trs.shift()
        lg(`START - getSGSAuctionDocsFromItemsList`, log_tab + 3)
        let Notices_files = await Promise.all(
          Trs.map(async tr => {
            tr.files = await getSGSAuctionDocsFromItemsList(tr.items, log_tab + 3)
            delete tr.items
            return tr
          })
        )
        lg(`END - getSGSAuctionDocsFromItemsList`, log_tab + 3)

        // clg(Notices_files);
        Notices_files = await flatternSGSAuctionDocs(Notices_files, log_tab + 2)
        lg(`END - getAuctionsList`, log_tab + 1)
        resolve(Notices_files)
        return
      } catch (err) {
        catchError(err, 'getAuctionsList', undefined, undefined, log_tab + 3)
        reject(`getAuctionsList : ${err.message}`)
      }
    })()
  })
}

function flatternSGSAuctionDocs(Notices_files, log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        lg(`START - flatternSGSAuctionDocs`, log_tab + 1)
        let files_flat = []
        Notices_files.forEach(function (security) {
          security.files.forEach(file => {
            let regex = /(?:^.*)(?:\/)(.*)(?:\.pdf)/gm
            files_flat.push({
              maturity: security.maturity.replace(/<.*>/gm, ``).replace(/&.*;/gm, ``),
              code_isin: security.code_isin
                .replace(/(<br>)|(<\/br>)|(<p>)|(<\/p>)|(<strong>)|(<\/strong>)|(<span>)|(<\/span>)/gm, ``)
                // .replace(/&n.*;/gm, ``)
                .replace(/\s+/gm, ``)
                .replace(/&#xA0*;/gm, ``)
                .replace(/[^a-z|A-Z|0-9]/gm, `_`)
                .replace('_+', '_'),
              // event: event_label,
              filename: regex.exec(file)[1],
              url: file,
            })
          })
          // Object.keys(security.files).forEach(function (event_label) {
          //   security.files[event_label].forEach(function (one_file) {
          //     if (one_file.filename.length > 0) {
          //       files_flat.push({
          //         maturity: security.maturity.replace(/<.*>/gm, ``),
          //         code_isin: security.code_isin.replace(/[^a-z|A-Z|0-9]/gm, `_`).replace('__', '_'),
          //         event: event_label,
          //         filename: one_file.filename,
          //         url: one_file.url
          //       })
          //     }
          //   })
          // })
        })
        lg(`END - flatternSGSAuctionDocs`, log_tab + 1)
        resolve(files_flat)
        return
      } catch (err) {
        catchError(err, 'flatternSGSAuctionDocs', undefined, undefined, log_tab + 3)
        reject(`flatternSGSAuctionDocs : ${err.message}`)
      }
    })()
  })
}

function getSGSAuctionDocsFromItemsList(items_html, log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        let $ = cheerio.load(items_html)
        let a_tags = $('a').get()
        if (Array.isArray(a_tags) && a_tags.length > 0) {
          a_tags = a_tags.map(a_tag => {
            return $(a_tag).attr('href')
          })
          // if (Array.isArray(p_tags) && p_tags.length > 0) {
          //   let files = [];
          //   let last_label = false;
          //   p_tags.forEach(function (p_tag) {
          //     clg($(p_tag).text());
          //     if ($(p_tag).find('strong').length > 0 || $(p_tag).text() != ' ') {
          //       last_label = $(p_tag).text().replace(/[^a-z|A-Z|0-9]/gm, `_`).replace('__', '_');
          //       files[last_label] = [];
          //     } else {
          //       files[last_label].push({
          //         filename: $(p_tag).find('span').text(),
          //         url: $(p_tag).find('a').attr('href')
          //       });
          //     }
          //   })
          // clg(files);
          //Remove duplicates
          a_tags = [...new Set(a_tags)]
          resolve(a_tags)
          return
        } else {
          lg(`No A tags found in this row`, log_tab + 2)
          // lg(`No Paragraph tags found in this row`, log_tab + 2);
          resolve([])
          return
        }
      } catch (err) {
        catchError(err, 'getSGSAuctionDocsFromItemsList', undefined, undefined, log_tab + 3)
        reject(`getSGSAuctionDocsFromItemsList : ${err.message}`)
      }
    })()
  })
}

function downloadAllPDFFilesSGSAuctions(Notices, file_prefix, log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        let chunks = arrayToChunks(Notices, gfinalConfig.sgxmas.chunck_size, 2)
        let all_details = []
        for (let i = 0; i < chunks.length; i++) {
          if (i >= gfinalConfig.sgxmas.chunks_limit) {
            lg(`Chunk limit [ ${gfinalConfig.sgxmas.chunks_limit} ] reached !`, log_tab + 1)
            resolve(all_details)
            return
          }
          lg(``)
          lg(`Process chunk = ${i} | remaining = ${chunks.length - (i + 1)}`, log_tab + 1)
          all_details = all_details.concat(
            await Promise.all(
              chunks[i].map(async Notice => {
                return await downloadPDFFileSGSAuctions(Notice, file_prefix, log_tab + 2)
              })
            )
          )
          all_details = [].concat.apply([], all_details) //flattern the array
          await pleaseWait(gfinalConfig.sgxmas.delay_min, gfinalConfig.sgxmas.delay_max, 2)
        }
        resolve(all_details)
        return
      } catch (err) {
        catchError(err, 'downloadAllPDFFilesSGSAuctions', undefined, undefined, log_tab + 1)
        reject(`downloadAllPDFFilesSGSAuctions: ${err.message}`)
      }
    })()
  })
}

function downloadPDFFileSGSAuctions(Notice, file_prefix, log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        Notice.url = `https://www.mas.gov.sg${Notice.url}`
        var SGX_MAS_SGSAuction_headers = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:80.0) Gecko/20100101 Firefox/80.0',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          // 'Content-Type': 'application/x-www-form-urlencoded',
          Origin: 'https://eservices.mas.gov.sg',
          Connection: 'close',
          Referer: 'https://eservices.mas.gov.sg/Statistics/fdanet/AmountOutstanding.aspx',
          'Upgrade-Insecure-Requests': '1',
          // 'TE': 'Trailers',
          // 'Cookie': '_sp_id.a65f=3e6303f0-4ca6-493b-9f64-27544b121b03.1600112453.4.1600276734.1600267186.251ca73e-6b4e-44f5-a4a7-f5f9c2804345; AMCV_DF38E5285913269B0A495E5A%40AdobeOrg=1075005958%7CMCIDTS%7C18522%7CMCMID%7C69769430647276965033860212300879272670%7CMCAAMLH-1600881464%7C6%7CMCAAMB-1600881464%7C6G1ynYcLPuiQxYZrsz_pkqfLG9yMXBpb2zX5dvJdYQJzPXImdj0y%7CMCOPTOUT-1600283864s%7CNONE%7CMCSYNCSOP%7C411-18529%7CvVersion%7C4.4.1; _ga=GA1.3.1777467642.1600112456; _gid=GA1.3.929843538.1600112456; _hjid=757bbd17-13c3-4001-a205-228a7506f823; _sp_id.6c1f=2222c7fe-9281-443a-9bff-55ad32ddadcf.1600180146.2.1600276734.1600180226.f5d5a14a-f79e-49db-8a72-9a2075e21839; AMCVS_DF38E5285913269B0A495E5A%40AdobeOrg=1; _hjTLDTest=1; ASP.NET_SessionId=tz4crtewx52gelg2uukci3ws; MAScookie=!n7fajxsE+kfNKeKsmaGRUExspuQYhQJ9vl5yQcpmV/QYn+1VfQKrriHgAhZ+Y/+C9o5x+kjSSeBedk1peteY0NfN+ONJ1GvYOcxucrCfbYz+wRljXyYGHDp38X9i2cWk9awocnEc+ZncYcTO3xa/3nv159jPx78=; TS011284b5=01df21a10a103568063454bdb0ab85a9301b289434eb5500d9e7577934b914e8f1b93266a91bd9b0a7e8332efad9430d8881a69a710999e122ec493f3405219bfed1559795; _sp_ses.a65f=*; _gat=1; _gat_UA-72554732-3=1; _sp_ses.6c1f=*'
        }

        SGX_MAS_SGSAuction_headers['Content-type'] = 'applcation/pdf'
        let page = await tor.downloadUrlUsingTor(
          'sgxmas_file',
          Notice.url,
          undefined,
          'GET',
          undefined,
          gfinalConfig.sgxmas.use_tor,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          true,
          undefined,
          log_tab + 1
        )
        Notice.label = Notice.filename
        let filename = `${file_prefix}_${Notice.filename}.pdf`
        await writeBinaryFile(`${process.env.SGXMAS_EXPORTED_FILES_PATH}${filename}`, page.body)
        Notice.url = `<a href="${Notice.url}" target="_blank">Source</a>`
        Notice.filename = filename
        resolve(Notice)
        return
      } catch (err) {
        catchError(err, 'downloadPDFFileSGSAuctions', true, 'general', log_tab + 4)
        reject(`downloadPDFFileSGSAuctions: ${err.message}`)
      }
    })()
  })
}

//Tbills Auction Notices
function getSGXMASTbillsAuctionsUpdates(log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        lg(`START - getSGXMASTbillsAuctionsUpdates`, log_tab)
        let Notices = await getTBillsAuctionsList(`sgxmas`, log_tab + 1)
        let Notices_files = await downloadAllPDFFilesTBillsAuctions(Notices, `SG_FI_GOV_TBILLS`, log_tab + 1)
        lg(`END - getSGXMASTbillsAuctionsUpdates`, log_tab + 1)
        resolve(Notices_files)
        return
      } catch (err) {
        catchError(err, 'getSGXMASTbillsAuctionsUpdates', undefined, undefined, log_tab + 2)
        reject(`getSGXMASTbillsAuctionsUpdates : ${err.message}`)
      }
    })()
  })
}

function getTBillsAuctionsList(source, log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        lg(`START - getTBillsAuctionsList`, log_tab + 1)
        let page = await tor.downloadUrlUsingTor(
          source,
          `https://www.mas.gov.sg/bonds-and-bills/auctions-and-issuance-calendar/previous-t-bills-auction-announcements-and-results`,
          SGX_MAS_SGSAuction_headers,
          'GET',
          undefined,
          gfinalConfig.sgxmas.use_tor,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          log_tab + 1,
          false,
          true
        )
        // await file.writeToFile(`downloads/SGXMASTbillsAuctionTest.html`, page.body);

        let P_tags = await scraping.getTagsFromPage(
          {
            body: page.body,
            target_block: 'div.contain:nth-child(1)',
            target_tags: 'p',
            tag_return_type: 'html',
            // return_type: 'noobject',
            rows_max: 999999,
          },
          log_tab + 1
        )
        // P_tags.shift();
        // clg(P_tags);
        lg(`START - getTBillAuctionDocsFromItemsList`, log_tab + 3)
        let Notices_files = await getTbillAuctionDocsFromItemsList(P_tags, log_tab + 3)
        lg(`END - getTBillAuctionDocsFromItemsList`, log_tab + 3)
        // clg(Notices_files);
        Notices_files = await flatternTbillsAuctionDocs(Notices_files, log_tab + 2)
        lg(`END - getTBillsAuctionsList`, log_tab + 1)
        resolve(Notices_files)
        return
      } catch (err) {
        catchError(err, 'getTBillsAuctionsList', undefined, undefined, log_tab + 3)
        reject(`getTBillsAuctionsList : ${err.message}`)
      }
    })()
  })
}

function flatternTbillsAuctionDocs(Notices_files, log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        lg(`START - flatternTbillsAuctionDocs`, log_tab + 1)
        let files_flat = []
        Object.keys(Notices_files).forEach(function (event_label) {
          Notices_files[event_label].forEach(function (one_file) {
            if (one_file.filename.length > 0) {
              files_flat.push({
                event: event_label,
                filename: one_file.filename,
                url: one_file.url,
              })
            }
          })
        })
        lg(`END - flatternTbillsAuctionDocs`, log_tab + 1)
        resolve(files_flat)
        return
      } catch (err) {
        catchError(err, 'flatternTbillsAuctionDocs', undefined, undefined, log_tab + 3)
        reject(`flatternTbillsAuctionDocs : ${err.message}`)
      }
    })()
  })
}

function getTbillAuctionDocsFromItemsList(P_tags, log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        let files = []
        let last_label
        P_tags.forEach(function (p_tag) {
          // clg(p_tag);
          let $ = cheerio.load(p_tag)
          if ($('a').get().length === 0) {
            // clg('Label' + p_tag);
            last_label = $(p_tag)
              .text()
              .replace(/[^a-z|A-Z|0-9]/gm, `_`)
              .replace(/_+/gm, '_')
            files[last_label] = []
            // clg(files);
          } else {
            // clg('File' + p_tag);
            if ($('a').get().length > 0) {
              files[last_label].push({
                filename: $($('span').get()[0])
                  .text()
                  .replace(/[^a-z|A-Z|0-9]/gm, `_`)
                  .replace(/_+/gm, '_'),
                url: `https://www.mas.gov.sg${$($('a').get()[0]).attr('href')}`,
              })
            }
          }
        })
        // clg(files);
        resolve(files)
        return
      } catch (err) {
        catchError(err, 'getTbillAuctionDocsFromItemsList', undefined, undefined, log_tab + 3)
        reject(`getTbillAuctionDocsFromItemsList : ${err.message}`)
      }
    })()
  })
}

function downloadAllPDFFilesTBillsAuctions(Notices, file_prefix, log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        lg(`START - downloadAllPDFFilesTBillsAuctions`, log_tab)
        let chunks = arrayToChunks(Notices, gfinalConfig.sgxmas.chunck_size, 2)
        let all_details = []
        for (let i = 0; i < chunks.length; i++) {
          if (i >= gfinalConfig.sgxmas.chunks_limit) {
            lg(`Chunk limit [ ${gfinalConfig.sgxmas.chunks_limit} ] reached !`, log_tab + 1)
            resolve(all_details)
            return
          }
          lg(``)
          lg(`Process chunk = ${i} | remaining = ${chunks.length - (i + 1)}`, log_tab + 1)
          all_details = all_details.concat(
            await Promise.all(
              chunks[i].map(async Notice => {
                return await downloadPDFFileTBillsAuctions(Notice, file_prefix, undefined, log_tab + 2)
              })
            )
          )
          all_details = [].concat.apply([], all_details) //flattern the array
          await pleaseWait(gfinalConfig.sgxmas.delay_min, gfinalConfig.sgxmas.delay_max, 2)
        }
        lg(`START - downloadAllPDFFilesTBillsAuctions`, log_tab)
        resolve(all_details)
        return
      } catch (err) {
        catchError(err, 'downloadAllPDFFilesTBillsAuctions', undefined, undefined, log_tab + 1)
        reject(`downloadAllPDFFilesTBillsAuctions: ${err.message}`)
      }
    })()
  })
}

function downloadPDFFileTBillsAuctions(Notice, file_prefix, headers, log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        // Notice.url = `https://www.mas.gov.sg${Notice.url}`;
        headers = headers || {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:80.0) Gecko/20100101 Firefox/80.0',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Content-Type': 'applcation/pdf',
          Origin: 'https://eservices.mas.gov.sg',
          Connection: 'close',
          Referer:
            'https://www.mas.gov.sg/bonds-and-bills/auctions-and-issuance-calendar/previous-t-bills-auction-announcements-and-results',
          'Upgrade-Insecure-Requests': '1',
          // 'TE': 'Trailers',
          // 'Cookie': '_sp_id.a65f=3e6303f0-4ca6-493b-9f64-27544b121b03.1600112453.4.1600276734.1600267186.251ca73e-6b4e-44f5-a4a7-f5f9c2804345; AMCV_DF38E5285913269B0A495E5A%40AdobeOrg=1075005958%7CMCIDTS%7C18522%7CMCMID%7C69769430647276965033860212300879272670%7CMCAAMLH-1600881464%7C6%7CMCAAMB-1600881464%7C6G1ynYcLPuiQxYZrsz_pkqfLG9yMXBpb2zX5dvJdYQJzPXImdj0y%7CMCOPTOUT-1600283864s%7CNONE%7CMCSYNCSOP%7C411-18529%7CvVersion%7C4.4.1; _ga=GA1.3.1777467642.1600112456; _gid=GA1.3.929843538.1600112456; _hjid=757bbd17-13c3-4001-a205-228a7506f823; _sp_id.6c1f=2222c7fe-9281-443a-9bff-55ad32ddadcf.1600180146.2.1600276734.1600180226.f5d5a14a-f79e-49db-8a72-9a2075e21839; AMCVS_DF38E5285913269B0A495E5A%40AdobeOrg=1; _hjTLDTest=1; ASP.NET_SessionId=tz4crtewx52gelg2uukci3ws; MAScookie=!n7fajxsE+kfNKeKsmaGRUExspuQYhQJ9vl5yQcpmV/QYn+1VfQKrriHgAhZ+Y/+C9o5x+kjSSeBedk1peteY0NfN+ONJ1GvYOcxucrCfbYz+wRljXyYGHDp38X9i2cWk9awocnEc+ZncYcTO3xa/3nv159jPx78=; TS011284b5=01df21a10a103568063454bdb0ab85a9301b289434eb5500d9e7577934b914e8f1b93266a91bd9b0a7e8332efad9430d8881a69a710999e122ec493f3405219bfed1559795; _sp_ses.a65f=*; _gat=1; _gat_UA-72554732-3=1; _sp_ses.6c1f=*'
        }
        let page = await tor.downloadUrlUsingTor(
          'sgxmas_file',
          Notice.url,
          headers,
          'GET',
          undefined,
          gfinalConfig.sgxmas.use_tor,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          true,
          undefined,
          log_tab + 1
        )
        Notice.label = Notice.filename
        let hashes = reg(`(?:hash=)(.*)`, `gm`, 'groups', Notice.url)
        let file_id
        if (hashes) file_id = hashes[0]
        else file_id = Notice.label.slice(-12)
        let filename = `${file_prefix}_${file_id}_${Notice.filename}.pdf`
        await writeBinaryFile(`${process.env.SGXMAS_EXPORTED_FILES_PATH}${filename}`, page.body)
        Notice.url = `<a href="${Notice.url}" target="_blank">Source</a>`
        Notice.filename = filename
        resolve(Notice)
        return
      } catch (err) {
        catchError(err, 'downloadPDFFileTBillsAuctions', true, 'general', log_tab + 4)
        reject(`downloadPDFFileTBillsAuctions: ${err.message}`)
      }
    })()
  })
}

//Savings Auction Notices
async function getSGXMASSavingsAuctionsUpdates(source, log_tab) {
  try {
    lg(`START - ${gFName(new Error())}`, log_tab, 'info', source)
    let Notices = await getSavingsAuctionsList(source, log_tab + 1)
    let Notices_files = await downloadAllPDFFilesSavingsAuctions(
      source,
      Notices,
      `SG_FI_GOV_SAVINGS`,
      log_tab + 1
    )
    lg(`END - ${gFName(new Error())}`, log_tab, 'info', source)
    return Notices_files
  } catch (err) {
    catchError(err, gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}

async function getSavingsAuctionsList(source, log_tab) {
  try {
    lg(`START - ${gFName(new Error())}`, log_tab, 'info', source)
    let page = await Faxios.down(
      {
        source,
        url: `https://www.mas.gov.sg/bonds-and-bills/auctions-and-issuance-calendar/previous-ssb-bonds-auction-announcements-and-results`,
        headers: SGX_MAS_SGSAuction_headers,
      },
      log_tab + 1
    )
    let P_tags = await scraping.getTagsFromPage(
      {
        body: page.data,
        target_block: '#_2022 > div:nth-child(1) > div:nth-child(1) > div:nth-child(2)',
        target_tags: 'p',
        tag_return_type: 'html',
        rows_max: 99999,
      },
      log_tab + 1
    )
    lg(`START - getSavingsAuctionDocsFromItemsList`, log_tab + 3)
    let Notices_files = await getSavingAuctionDocsFromItemsList(source, P_tags, log_tab + 3)
    lg(`END - getSavingsAuctionDocsFromItemsList`, log_tab + 3)
    Notices_files = await flatternSavingsAuctionDocs(Notices_files, log_tab + 2)
    lg(`END - ${gFName(new Error())}`, log_tab, 'info', source)
    return Notices_files
  } catch (err) {
    catchError(err, gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}

function flatternSavingsAuctionDocs(Notices_files, log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        lg(`START - flatternSavingsAuctionDocs`, log_tab + 1)
        let files_flat = []
        Object.keys(Notices_files).forEach(function (event_label) {
          Notices_files[event_label].forEach(function (one_file) {
            if (one_file.filename.length > 0) {
              files_flat.push({
                event: event_label,
                filename: one_file.filename,
                url: one_file.url,
              })
            }
          })
        })
        lg(`END - flatternSavingsAuctionDocs`, log_tab + 1)
        resolve(files_flat)
        return
      } catch (err) {
        catchError(err, 'flatternSavingsAuctionDocs', undefined, undefined, log_tab + 3)
        reject(`flatternSavingsAuctionDocs : ${err.message}`)
      }
    })()
  })
}

async function getSavingAuctionDocsFromItemsList(source, P_tags, log_tab) {
  try {
    let files = []
    let last_label
    const setFileIndex = (p_tag, $) => {
      last_label = $(p_tag)
        .text()
        .replace(/[^a-z|A-Z|0-9]/gm, `_`)
        .replace(/_+/gm, '_')
      files[last_label] = []
    }
    const addFiles = $ => {
      if ($('a').get().length > 0) {
        files[last_label].push({
          filename: $($('span').get()[0])
            .text()
            .replace(/[^a-z|A-Z|0-9]/gm, `_`)
            .replace(/_+/gm, '_'),
          url: `https://www.mas.gov.sg${$($('a').get()[0]).attr('href')}`,
        })
      }
    }

    for (const p_tag of P_tags) {
      let $ = cheerio.load(p_tag)
      const strongTags = await scraping.getOneTag('strong', p_tag, 'text', log_tab + 1, source)
      const aTags = await scraping.getOneTag('a', p_tag, 'text', log_tab + 1, source)
      if (strongTags.found && aTags.found) {
        setFileIndex(p_tag, $)
        addFiles($)
      } else {
        if (!aTags.found && strongTags.found && strongTags.content.length > 3) {
          setFileIndex(p_tag, $)
        } else {
          if (aTags.found) {
            addFiles($)
          }
        }
      }
    }
    return files
  } catch (err) {
    catchError(err, gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}

async function downloadAllPDFFilesSavingsAuctions(source, Notices, file_prefix, log_tab) {
  try {
    lg(`START - ${gFName(new Error())}`, log_tab, 'info', source)
    let chunks = arrayToChunks(Notices, gfinalConfig[source].chunck_size, log_tab + 1, source)
    let all_details = []
    for (let i = 0; i < chunks.length; i++) {
      if (i >= gfinalConfig[source].chunks_limit) {
        lg(`Chunk limit [ ${gfinalConfig[source].chunks_limit} ] reached !`, log_tab + 1, 'info', source)
        return all_details
      }
      lg(``, log_tab + 1, 'info', source)
      lg(`Process chunk = ${i} | remaining = ${chunks.length - (i + 1)}`, log_tab + 1, 'info', source)
      all_details = all_details.concat(
        await Promise.all(
          chunks[i].map(async Notice => {
            return await downloadPDFFileSavingsAuctions(source, Notice, file_prefix, undefined, log_tab + 2)
          })
        )
      )
      all_details = [].concat.apply([], all_details) //flattern the array
      await pleaseWait(gfinalConfig[source].delay_min, gfinalConfig[source].delay_max, log_tab, source)
    }
    lg(`END - ${gFName(new Error())}`, log_tab, 'info', source)
    return all_details
  } catch (err) {
    catchError(err, gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}

async function downloadPDFFileSavingsAuctions(source, Notice, file_prefix, headers, log_tab) {
  try {
    const file = await Faxios.down(
      {
        source,
        url: Notice.url,
        headers: gfinalConfig[source].pdfDownloadHeaders,
        responseType: 'arraybuffer',
      },
      log_tab + 1
    )
    Notice.label = Notice.filename
    let hashes = reg(`(?:hash=)(.*)`, `gm`, 'groups', Notice.url)
    let file_id
    if (hashes) file_id = hashes[0]
    else file_id = Notice.label.slice(-12)
    let filename = `${file_prefix}_${file_id}_${Notice.filename}.pdf`
    await writeBinaryFile(`${process.env.SGXMAS_EXPORTED_FILES_PATH}${filename}`, file.data)
    Notice.url = `<a href="${Notice.url}" target="_blank">Source</a>`
    Notice.filename = filename
    return Notice
  } catch (err) {
    catchError(err, gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}

//SGS auctions 2021
function getSGSAuctions_new_Updates(log_tab) {
  return new Promise(function getSGSAuctions_new_Updates(resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${gFName(new Error())}`, log_tab)
        let securities = await get_SGS_Bonds_Auctions_new_List2021(`sgxmas`, log_tab + 1)
        let all_details = await getAllMASBillsAuctionDetails(
          `sgxmas`,
          securities,
          `SG_FI_GOV_SGS_NEW`,
          log_tab + 1
        )
        lg(`END - ${gFName(new Error())}`, log_tab)
        resolve(all_details)
        return
      } catch (err) {
        catchError(err, gFName(new Error()), undefined, undefined, log_tab)
        reject(`${gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}
function get_SGS_Bonds_Auctions_new_List2021(source, log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${gFName(new Error())}`, log_tab)
        let json_results = await Ffetch.down({
          source: source,
          url: `https://www.mas.gov.sg/api/v1/bondsandbills/m/issuancecalendar?rows=200&filters=issue_type:%22B%22%20AND%20ann_date:[2021-01-01%20TO%202021-12-31]&sort=ann_date%20asc`,
          json: true,
        })
        lg(`Extracted ${json_results.result.records.length} SGS Bonds securities`, log_tab + 2)
        lg(`END - ${gFName(new Error())}`, log_tab)
        resolve(json_results.result.records)
        return
      } catch (err) {
        catchError(err, gFName(new Error()), undefined, undefined, log_tab)
        reject(`${gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

//MASBills Auction Notices
function getSGXMASMASBillsAuctionsUpdates(log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        lg(`START - getSGXMASMASBillsAuctionsUpdates`, log_tab)
        let securities = await getMASBillsAuctionsList(`sgxmas`, log_tab + 1)
        let all_details = await getAllMASBillsAuctionDetails(
          `sgxmas`,
          securities,
          'SG_FI_GOV_MASBILLS',
          log_tab + 1
        )
        lg(`END - getSGXMASMASBillsAuctionsUpdates`, log_tab + 1)
        resolve(all_details)
        return
      } catch (err) {
        catchError(err, 'getSGXMASMASBillsAuctionsUpdates', undefined, undefined, log_tab + 2)
        reject(`getSGXMASMASBillsAuctionsUpdates : ${err.message}`)
      }
    })()
  })
}

function getMASBillsAuctionsList(source, log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        lg(`START - getMASBillsAuctionsList`, log_tab + 1)
        let json_results = await Ffetch.down({
          source: source,
          url: `https://www.mas.gov.sg/api/v1/bondsandbills/m/mbillissuancecalendar?rows=200&filters=ann_date:[2021-12-27%20TO%202023-12-30]&sort=ann_date%20asc`,
          json: true,
        })
        lg(`Extracted ${json_results.result.records.length} MasBills securities`, log_tab + 2)
        lg(`END - getMASBillsAuctionsList`, log_tab + 1)
        resolve(json_results.result.records)
        return
      } catch (err) {
        catchError(err, 'getMASBillsAuctionsList', undefined, undefined, log_tab + 3)
        reject(`getMASBillsAuctionsList : ${err.message}`)
      }
    })()
  })
}

function getAllMASBillsAuctionDetails(source, securities, file_prefix, log_tab) {
  return new Promise(function (resolve, reject) {
    ;(async () => {
      try {
        lg(`START - getAllMASBillsAuctionDetails`, log_tab)
        let chunks = arrayToChunks(securities, gfinalConfig.sgxmas.chunck_size, 2)
        let all_details = []
        for (let i = 0; i < chunks.length; i++) {
          // if (i < 12) continue;
          if (i >= gfinalConfig.sgxmas.chunks_limit) {
            lg(`Chunk limit [ ${gfinalConfig.sgxmas.chunks_limit} ] reached !`, log_tab + 1)
            all_details = all_details.filter(row => row != null)
            resolve(all_details)
            return
          }
          lg(``)
          lg(`Process chunk = ${i} | remaining = ${chunks.length - (i + 1)}`, log_tab + 1)
          all_details = all_details.concat(
            await Promise.all(
              chunks[i].map(async security => {
                return await getOneMASBillsAuctionDetails(source, security, file_prefix, log_tab + 2)
              })
            )
          )
          all_details = [].concat.apply([], all_details) //flattern the array
          await pleaseWait(gfinalConfig.sgxmas.delay_min, gfinalConfig.sgxmas.delay_max, 2)
        }
        // Filter Null values corresponding to Table header Trs or Invalid dates
        all_details = all_details.filter(row => row != null)
        lg(`END - getAllMASBillsAuctionDetails`, log_tab)
        resolve(all_details)
        return
      } catch (err) {
        catchError(err, 'getAllMASBillsAuctionDetails', undefined, undefined, log_tab + 1)
        reject(`getAllMASBillsAuctionDetails: ${err.message}`)
      }
    })()
  })
}

function getOneMASBillsAuctionDetails(source, security, prefix, log_tab) {
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
        catchError(err, 'getOneMASBillsAuctionDetails', undefined, undefined, log_tab + 3)
        reject(`getOneMASBillsAuctionDetails : ${err.message}`)
      }
    })()
  })
}

//Not used Blocked by ReCaptcha
// function getSGExchangeBondsNewsUpdates(log_tab) {
//   return new Promise(function (resolve, reject) {
//     ;(async () => {
//       try {
//         lg(`START - getSGExchangeBondsNewsUpdates`, log_tab)
//         let Notices = await getAllNotices(log_tab + 1)
//         let articles = await getAllArticles(Notices, log_tab + 1)
//         lg(`END - getSGExchangeBondsNewsUpdates`, log_tab + 1)
//         resolve(articles)
//         return
//       } catch (err) {
//         catchError(err, 'getSGExchangeBondsNewsUpdates', undefined, undefined, log_tab + 2)
//         reject(`getSGExchangeBondsNewsUpdates : ${err.message}`)
//       }
//     })()
//   })
// }
//Not used Blocked by ReCaptcha
// function getAllNotices(period_start, period_end, log_tab) {
//   return new Promise(function (resolve, reject) {
//     ;(async () => {
//       try {
//         lg(`Extract All Notices`, log_tab + 1)
//         let all_data = new Array()
//         let end_reached = false
//         let page_id = 1
//         while (!end_reached) {
//           if (page_id > gfinalConfig.irelandbondsnews.maximum_pages) {
//             lg(`Max pages [ ${gfinalConfig.irelandbondsnews.maximum_pages} ] reached ! `, log_tab + 2)
//             lg(`Total Notices extracted= ${all_data.length}`, log_tab + 2)
//             resolve(all_data)
//             return
//           }
//           lg(`Get Ireland Notices from page : ${page_id}`, log_tab + 2)
//           let this_page_data = await getNoticesFromPage(page_id, log_tab + 3)
//           await pleaseWait(2, 2, log_tab + 3)
//           //Somehow the previous line returns an Object instead of array, so this line is necessary
//           lg(`[${this_page_data.length}] Notices in this page`, log_tab + 2)
//           if (this_page_data.length < 1) {
//             resolve(all_data)
//             return
//           }
//           if (this_page_data.length == 0) {
//             end_reached = true
//             lg(`END REACHED`, log_tab + 2)
//             lg(`Total Notices extracted= ${all_data.length}`, log_tab + 2)
//             resolve(all_data)
//             return
//           } else {
//             all_data = all_data.concat(this_page_data)
//             page_id++
//           }
//         }
//       } catch (err) {
//         catchError(err, 'getAllNotices', undefined, undefined, log_tab + 4)
//         reject(`getAllNotices: ${err.message}`)
//       }
//     })()
//   })
// }

//Not used Blocked by ReCaptcha
// function getNoticesFromPage(page_id, periodstart, periodend, size, log_tab) {
//   return new Promise(function (resolve, reject) {
//     ;(async () => {
//       try {
//         lg(`Extracting from Page [${page_id}]`, log_tab + 1)
//         let url = `https://www.sgx.com/securities/company-announcements?page=${page_id}&pagesize=${size}`
//         await Fpuppeteer.openBrowser(true, true, true, false, 1)
//         let waitforfunction = () => document.querySelectorAll('table.website-content-table tr').length >= 3
//         let SGX_extra_headers = {
//           'Accept-Language': 'en,en-US;q=0,5',
//           Accept: `*/*`,
//         }
//         let table_tag = await Fpuppeteer.getElementContent(
//           url,
//           '.website-content-table',
//           'outerHTML',
//           'singaporeexann',
//           waitforfunction,
//           false,
//           true,
//           SGX_extra_headers,
//           false,
//           log_tab + 1
//         )
//         console.log(table_tag)
//         let Trs = await scraping.getTrsFromPage(
//           table_tag,
//           'table',
//           sgx_tds,
//           10,
//           'html',
//           log_tab + 2
//         )
//         clg(Trs)

//         // await Fpuppeteer.closeBrowser(1);

//         // let all_notices = [];
//         // if (page_id == 1) {
//         //   all_notices = [...await getMainFeaturedNotice(page.body, log_tab + 2), ...await getSecondaryFeaturedNotice(page.body, log_tab + 2)];
//         // }
//         // all_notices = all_notices.concat(await getVerticalNotices(page.body, log_tab + 2));
//         resolve()
//         return
//       } catch (err) {
//         catchError(err, 'getNoticesFromPage', true, 'general', log_tab + 3)
//         reject(`getNoticesFromPage : ${err.message}`)
//       }
//     })()
//   })
// }
