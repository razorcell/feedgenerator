type sourceConfig = {
  maximum_pages?: number
  chunks_limit?: number
  chunck_size?: number
  delay_min?: number
  delay_max?: number
  tor_timeout?: number
  puppeteer_timeout?: number
  puppeteer_delay_min?: number
  puppeteer_delay_max?: number
  pupeteer_max_trials?: number
  tor_max_download_trials?: number
  use_tor?: number
  use_ediagadir_proxy?: number
  use_awsproxy?: number
  defheaders?: Record<string, string>
  sendFileEmails?: number
  sendFileEmailsToAddress?: string
}

type EuronextETFSourceConfig = sourceConfig & { EtfListSize?: number }

type TargetTableDivision = {
  id: number
  name: string
}

type MexicoSOSecType = {
  label: string
  idTipoMercado: string
  idTipoInstrumento: string
}

type MexicoSOSourceConfig = sourceConfig & {
  secTypes: MexicoSOSecurityType[]
  listingDateTargetTDs: TargetTableDivision[]
}
type MexicoSOSecurityType = {
  label: string
  idTipoMercado: string
  idTipoInstrumento: string
}
type MexicoSOSourceConfig = sourceConfig & { secTypes?: MexicoSOSecurityType[] }

type MexicoSOCompany = MexicoSOSecurityType & {
  idEmisora: number
  claveEmisora: string
  razonSocial: string
  idEmision: string | null
  isin: string | null
  mainUrl: string
  listingDate?: string
  seriesURL?: string
  detailsURL?: string
  so?: number | null
  FYE?: string
  parValueCurrency?: string
}

type MexicoEQCASourceConfig = sourceConfig & {
  secTypes: MexicoSOSecurityType[]
  NoticesTargetTDs: { id: number; name: keyof MexicoEQCASiteNotice }[]
}

type MexicoEQCANotice = MexicoSOSecurityType & {
  idEmisora: number
  claveEmisora: string
  razonSocial: string
  isin?: string | null
  mainUrl: string
  noticesUrl: string
} & MexicoEQCASiteNotice & {
    title?: string
  }

type MexicoEQCASiteNotice = {
  time?: string
  title?: string
}

type MexicoEQCASiteNoticesWithTitle = {
  category: string
  notices: MexicoEQCASiteNotice[]
}

type MexicoETFSourceConfig = sourceConfig & {
  listingDateTargetTDs: TargetTableDivision[]
}

type MexicoETFCompany = {
  idEmisora: number
  idTpEmpresa: number
  claveEmisora: string
  razonSocial: string
  razonComercial: string
  mainUrl: string
  listingDate?: string
  idEmision: string | null
  ticker: string
  seriesURL?: string
  detailsURL?: string
  so?: number | null
  FYE?: string
  parValueCurrency?: string
}

type MexicoREITSSourceConfig = MexicoETFSourceConfig

type MexicoREITSCompany = MexicoETFCompany

type ItalyBond = {
  isin: string
  label: string
}

type EuronextETF = {
  label?: string
  isin?: string
  url?: string
  market?: string
  market_symbol?: string
  symbol?: string
  orgLinkTag?: string
}

type ParaguayIssuer = {
  label: string
  url: string
}

type ParaguayBond = ParaguayIssuer & {
  title: string
  fileUrl: string
}

type SaudiMstrEqConfig = sourceConfig & {
  equityProfileTrs_target_tds?: { id: number; name: keyof SaudiShareCapital }[]
  equityProfileTrs2_target_tds?: { id: number; name: keyof SaudiShareParValue }[]
}

type SaudiSourceShare = {
  symbol: string
  lonaName: string
  shortName: string
  Acronym: string
  isinCode: string
  market: string
}

type SaudiShare = {
  issuerName?: string
  isin?: string
  localCode?: string
  market?: string
  listingDate?: string | moment.Moment
  FYE?: string
  parValue?: string
  currency?: string
  so?: string
  secDesc?: string
  profileUrl?: string
}

type SaudiShareCapital = {
  authCapital?: string
  issuedShares?: string
  paidCapital?: string
}

type SaudiShareParValue = {
  parValue?: string
  paidUpValue?: string
}

type ScrapingReturnType = 'text' | 'html' | 'object'
type ScrapingSingleResult = {
  found: boolean
  content: string | cheerio.Cheerio
  $: cheerio.Root
}

type ScrapingMultiResults = {
  found: boolean
  contents: string[] | cheerio.Element[]
  $: cheerio.Root
}

type ScrapingOneTagParams = { html: string; selector: string; attr: string }

type HeritageFeature = {
  type: 'Feature'
  properties: {
    title: string
    excerpt: string
    description: string
    pictures: string
    icon: {
      className: string
      iconSize: string | null
    }
  }
  geometry: {
    type: string
    coordinates: Array<number>
  }
  imageName?: string
}
