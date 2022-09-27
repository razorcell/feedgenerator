import { lg, catchError, pleaseWait, URLToEllipse } from '../tools'
import cheerio from 'cheerio'
import { down } from '../Faxios'

export async function getEuronextETFs(
  source: string,
  sourceConfig: EuronextETFSourceConfig,
  logTab: number
): Promise<EuronextETF[]> {
  try {
    return await getAllSecurities(source, sourceConfig, logTab + 1)
  } catch (err) {
    catchError(err, 'getEuronextETFs', undefined, undefined, logTab, source)
    throw new Error(err)
  }
}

export async function getAllSecurities(
  source: string,
  sourceConfig: EuronextETFSourceConfig,
  logTab: number
) {
  try {
    let allData = new Array()
    let end_reached = false
    let pageId = 0
    while (!end_reached) {
      lg(`Get Euronext ETFs page : ${pageId}`, logTab + 1, 'info', source)
      let this_page_data = await getEuronextEtfListInPage(source, pageId, sourceConfig, logTab + 1)
      allData = allData.concat(this_page_data)
      lg(`[${this_page_data.length}] Securities in this page`, logTab + 1, 'info', source)
      pageId++
      if (this_page_data.length < 1 || pageId >= sourceConfig.maximum_pages) {
        end_reached = true
        lg(`END REACHED`, logTab + 1, 'info', source)
        break
      }
      await pleaseWait(sourceConfig.delay_min, sourceConfig.delay_max, logTab + 2, source)
    }

    return allData
  } catch (err) {
    catchError(err, 'getAllSecurities', undefined, undefined, logTab, source)
    throw new Error(err)
  }
}

export async function extractSecuritiesFromTags(
  source: string,
  securities: string[],
  logTab: number
): Promise<EuronextETF[]> {
  try {
    let securitiesJSON = []
    securities.forEach(sec => {
      let security: EuronextETF = {}
      let $ = cheerio.load(sec[0])
      security.isin = sec[1]
      security.label = $('a').text().trim()
      security.symbol = sec[2]
      security.url = URLToEllipse(`https://live.euronext.com${$('a').attr('href')}`)
      $ = cheerio.load(sec[3])
      security.market = $('div').attr('title')
      security.market_symbol = $('div').text().trim()
      securitiesJSON.push(security)
    })
    return securitiesJSON
  } catch (err) {
    catchError(err, 'extractSecuritiesFromTags', undefined, undefined, logTab, source)
    throw new Error(err)
  }
}

export async function getEuronextEtfListInPage(
  source: string,
  pageId: number,
  sourceConfig: EuronextETFSourceConfig,
  logTab: number
): Promise<EuronextETF[]> {
  try {
    let size = sourceConfig.EtfListSize
    pageId = pageId * size
    let URI = `https://live.euronext.com/en/pd/data/track?mics=XAMS%2CXBRU%2CXLIS%2CXPAR%2CXLDN%2CXMSM%2CXOSL&display_datapoints=dp_track&display_filters=df_track`
    var dataString = `draw=3&columns%5B0%5D%5Bdata%5D=0&columns%5B0%5D%5Bname%5D=&columns%5B0%5D%5Bsearchable%5D=true&columns%5B0%5D%5Borderable%5D=true&columns%5B0%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B0%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B1%5D%5Bdata%5D=1&columns%5B1%5D%5Bname%5D=&columns%5B1%5D%5Bsearchable%5D=true&columns%5B1%5D%5Borderable%5D=false&columns%5B1%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B1%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B2%5D%5Bdata%5D=2&columns%5B2%5D%5Bname%5D=&columns%5B2%5D%5Bsearchable%5D=true&columns%5B2%5D%5Borderable%5D=false&columns%5B2%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B2%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B3%5D%5Bdata%5D=3&columns%5B3%5D%5Bname%5D=&columns%5B3%5D%5Bsearchable%5D=true&columns%5B3%5D%5Borderable%5D=false&columns%5B3%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B3%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B4%5D%5Bdata%5D=4&columns%5B4%5D%5Bname%5D=&columns%5B4%5D%5Bsearchable%5D=true&columns%5B4%5D%5Borderable%5D=false&columns%5B4%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B4%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B5%5D%5Bdata%5D=5&columns%5B5%5D%5Bname%5D=&columns%5B5%5D%5Bsearchable%5D=true&columns%5B5%5D%5Borderable%5D=false&columns%5B5%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B5%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B6%5D%5Bdata%5D=6&columns%5B6%5D%5Bname%5D=&columns%5B6%5D%5Bsearchable%5D=true&columns%5B6%5D%5Borderable%5D=false&columns%5B6%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B6%5D%5Bsearch%5D%5Bregex%5D=false&order%5B0%5D%5Bcolumn%5D=0&order%5B0%5D%5Bdir%5D=asc&start=20&length=20&search%5Bvalue%5D=&search%5Bregex%5D=false&args%5BinitialLetter%5D=&iDisplayLength=${size}&iDisplayStart=${pageId}&sSortDir_0=asc`
    var response = await down(
      {
        id: 'getEuronextEtfListInPage',
        source,
        url: URI,
        method: 'POST',
        data: dataString,
        responseType: 'json',
      },
      logTab + 1
    )
    return await extractSecuritiesFromTags(source, response.data.aaData, logTab + 1)
  } catch (err) {
    catchError(err, 'getEuronextEtfListInPage', undefined, undefined, logTab, source)
    throw new Error(err)
  }
}
