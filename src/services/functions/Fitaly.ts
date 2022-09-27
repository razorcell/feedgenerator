import { lg, catchError } from '../tools'
import cheerio from 'cheerio'
import { down } from '../Faxios'

export async function getItalyBonds(source, logTab) {
  try {
    lg(`START - getItalyBonds`, logTab, 'info', source)
    let all_data = new Array()
    let end_reached = false
    let pageId = 1
    while (!end_reached) {
      lg(`Get Italy bonds page : ${pageId}`, logTab + 1, 'info', source)
      let italyBonds = await getItalyBondsInPage(source, pageId, logTab + 1)
      //Somehow the previous line returns an Object instead of array, so this line is necessary
      lg(`[${italyBonds.length}] Bonds in this page`, logTab + 1, 'info', source)
      if (italyBonds.length < 1) {
        end_reached = true
        lg(`END REACHED`, logTab + 1, 'info', source)
        lg(`Total rows extracted=${italyBonds.length}`, logTab + 1, 'info', source)
        return all_data
      } else {
        all_data = all_data.concat(italyBonds)
        pageId++
      }
    }
  } catch (err) {
    catchError(err, 'getTaiwanMSTRUpdates', undefined, undefined, logTab, source)
    throw new Error(err)
  }
}

export async function getItalyBondsInPage(
  source: string,
  pageId: string | number,
  logTab: number
): Promise<ItalyBond[]> {
  try {
    lg(`START - getItalyBondsInPage`, logTab, 'info', source)
    let size = 2000
    let URI = `https://www.borsaitaliana.it/borsa/obbligazioni/advanced-search.html?page=${pageId}&size=${size}&lang=it`
    // var response = await tor.downloadUrlUsingTor('Italy', URI, undefined, undefined, undefined, false)
    // file.writeToFile("downloads/test.html", response.body);
    const response = await down(
      {
        id: `getItalyBondsInPage[${pageId}]`,
        source,
        url: URI,
      },
      logTab + 1
    )
    const $ = cheerio.load(response.data)
    let trs_ignore_first_two = $('table.m-table > tbody > tr').get().slice(2)
    let filter = new RegExp('[\\t\\n\\r\\f\\v]', 'gm')
    let isinRegex = new RegExp('([A-Z]{2})([A-Z0-9]{9,11})', 'gm')
    let isin_label_array = $(trs_ignore_first_two).map((i, tr) => {
      let isin: string = $(tr).find('td:nth-child(1) a span').text().replace(filter, '').match(isinRegex)[0]
      let label: string = $(tr).find('td:nth-child(2) span').text().replace(filter, '')
      return {
        isin: isin,
        label: label,
      }
    })
    return isin_label_array.get()
  } catch (err) {
    catchError(err, 'getItalyBondsInPage', undefined, undefined, logTab, source)
    throw new Error(err)
  }
}
