import moment from 'moment'
import _ from 'lodash'
import Ffetch from '../Ffetch'
import * as scraping from '../scraping'
import { lg, arrayToChunks, catchError, pleaseWait, getRandomInt } from '../tools'

export async function getMexicoCAEQUpdates(
  source: string,
  sourceConfig: MexicoEQCASourceConfig,
  logTab: number
): Promise<MexicoEQCANotice[]> {
  try {
    lg(`START - getMexicoEQCAUpdates`, logTab, 'info', source)
    const allCompanies = await getAllCompaniesTypes(source, sourceConfig, logTab + 1)
    let allNotices = await getNoticesForAllCompanies(source, allCompanies, sourceConfig, logTab + 1)
    allNotices = await addURLsTagsAndFormatDates(source, allNotices, logTab + 1)
    lg(`Extracted ${allNotices.length} securities SO from Mexico`, logTab + 1, 'info', source)
    return allNotices
  } catch (err) {
    catchError(err, 'getMexicoEQCAUpdates', undefined, undefined, logTab, source)
    throw new Error(err)
  }
}
export async function addURLsTagsAndFormatDates(
  source: string,
  all_data: MexicoEQCANotice[],
  logTab: number
) {
  try {
    all_data = all_data.map((row: MexicoEQCANotice) => {
      row.mainUrl = `<a href="${row.mainUrl}" target="_blank">mainUrl</a>`
      row.noticesUrl = `<a href="${row.noticesUrl}" target="_blank">noticesUrl</a>`
      row.time = moment(row.time, 'DD-MM-YYYY hh:mm').format('YYYYMMDD-hhmm')
      return row
    })
    return all_data
  } catch (err) {
    catchError(err, 'addURLsTags', undefined, undefined, logTab, source)
    throw new Error(err)
  }
}

export async function getAllCompaniesTypes(
  source: string,
  sourceConfig: MexicoEQCASourceConfig,
  logTab: number
): Promise<MexicoEQCANotice[]> {
  try {
    let allCompanies = await Promise.all(
      sourceConfig.secTypes.map(async (type: MexicoSOSecurityType) => {
        return await getOneCompaniesType(source, type, logTab + 1)
      })
    )
    const allCompaniesFlatterned = _.flatten(allCompanies)

    return allCompaniesFlatterned
  } catch (err) {
    catchError(err, 'getAllCompaniesTypes', undefined, undefined, logTab, source)
    throw new Error(err)
  }
}

export async function getOneCompaniesType(
  source: string,
  type: MexicoSOSecurityType,
  logTab: number
): Promise<MexicoEQCANotice[]> {
  try {
    let page = ``
    page = await Ffetch.down(
      {
        source,
        method: 'GET',
        url: `https://www.bmv.com.mx/es/Grupo_BMV/Informacion_de_emisora/_rid/541/_mto/3/_mod/doSearch?idTipoMercado=${
          type.idTipoMercado
        }&idTipoInstrumento=${
          type.idTipoInstrumento
        }&idTipoEmpresa=&idSector=&idSubsector=&idRamo=&idSubramo=&random=${getRandomInt(1000, 9999)}`,
        id: `getOneCompaniesType`,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:88.0) Gecko/20100101 Firefox/88.0',
          Accept: 'text/plain, */*; q=0.01',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        charset: 'ISO-8859-1',
      },
      logTab + 1
    )
    let secBloc = await scraping.getOneTag('body', page, 'text', logTab + 1, source)
    if (!secBloc.found) {
      lg(`Could not find companies body tag`, logTab + 1, 'warn', source)
      return []
    }
    secBloc.content = (secBloc.content as string).replace(`for(;;);(`, '').trim().slice(0, -1)
    let obj = JSON.parse(secBloc.content)
    let allCompanies = obj.response.resultado.map(
      (sec: { idEmisora: any; claveEmisora: any; claveEmision: any; razonSocial: any; isin: any }) => {
        // return sec
        return {
          ...type,
          idEmisora: sec.idEmisora,
          claveEmisora: sec.claveEmisora != null ? sec.claveEmisora : sec.claveEmision,
          razonSocial: sec.razonSocial,
          isin: sec.isin,
          mainUrl: `https://www.bmv.com.mx/es/emisoras/perfil/-${sec.idEmisora}`,
        }
      }
    )
    lg(`Extracted ${allCompanies.length} Companies`, logTab + 1, 'info', source)
    return allCompanies
  } catch (err) {
    catchError(err, 'getOneCompaniesType', undefined, undefined, logTab, source)
    throw new Error(err)
  }
}

export async function getNoticesForAllCompanies(
  source: string,
  allCompanies: MexicoEQCANotice[],
  sourceConfig: MexicoEQCASourceConfig,
  logTab: number
): Promise<MexicoEQCANotice[]> {
  try {
    lg(`START - getNoticesForAllCompanies`, logTab, 'info', source)
    let chunks = arrayToChunks(allCompanies, sourceConfig.chunck_size, logTab + 1, source)
    let all_data: MexicoEQCANotice[] = []
    for (let i = 0; i < chunks.length; i++) {
      if (i >= sourceConfig.chunks_limit) {
        lg(
          `getNoticesForAllCompanies : Chunk limit [ ${sourceConfig.chunks_limit} ] reached !`,
          logTab + 1,
          'info',
          source
        )
        all_data = _.flatten(all_data)
        return all_data
      }
      lg(``, logTab + 1, 'info', source)
      lg(
        `getNoticesForAllCompanies : Process chunk = ${i} | remaining = ${chunks.length - (i + 1)}`,
        logTab + 2,
        'info',
        source
      )
      all_data = all_data.concat(
        await Promise.all(
          chunks[i].map(async (company: MexicoEQCANotice) => {
            return await getNoticesForOneCompany(source, company, sourceConfig, logTab + 3)
          })
        )
      )
      await pleaseWait(sourceConfig.delay_min, sourceConfig.delay_max, logTab + 2, source)
    }
    all_data = _.flatten(all_data)
    return all_data
  } catch (err) {
    catchError(err, 'getNoticesForAllCompanies', undefined, undefined, logTab, source)
    throw new Error(err)
  }
}

export async function getNoticesForOneCompany(
  source: string,
  company: MexicoEQCANotice,
  sourceConfig: MexicoEQCASourceConfig,
  logTab: number
): Promise<MexicoEQCANotice[] | []> {
  try {
    let page = ``
    company.noticesUrl = `https://www.bmv.com.mx/en/issuers/corporativeinformation/${company.claveEmisora}-${company.idEmisora}-${company.idTipoMercado}`
    page = await Ffetch.down(
      {
        source,
        method: 'GET',
        url: company.noticesUrl,
        id: `getNoticesForOneCompany`,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:88.0) Gecko/20100101 Firefox/88.0',
          Accept: 'text/plain, */*; q=0.01',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        charset: 'ISO-8859-1',
      },
      logTab + 1
    )
    const liTags = await scraping.getMultiTags(
      '.accordion-area > li',
      page,
      'object',
      logTab + 1,
      source,
      999
    )
    if (liTags.found) {
      const noticesWithTitles = await Promise.all(
        liTags.contents.map(async listTag => {
          return exportNoticesFromListTag(source, company, listTag, liTags.$, sourceConfig, logTab + 1)
        })
      )
      const flatternedNotices = await flatternCompaniesNotices(source, company, noticesWithTitles, logTab)
      return flatternedNotices
    } else {
      lg(
        `Skipping, Empty notices for: ${company.razonSocial} - ${company.noticesUrl}`,
        logTab + 1,
        'warn',
        source
      )
      return []
    }
  } catch (err) {
    catchError(err, 'getNoticesForOneCompany', undefined, undefined, logTab, source)
    throw new Error(err)
  }
}

async function flatternCompaniesNotices(
  source: string,
  company: MexicoEQCANotice,
  noticesWithTitles: MexicoEQCASiteNoticesWithTitle[],
  logTab: number
) {
  try {
    const flatternedNotices = noticesWithTitles.map(titleNotices => {
      return titleNotices.notices.map(notice => {
        return { category: titleNotices.category, ...notice, ...company }
      })
    })
    return _.flatten(flatternedNotices)
  } catch (err) {
    catchError(err, 'flatternCompaniesNotices', undefined, undefined, logTab, source)
    throw new Error(err)
  }
}
async function exportNoticesFromListTag(
  source: string,
  company: MexicoEQCANotice,
  listTag: cheerio.Element,
  $: cheerio.Root,
  sourceConfig: MexicoEQCASourceConfig,
  logTab: number
): Promise<MexicoEQCASiteNoticesWithTitle> {
  try {
    const category = $(listTag).find('h2').text()
    const notices = await scraping.getTrsFromPage<MexicoEQCASiteNotice>(
      $(listTag).html(),
      'tbody > tr',
      sourceConfig.NoticesTargetTDs,
      2,
      'html',
      logTab + 1,
      true,
      source,
      `exportNoticesFromListTag - ${company.razonSocial} - ${company.noticesUrl}`
    )
    return {
      category,
      notices,
    }
  } catch (err) {
    catchError(err, 'exportNoticesFromListTag', undefined, undefined, logTab, source)
    throw new Error(err)
  }
}
