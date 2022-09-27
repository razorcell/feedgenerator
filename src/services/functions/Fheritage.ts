import {
  lg,
  catchError,
  pleaseWait,
  AddEllipseToUrlsInArray,
  clearNewLines,
  arrayToChunks,
  geoJSONData,
  clg,
  writeBinaryFile,
} from '../tools'
import { down } from '../Faxios'
import { getMultiTags } from '../scraping'
import { sanitize } from 'sanitize-filename-ts'

export async function downloadAllFeatures(
  source: string,
  features: HeritageFeature[],
  sourceConfig: sourceConfig,
  logTab: number
) {
  try {
    lg(`START - downloadAllFeatures`, logTab, 'info', source)
    let chunks = arrayToChunks(features, sourceConfig.chunck_size, logTab + 1, source)
    let allFeatures: HeritageFeature[] = []
    for (let i = 0; i < chunks.length; i++) {
      if (i >= sourceConfig.chunks_limit) {
        lg(`Chunk limit [ ${sourceConfig.chunks_limit} ] reached !`, logTab + 1, 'info', source)
        return allFeatures
      }
      lg(``, logTab + 1, 'info', source)
      lg(`Process chunk = ${i} | remaining = ${chunks.length - (i + 1)}`, logTab + 1, 'info', source)
      allFeatures = allFeatures.concat(
        await Promise.all(
          chunks[i].map(async (feature: HeritageFeature) => {
            return await downloadFeature(source, feature, logTab + 2)
          })
        )
      )
      allFeatures = [].concat.apply([], allFeatures) //flattern the array
      await pleaseWait(sourceConfig.delay_min, sourceConfig.delay_max, logTab, source)
    }
    lg(`END - downloadAllFeatures`, logTab, 'info', source)
    return allFeatures
  } catch (err) {
    catchError(err, `/downloadAllFeatures`, undefined, undefined, logTab, source)
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

export async function downloadFeature(
  source: string,
  feature: HeritageFeature,
  logTab: number
): Promise<any[]> {
  try {
    const aTags = await getMultiTags('a', feature.properties.pictures, 'object', logTab + 1, source, 2)
    const $ = aTags.$
    const pictures = await Promise.all(
      aTags.contents.map(async (tag: any) => {
        const url = $(tag).attr('href')
        clg(url)
        var response = await down(
          {
            id: 'downloadPicture',
            source,
            url,
            responseType: 'arraybuffer',
          },
          logTab + 1
        )
        return {
          imageName: response.headers['x-file-name'],
          attribs: $(tag).attr(),
          binary: response.data,
        }
      })
    )
    for (const picture of pictures) {
      await writeBinaryFile(
        `${process.env.DOWNLOADS_PATH}${picture.imageName}`,
        picture.binary,
        'binary',
        logTab + 1,
        source
      )
    }
    return pictures
  } catch (err) {
    catchError(err, `/downloadFeature`, undefined, undefined, logTab, source)
    throw new Error(err)
  }
}
