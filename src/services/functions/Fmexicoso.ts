import moment from 'moment'
import _ from 'lodash'
import Ffetch from '../Ffetch'
import * as scraping from '../scraping'
import { lg, arrayToChunks, catchError, pleaseWait, getRandomInt } from '../tools'

export async function getMexicoSOUpdates(source: string, sourceConfig: MexicoSOSourceConfig, logTab: number) {
  try {
    lg(`START - getMexicoSOUpdates`, logTab, 'info', source)
    let allData = []
    let allCompanies = await getAllCompaniesTypes(source, sourceConfig, logTab + 1)
    allCompanies = await getListingDateForAllCompanies(source, allCompanies, sourceConfig, logTab + 1)
    let allSecurities = await getAllSecurities(source, allCompanies, sourceConfig, logTab + 1)
    allData = await getAllSecuritiesDetails(source, allSecurities, sourceConfig, logTab + 1)
    allData = await addURLsTags(source, allData, logTab + 1)
    allData = await addDefaults(source, allData, logTab + 1)
    lg(`Extracted ${allData.length} securities SO from Mexico`, logTab + 1, 'info', source)
    return allData
  } catch (err) {
    catchError(err, 'getMexicoSOUpdates', undefined, undefined, logTab, source)
    throw new Error(err)
  }
}

export async function addDefaults(source: string, all_data: MexicoSOCompany[], logTab: number) {
  try {
    all_data = all_data.map((row: MexicoSOCompany) => {
      row.FYE = `31/12`
      row.parValueCurrency = `MXN`
      return row
    })
    return all_data
  } catch (err) {
    catchError(err, 'addURLsTags', undefined, undefined, logTab, source)
    throw new Error(err)
  }
}

export async function addURLsTags(source: string, all_data: MexicoSOCompany[], logTab: number) {
  try {
    all_data = all_data.map((row: MexicoSOCompany) => {
      row.mainUrl = `<a href="${row.mainUrl}" target="_blank">mainUrl</a>`
      row.seriesURL = `<a href="${row.seriesURL}" target="_blank">seriesURL</a>`
      row.detailsURL = `<a href="${row.detailsURL}" target="_blank">detailsURL</a>`
      return row
    })
    return all_data
  } catch (err) {
    catchError(err, 'addURLsTags', undefined, undefined, logTab, source)
    throw new Error(err)
  }
}
export async function getAllSecuritiesDetails(
  source: string,
  allSecurities: MexicoSOCompany[],
  sourceConfig: MexicoSOSourceConfig,
  logTab: number
): Promise<MexicoSOCompany[]> {
  try {
    lg(`START - getAllSecuritiesDetails`, logTab, 'info', source)
    let chunks = arrayToChunks(allSecurities, sourceConfig.chunck_size, logTab + 1, source)
    let all_data: MexicoSOCompany[] = []
    for (let i = 0; i < chunks.length; i++) {
      if (i >= sourceConfig.chunks_limit) {
        lg(
          `getAllSecuritiesDetails : Chunk limit [ ${sourceConfig.chunks_limit} ] reached !`,
          logTab + 1,
          'info',
          source
        )
        all_data = _.flatten(all_data) //flattern array
        return all_data
      }
      lg(``, logTab + 1, 'info', source)
      lg(
        `getAllSecuritiesDetails : Process chunk = ${i} | remaining = ${chunks.length - (i + 1)}`,
        logTab + 2,
        'info',
        source
      )
      all_data = all_data.concat(
        await Promise.all(
          chunks[i].map(async (security: MexicoSOCompany) => {
            return await getOneSecurityDetails(source, security, logTab + 3)
          })
        )
      )
      await pleaseWait(sourceConfig.delay_min, sourceConfig.delay_max, logTab + 2, source)
    }
    all_data = _.flatten(all_data) //flattern array
    return all_data
  } catch (err) {
    catchError(err, 'getAllSecuritiesDetails', undefined, undefined, logTab, source)
    throw new Error(err)
  }
}

export async function getOneSecurityDetails(
  source: string,
  security: MexicoSOCompany,
  logTab: number
): Promise<MexicoSOCompany> {
  try {
    security.detailsURL = `https://www.bmv.com.mx/es/Grupo_BMV/BmvJsonGeneric?idSitioPagina=1&bandera=2&idEmisora=${security.idEmisora}&idEmision=${security.idEmision}`
    let page = await Ffetch.down(
      {
        source,
        method: 'GET',
        url: security.detailsURL,
        id: security.razonSocial,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:88.0) Gecko/20100101 Firefox/88.0',
          Accept: 'text/plain, */*; q=0.01',
          'Accept-Language': 'en-US,en;q=0.5',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        savetofile: false,
      },
      logTab + 1
    )
    let secBloc = await scraping.getOneTag('body', page, 'text', logTab + 1, source)
    if (!secBloc.found) {
      lg(`Could not find details body tag`, logTab + 1, 'warn', source)
      security.so = null
    }
    secBloc.content = (secBloc.content as string).replace(`for(;;);(`, '').trim().slice(0, -1)
    let obj = JSON.parse(secBloc.content)
    let SO = obj.response.resultadoIndicadores.accionesCirculacion
    SO = SO ? SO : null
    security.so = SO
    return security
  } catch (err) {
    catchError(err, 'getOneSecurityDetails', undefined, undefined, logTab, source)
    throw new Error(err)
  }
}

export async function getAllSecurities(
  source: string,
  allCompanies: MexicoSOCompany[],
  sourceConfig,
  logTab: number
): Promise<MexicoSOCompany[]> {
  try {
    lg(`START - getAllSecurities`, logTab, 'info', source)
    let chunks = arrayToChunks(allCompanies, sourceConfig.chunck_size, logTab + 1, source)
    let all_data = []
    for (let i = 0; i < chunks.length; i++) {
      if (i >= sourceConfig.chunks_limit) {
        lg(
          `getAllSecurities : Chunk limit [ ${sourceConfig.chunks_limit} ] reached !`,
          logTab + 1,
          'info',
          source
        )
        lg(`END - getAllSecurities`, logTab + 1, 'info', source)
        all_data = [].concat.apply([], all_data) //flattern array
        return all_data
      }
      lg(``, logTab + 1, 'info', source)
      lg(
        `getAllSecurities : Process chunk = ${i} | remaining = ${chunks.length - (i + 1)}`,
        logTab + 2,
        'info',
        source
      )
      all_data = all_data.concat(
        await Promise.all(
          chunks[i].map(async (company: MexicoSOCompany) => {
            return await getAllSecuritiesForOneCompany(source, company, logTab + 3)
          })
        )
      )
      await pleaseWait(sourceConfig.delay_min, sourceConfig.delay_max, logTab + 2, source)
    }
    all_data = [].concat.apply([], all_data) //flattern array
    return all_data
  } catch (err) {
    catchError(err, 'getAllSecurities', undefined, undefined, logTab, source)
    throw new Error(err)
  }
}

export async function getAllSecuritiesForOneCompany(
  source: string,
  company: MexicoSOCompany,
  logTab: number
): Promise<MexicoSOCompany[]> {
  try {
    company.seriesURL = `https://www.bmv.com.mx/es/emisoras/estadisticas/${company.claveEmisora}-${company.idEmisora}`
    let page = ``
    page = await Ffetch.down(
      {
        source,
        method: 'GET',
        url: company.seriesURL,
        id: company.razonSocial,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:88.0) Gecko/20100101 Firefox/88.0',
          Accept: 'text/plain, */*; q=0.01',
          'Accept-Language': 'en-US,en;q=0.5',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest',
        },
        savetofile: false,
      },
      logTab + 1
    )
    let seriesInputs = await scraping.getMultiTags(
      '#cboSeries > ul:nth-child(2) > li > input',
      page,
      'object',
      logTab + 1,
      source,
      99
    )
    if (!seriesInputs.found) {
      lg(`Could not find any series for this company`, logTab + 1, 'warn', source)
      return []
    }
    lg(
      `${seriesInputs.contents.length - 1} Serie(s) found for ${company.razonSocial}`,
      logTab + 1,
      'info',
      source
    )
    let $ = seriesInputs.$
    let seriesWithCompany = seriesInputs.contents
      .map((input: any) => $(input).attr('value'))
      .filter(serie => serie.length > 0)
      .map(serie => {
        // company.idEmision = serie
        return { ...company, idEmision: serie }
      })
    return seriesWithCompany
  } catch (err) {
    catchError(err, 'getAllSecuritiesForOneCompany', undefined, undefined, logTab, source)
    throw new Error(err)
  }
}

export async function getAllCompaniesTypes(
  source: string,
  sourceConfig: MexicoSOSourceConfig,
  logTab: number
): Promise<MexicoSOCompany[]> {
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
): Promise<MexicoSOCompany[]> {
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
      (sec: {
        idEmisora: any
        claveEmisora: any
        claveEmision: any
        razonSocial: any
        idEmision: any
        isin: any
      }) => {
        // return sec
        return {
          ...type,
          idEmisora: sec.idEmisora,
          claveEmisora: sec.claveEmisora != null ? sec.claveEmisora : sec.claveEmision,
          razonSocial: sec.razonSocial,
          idEmision: sec.idEmision,
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

export async function getListingDateForAllCompanies(
  source: string,
  allCompanies: MexicoSOCompany[],
  sourceConfig: MexicoSOSourceConfig,
  logTab: number
) {
  try {
    lg(`START - getListingDateForAllCompanies`, logTab, 'info', source)
    let chunks = arrayToChunks(allCompanies, sourceConfig.chunck_size, logTab + 1, source)
    let all_data = []
    for (let i = 0; i < chunks.length; i++) {
      if (i >= sourceConfig.chunks_limit) {
        lg(
          `getListingDateForAllCompanies : Chunk limit [ ${sourceConfig.chunks_limit} ] reached !`,
          logTab + 1,
          'info',
          source
        )
        all_data = [].concat.apply([], all_data) //flattern array
        return all_data
      }
      lg(``, logTab + 1, 'info', source)
      lg(
        `getListingDateForAllCompanies : Process chunk = ${i} | remaining = ${chunks.length - (i + 1)}`,
        logTab + 2,
        'info',
        source
      )
      all_data = all_data.concat(
        await Promise.all(
          chunks[i].map(async (company: MexicoSOCompany) => {
            return await getListingDateForOneCompany(source, company, sourceConfig, logTab + 3)
          })
        )
      )
      await pleaseWait(sourceConfig.delay_min, sourceConfig.delay_max, logTab + 2, source)
    }
    all_data = [].concat.apply([], all_data) //flattern array
    return all_data
  } catch (err) {
    catchError(err, 'getListingDateForAllCompanies', undefined, undefined, logTab, source)
    throw new Error(err)
  }
}

export async function getListingDateForOneCompany(
  source: string,
  company: MexicoSOCompany,
  sourceConfig: MexicoSOSourceConfig,
  logTab: number
) {
  try {
    let page = ``
    page = await Ffetch.down(
      {
        source,
        method: 'GET',
        url: company.mainUrl,
        id: `getListingDateForOneCompany`,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:88.0) Gecko/20100101 Firefox/88.0',
          Accept: 'text/plain, */*; q=0.01',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        charset: 'ISO-8859-1',
      },
      logTab + 1
    )
    let trs = await scraping.getTrsFromPage(
      page,
      'table.info:nth-child(2) > tbody:nth-child(1) > tr',
      sourceConfig.listingDateTargetTDs,
      999,
      'text',
      logTab + 1,
      true,
      source,
      'getListingDateForOneCompany'
    )
    const listingDate = trs
      .filter((tr: { label: string; value: string }) => tr.label === 'Fecha de listado en BMV:')
      .shift()
    if (listingDate) {
      const formattedListingDate = moment(listingDate.value, 'DD-MMM-YYYY').format('DD/MM/YYYY')
      return { ...company, listingDate: formattedListingDate }
    } else {
      return { ...company, listingDate: '' }
    }
  } catch (err) {
    catchError(err, 'getOneCompaniesType', undefined, undefined, logTab, source)
    throw new Error(err)
  }
}
