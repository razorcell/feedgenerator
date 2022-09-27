import { lg, gFName, arrayToChunks, catchError, pleaseWait, URLToEllipse } from '../tools'
import Ffetch from '../Ffetch'
import { getTagsFromPage, getTrsFromPage } from '../scraping'
import _ from 'lodash'
import moment from 'moment'

export async function getSaudiMSTREqUpdates(source: string, sourceConfig: SaudiMstrEqConfig, logTab: number) {
  try {
    lg(`START - /getSaudiMSTREqUpdates}`, logTab, 'info', source)
    let securities = await getSecuritiesList(source, logTab + 1)
    let securitiesDetails = await getAllProfilesDetails(source, sourceConfig, securities, logTab + 1)
    securitiesDetails = await reOrder(source, securitiesDetails, logTab + 1)
    lg(`END - ${gFName(new Error())}`, logTab, 'info', source)
    return securitiesDetails
  } catch (err) {
    catchError(err, `/getSaudiMSTREqUpdates`, undefined, undefined, logTab, source)
    throw new Error(err)
  }
}

export async function reOrder(source, data, logTab) {
  try {
    lg(`START - /reOrder}`, logTab, 'info', source)

    data = data.map(sec => {
      return {
        issuerName: sec.lonaName,
        isin: sec.isinCode,
        localCode: sec.symbol,
        market: sec.market,
        listingDate: sec.listingDate,
        FYE: sec.FYE,
        parValue: sec.parValue,
        currency: sec.currency,
        so: sec.so,
        secDesc: sec.secDesc,
        profileUrl: sec.profileUrl,
      }
    })
    lg(`END - /reOrder}`, logTab, 'info', source)
    return data
  } catch (err) {
    catchError(err, gFName(new Error()), undefined, undefined, logTab, source)
    throw new Error(err)
  }
}

export async function getSecuritiesList(source: string, logTab: number): Promise<SaudiSourceShare[]> {
  try {
    lg(`START - getSecuritiesList}`, logTab, 'info', source)
    //MAIN MARKET
    let mainMarket = (
      await Ffetch.down(
        {
          id: source,
          source: source,
          url: 'https://www.saudiexchange.sa/wps/portal/tadawul/market-participants/issuers/issuers-directory/!ut/p/z1/04_Sj9CPykssy0xPLMnMz0vMAfIjo8zi_Tx8nD0MLIy8DTyMXAwczVy9vV2cTY0MnEz1w8EKjIycLQwtTQx8DHzMDYEK3A08A31NjA0CjfWjSNLv7ulnbuAY6OgR5hYWYgzUQpl-AxPi9BvgAI4GhPVHgZXgCwFUBVi8iFcByA9gBXgcWZAbGhoaYZDpma6oCABqndOv/p0/IZ7_NHLCH082KOAG20A6BDUU6K3082=CZ6_NHLCH082K0H2D0A6EKKDC520B5=N/?sectorID=All&_=1651535253787',
          json: true,
        },
        logTab + 1
      )
    ).data
    //NOMU - PARALLEL MARKET
    let nomuParallelMarket = (
      await Ffetch.down(
        {
          id: source,
          source: source,
          url: 'https://www.saudiexchange.sa/wps/portal/tadawul/market-participants/issuers/issuers-directory/!ut/p/z1/04_Sj9CPykssy0xPLMnMz0vMAfIjo8zi_Tx8nD0MLIy8DTyMXAwczVy9vV2cTY0MnEz1w8EKjIycLQwtTQx8DHzMDYEK3A08A31NjA0CjfWjSNLv7ulnbuAY6OgR5hYWYgzUQpl-AxPi9BvgAI4GhPVHgZXgCwFUBVi8iFcByA9gBXgcGZyap1-QGxoaGmGQ6anrqAgAvYWDeQ!!/p0/IZ7_NHLCH082KOAG20A6BDUU6K3082=CZ6_NHLCH082K0H2D0A6EKKDC520B5=NEtabID!companyListSME==/?sectorID=All&_=1652360956575',
          json: true,
        },
        logTab + 1
      )
    ).data

    mainMarket = mainMarket.map((sec: SaudiSourceShare) => {
      delete sec.shortName
      delete sec.Acronym
      sec.market = 'Tadawul'
      return sec
    })

    nomuParallelMarket = nomuParallelMarket.map((sec: SaudiSourceShare) => {
      delete sec.shortName
      delete sec.Acronym
      sec.market = 'Nomu - Parallel Market'
      return sec
    })

    const allSecurities = _.merge(mainMarket, nomuParallelMarket)

    lg(`Extracted ${allSecurities.length} Shares`, logTab + 1, 'info', source)
    return allSecurities
  } catch (err) {
    catchError(err, gFName(new Error()), undefined, undefined, logTab, source)
    throw new Error(err)
  }
}

export async function getAllProfilesDetails(
  source: string,
  sourceConfig: SaudiMstrEqConfig,
  securities: SaudiSourceShare[],
  logTab: number
): Promise<SaudiShare[]> {
  try {
    lg(`START - getAllProfilesDetails`, logTab, 'info', source)
    let chunks = arrayToChunks(securities, sourceConfig.chunck_size, logTab + 1, source)
    let shares: SaudiShare[] = []
    for (let i = 0; i < chunks.length; i++) {
      if (i >= sourceConfig.chunks_limit) {
        lg(`Chunk limit [ ${sourceConfig.chunks_limit} ] reached !`, logTab + 1, 'info', source)
        shares = shares.filter(row => row != null)
        return shares
      }
      lg(``, logTab + 1, 'info', source)
      lg(`Process chunk = ${i} | remaining = ${chunks.length - (i + 1)}`, logTab + 1, 'info', source)
      shares = shares.concat(
        await Promise.all(
          chunks[i].map(async (security: SaudiSourceShare) => {
            return await getOneSecurityProfileDetails(source, sourceConfig, security, logTab + 2)
          })
        )
      )
      shares = [].concat.apply([], shares) //flattern the array
      await pleaseWait(sourceConfig.delay_min, sourceConfig.delay_max, logTab, source)
    }
    shares = shares.filter(row => row != null)
    lg(`END - getAllProfilesDetails`, logTab, 'info', source)
    return shares
  } catch (err) {
    catchError(err, '/getAllProfilesDetails', undefined, undefined, logTab, source)
    throw new Error(err)
  }
}

export async function getOneSecurityProfileDetails(
  source: string,
  sourceConfig: SaudiMstrEqConfig,
  sourceSecurity: SaudiSourceShare,
  logTab: number
) {
  try {
    let security: SaudiShare = { ...sourceSecurity }
    security.market = sourceSecurity.market
    security.secDesc = 'Ordinary shares'
    security.profileUrl = `https://www.saudiexchange.sa/wps/portal/tadawul/market-participants/issuers/issuers-directory/company-details/!ut/p/z1/pdFLb4JQEAXg3-KC9T0OoOiOggUKkqCieDfmWg3S8Fqgjf--18fGxKLG2U3yncWZYZwljJfikKWiyapS5HJf8t4qdAPLhUG-M5qpMHv22JqEHgFgizMgsozuQEOAoN-VwIEXjTUVkcr4S3nHC_swI9Odf84lNei9PLTn8vhnTDzO81sCl2xJRr5vWzrhQ7-CthPdgjs3aAWnkmfQ0uKL8TSv1peP7pqmHipQ0IiN-N3nimz5XRW1KI_TY7GuJCLSwKbbktVFHMcJMu9Hzw9pp_MHKq3lqA!!/p0/IZ7_NHLCH082KGET30A6DMCRNI2086=CZ6_NHLCH082KGET30A6DMCRNI2000=N/?tabID=profileTab&symbol=${sourceSecurity.symbol}`
    let response = await Ffetch.down(
      {
        id: sourceSecurity.shortName,
        source: source,
        url: security.profileUrl,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:86.0) Gecko/20100101 Firefox/86.0',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Upgrade-Insecure-Requests': '1',
          Pragma: 'no-cache',
          'Cache-Control': 'no-cache',
        },
        savetofile: true,
      },
      logTab + 1
    )

    security.profileUrl = URLToEllipse(security.profileUrl)

    let equityProfileTheads = await getTagsFromPage(
      {
        body: response,
        target_block: 'table.gen_table:nth-child(2) > thead:nth-child(1)',
        target_tags: 'th',
      },
      logTab + 1,
      source
    )
    if (!equityProfileTheads.length) {
      lg(`Inconsistent equityProfileTheads, Url: [${security.profileUrl}]`, logTab + 1, 'warn', source)
      security.currency = ''
    } else {
      const regex = /(?:\()(?<currency>.*)(?:\))/
      for (const label of equityProfileTheads) {
        const currencySearch = label.match(regex)
        if (currencySearch.length > 1) {
          security.currency = currencySearch[1].replace('null', '')
          break
        }
      }
      if (!security.currency) {
        lg(`Could not find currency, Url: [${security.profileUrl}]`, logTab + 1, 'warn', source)
      }
    }

    let equityProfileTrs = await getTrsFromPage<SaudiShareCapital>(
      response,
      `table.gen_table:nth-child(2) tr`,
      sourceConfig.equityProfileTrs_target_tds,
      3,
      'text',
      logTab + 1,
      true,
      source,
      'equityProfileTrs'
    )
    if (!equityProfileTrs.length) {
      lg(`Inconsistent equityProfileTrs, Url: [${security.profileUrl}]`, logTab + 1, 'warn', source)
      security.so = ''
    } else {
      security.so = equityProfileTrs.shift().issuedShares.replace(/,|-/g, '')
      security.so = security.so === '0' ? '' : security.so
    }

    let equityProfileTrs2 = await getTrsFromPage(
      response,
      `table.gen_table:nth-child(3) tr`,
      sourceConfig.equityProfileTrs2_target_tds,
      3,
      'text',
      logTab + 1,
      true,
      source,
      'equityProfileTrs2'
    )

    if (!equityProfileTrs2.length) {
      lg(`Inconsistent equityProfileTrs2, Url: [${security.profileUrl}]`, logTab + 1, 'warn', source)
      security.parValue = ''
    } else {
      security.parValue = equityProfileTrs2.shift().parValue.replace('-', '')
    }

    let extraDetails = await getTagsFromPage(
      {
        body: response,
        target_block: 'div.col:nth-child(3)',
        target_tags: 'p',
      },
      logTab + 1,
      source
    )

    if (extraDetails.length != 6) {
      lg(`Inconsistent extraDetails, Url: [${security.profileUrl}]`, logTab + 1, 'warn', source)
      security.FYE = ''
      security.listingDate = ''
    } else {
      security.FYE = extraDetails[1].replace(/-/g, '')
      security.listingDate = moment(extraDetails[2], 'YYYY/MM/DD', true)
      if (!security.listingDate.isValid()) {
        security.listingDate = ''
      } else {
        security.listingDate = security.listingDate.format('DD/MM/YYYY')
      }
    }

    return security
  } catch (err) {
    catchError(err, gFName(new Error()), undefined, undefined, logTab, source)
    throw new Error(err)
  }
}
