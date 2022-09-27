import { lg, catchError, pleaseWait, AddEllipseToUrlsInArray, clearNewLines, arrayToChunks } from '../tools'
import { down } from '../Faxios'
import { getMultiTags } from '../scraping'

export async function getParaguayBondsUpdates(
  source: string,
  sourceConfig: sourceConfig,
  logTab: number
): Promise<ParaguayBond[]> {
  try {
    const issuers = await getAllIssuers(source, sourceConfig, logTab + 1)
    let bonds = await getAllIssuersBonds(source, issuers, sourceConfig, logTab + 1)
    const urlKeys = ['url', 'fileUrl']
    bonds = AddEllipseToUrlsInArray(source, bonds, urlKeys, logTab + 1)
    return bonds
  } catch (err) {
    catchError(err, `/getParaguayBondsUpdates`, undefined, undefined, logTab, source)
    throw new Error(err)
  }
}

export async function getAllIssuersBonds(
  source: string,
  issuers: ParaguayIssuer[],
  sourceConfig: sourceConfig,
  logTab: number
) {
  try {
    lg(`START - getAllIssuersBonds`, logTab, 'info', source)
    let chunks = arrayToChunks(issuers, sourceConfig.chunck_size, logTab + 1, source)
    let bonds: ParaguayBond[] = []
    for (let i = 0; i < chunks.length; i++) {
      if (i >= sourceConfig.chunks_limit) {
        lg(`Chunk limit [ ${sourceConfig.chunks_limit} ] reached !`, logTab + 1, 'info', source)
        return bonds
      }
      lg(``, logTab + 1, 'info', source)
      lg(`Process chunk = ${i} | remaining = ${chunks.length - (i + 1)}`, logTab + 1, 'info', source)
      bonds = bonds.concat(
        await Promise.all(
          chunks[i].map(async (issuer: ParaguayIssuer) => {
            return await getBondsForIssuer(source, issuer, logTab + 2)
          })
        )
      )
      bonds = [].concat.apply([], bonds) //flattern the array
      await pleaseWait(sourceConfig.delay_min, sourceConfig.delay_max, logTab, source)
    }
    lg(`END - getAllIssuersBonds`, logTab, 'info', source)
    return bonds
  } catch (err) {
    catchError(err, `/getAllIssuers`, undefined, undefined, logTab, source)
    throw new Error(err)
  }
}

export async function getAllIssuers(source: string, sourceConfig: sourceConfig, logTab: number) {
  try {
    let allData = new Array()
    let end_reached = false
    let pageId = 1
    while (!end_reached) {
      lg(`Get Issuers page : ${pageId}`, logTab + 1, 'info', source)
      let this_page_data = await getIssuersInPage(source, pageId, logTab + 1)
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
    catchError(err, `/getAllIssuers`, undefined, undefined, logTab, source)
    throw new Error(err)
  }
}

export async function getIssuersInPage(
  source: string,
  pageId: number,
  logTab: number
): Promise<ParaguayIssuer[]> {
  try {
    let URI = `https://www.bolsadevalores.com.py/listado-de-emisores?page=${pageId}`
    var response = await down(
      {
        id: 'getParaguayBondListInPage',
        source,
        url: URI,
      },
      logTab + 1
    )
    return await getIssuersFromTags(source, response.data, logTab + 1)
  } catch (err) {
    catchError(err, `/getIssuersInPage`, undefined, undefined, logTab, source)
    throw new Error(err)
  }
}

export async function getIssuersFromTags(
  source: string,
  pageHtml: string,
  logTab: number
): Promise<ParaguayIssuer[]> {
  try {
    const aTags = await getMultiTags('div.col-12.col-md-4 a', pageHtml, 'object', logTab + 1, source, 999)
    const $ = aTags.$
    const issuers = aTags.contents.map((aTag: any) => {
      return {
        label: clearNewLines($(aTag).text()),
        url: $(aTag).attr('href'),
      }
    })
    return issuers
  } catch (err) {
    catchError(err, `/getIssuersFromTags`, undefined, undefined, logTab, source)
    throw new Error(err)
  }
}

export async function getBondsForIssuer(
  source: string,
  issuer: ParaguayIssuer,
  logTab: number
): Promise<ParaguayBond[]> {
  try {
    var response = await down(
      {
        id: 'getBondsInPage',
        source,
        url: issuer.url,
      },
      logTab + 1
    )
    const aTags = await getMultiTags(
      'div.card.p-3.shadow-sm > a',
      response.data,
      'object',
      logTab + 1,
      source,
      9999
    )
    const $ = aTags.$
    const bonds = aTags.contents
      .map((aTag: any) => {
        return {
          ...issuer,
          title: clearNewLines($(aTag).text()),
          fileUrl: $(aTag).attr('href'),
        }
      })
      .filter(bond => bond.fileUrl.includes('.pdf'))
    return bonds
  } catch (err) {
    catchError(err, `/getBondsForIssuer`, undefined, undefined, logTab, source)
    throw new Error(err)
  }
}
