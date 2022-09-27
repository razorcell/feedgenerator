import cheerio from 'cheerio'
const Entities = require('html-entities').XmlEntities
import { lg, gFName, catchError } from './tools'

/**
 * It takes a string of HTML, a selector, and an attribute, and returns the value of the attribute
 * @param params - {
 * @param [log_tab=1] - The number of tabs to add to the log.
 * @returns The value of the attribute of the first element that matches the selector.
 */
export async function getAttrFromHTMLTag(params: ScrapingOneTagParams, log_tab = 1) {
  try {
    const entities = new Entities()
    params.html = entities.decode(params.html)
    const $ = cheerio.load(params.html, null)
    return $($(params.selector).get()[0]).attr(params.attr)
  } catch (err) {
    catchError(err, 'getAttrFromHTMLTag', undefined, undefined, log_tab)
    throw new Error(err)
  }
}

/**
 * It takes a string of HTML, a selector, and returns the text of the first element that matches the
 * selector
 * @param params - {
 * @param [log_tab=1] - The number of tabs to add to the log.
 * @returns The text from the first element that matches the selector.
 */
export async function getTextFromHTMLTag(params, log_tab = 1) {
  try {
    const entities = new Entities()
    params.html = entities.decode(params.html)
    const $ = cheerio.load(params.html, null)
    return $($(params.selector).get()[0]).text()
  } catch (err) {
    catchError(err, gFName(new Error()), undefined, undefined, log_tab)
    throw new Error(err)
  }
}

/**
 * It takes a string of HTML, a selector for the rows, an array of objects with the column id and name,
 * and returns an array of objects with the column name and value
 * @param {string} body - the html body of the page
 * @param {string} trs_selector - The selector for the trs
 * @param {{ id: number; name: keyof T }[]} target_tds - { id: number; name: keyof T }[]
 * @param rows_max - The maximum number of rows to return.
 * @param [td_return_type=text] - 'text' or 'html'
 * @param [log_tab=1] - number = 1,
 * @param [decode_ent=false] - boolean = false,
 * @param [source=general] - the source of the data
 * @param [label=general] - string
 * @returns An array of objects.
 */
export async function getTrsFromPage<T extends Record<string, string>>(
  body: string,
  trs_selector: string,
  target_tds: { id: number; name: keyof T }[],
  rows_max = 9999999,
  td_return_type = 'text',
  log_tab = 1,
  decode_ent = false,
  source = 'general',
  label = 'general'
): Promise<Partial<T>[] | []> {
  try {
    const entities = new Entities()
    const $ = cheerio.load(body)
    let Trs = $(trs_selector).toArray()
    if (!Array.isArray(Trs) || Trs.length < 1) {
      lg(`No Trs founs in this selector [${trs_selector}] [${label}]`, log_tab + 1, 'warn', source)
      return []
    } else {
      lg(`[${Trs.length}] Trs found`, log_tab + 1, 'info', source)
      let Trs_Tds: Partial<T>[] = []
      Trs.map((this_tr, i) => {
        let tds = $(this_tr).find('td').toArray()
        if (!Array.isArray(tds) || tds.length == 0) {
          lg(`No Tds / inconsistent Tds found in Tr[${i}] [${label}]`, log_tab + 2, 'warn', source)
        } else {
          let row: Partial<T> = {}
          target_tds.map(column => {
            if (tds[column.id] != undefined) {
              if (td_return_type === 'text') {
                row[column.name] = $(tds[column.id])
                  .text()
                  .replace(/[\t|\n]+/g, '')
                  .trim() as T[keyof T]
                if (decode_ent) row[column.name] = entities.decode(row[column.name])
              }
              if (td_return_type === 'html') {
                row[column.name] = $(tds[column.id])
                  .html()
                  .replace(/[\t|\n]+/g, '')
                  .trim() as T[keyof T]
                if (decode_ent) row[column.name] = entities.decode(row[column.name])
              }
            } else {
              row[column.name] = `` as T[keyof T]
            }
          })
          Trs_Tds.push(row)
          return
        }
      })
      // if (all_return_type === 'noobject')
      Trs_Tds = Trs_Tds.slice(0, rows_max)
      lg(`Returing [${Trs_Tds.length}] Trs [${label}]`, log_tab + 1, 'info', source)
      return Trs_Tds.filter(row => row !== undefined)
    }
  } catch (err) {
    catchError(err, gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}

/**
 * It takes a page's HTML, a target block selector, a target tag selector, and returns an array of the
 * text or HTML of the target tags
 * @param params - {
 * @param [log_tab=1] - This is the number of tabs to be added to the log message.
 * @param [source=general] - The source of the request. This is used to identify the source of the
 * request in the logs.
 * @returns An array of strings
 */
export async function getTagsFromPage(params, log_tab = 1, source = 'general') {
  try {
    params = Object.assign(
      {},
      {
        tag_return_type: 'text',
        return_type: 'noobject',
        rows_max: 999999,
        label: 'general',
      },
      params
    )
    let { body, target_block, target_tags, tag_return_type, return_type, rows_max, label } = params
    const $ = cheerio.load(
      body
      // , {
      // decodeEntities: true,
      // normalizeWhitespace: true,
      // xmlMode: false
      // }
    )
    let target_blocks = $(target_block).toArray()
    if (!Array.isArray(target_blocks) || target_blocks.length < 1) {
      lg(`No blocks found for this selector[${target_block}] [${label}]`, log_tab + 2, 'warn', source)
      return []
    } else {
      lg(`[${target_blocks.length}] Blocks found`, log_tab + 3, 'info', source)
      let tags = target_blocks.map((this_block, i) => {
        let targeted_tags = $(this_block).find(target_tags).toArray()
        if (!Array.isArray(targeted_tags) || targeted_tags.length < 0) {
          lg(`No Target tags found in Block[${i}] [${label}]`, log_tab + 3, 'warn', source)
        } else {
          const row: string[] = targeted_tags.map(tag => {
            if (tag_return_type === 'text')
              return $(tag)
                .text()
                .replace(/[\t|\n]+/g, '')
                .trim()
            if (tag_return_type === 'html')
              return $(tag)
                .html()
                .replace(/[\t|\n]+/g, '')
                .trim()
          })
          return row
        }
      })
      if (return_type === 'noobject') tags = tags.slice(0, rows_max)
      lg(`Returing [${tags.length}] Tags [${label}]`, log_tab + 3, 'info', source)
      return [].concat.apply([], tags).filter(row => row !== undefined)
    }
  } catch (err) {
    catchError(err, gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}

/**
 * It takes a selector, a body, a type, a log_tab, and a source, and returns an object with a found
 * boolean, a content string, and a $ cheerio.Root
 * @param selector - The selector to find the tag.
 * @param body - the html body of the page
 * @param [type=text] - text, html, object
 * @param [log_tab=1] - The number of tabs to add to the log.
 * @param [source=general] - The source of the data, for example, the name of the website.
 * @returns An object with the following properties:
 * - found: boolean
 * - content: string | cheerio.Cheerio
 * - $: cheerio.Root
 */
export async function getOneTag(
  selector: string,
  body: string,
  type = 'text',
  log_tab = 1,
  source = 'general'
): Promise<ScrapingSingleResult> {
  try {
    let $ = cheerio.load(body)
    let tags = $(selector).toArray()
    let result: ScrapingSingleResult = {
      found: false,
      content: '',
      $: $,
    }
    if (!Array.isArray(tags) || tags.length == 0) {
      lg(`Could not find [${selector}] tag`, log_tab + 2, 'warn', source)
    } else {
      if (type === `text`) result.content = $(tags[0]).text().trim()
      if (type === `html`) result.content = $(tags[0]).html().trim()
      if (type === `object`) result.content = $(tags[0])
      result.found = true
    }
    return result
  } catch (err) {
    catchError(err, 'getOneTag', undefined, undefined, log_tab + 1, source)
    throw new Error(err)
  }
}

/**
 * It takes a selector, a body, a type, a log_tab, a source, and a limit, and returns a promise of a
 * scraping result
 * @param {string} selector - The selector to find the tag.
 * @param {string | Buffer} body - The HTML body of the page you want to scrape.
 * @param {ScrapingReturnType} [type=text] - ScrapingReturnType = 'text'
 * @param [log_tab=1] - number of tabs to add to the log
 * @param [source=general] - The source of the scraping, for logging purposes.
 * @param {number} limit - number
 * @returns An object with the following properties:
 * found: boolean
 * contents: string[]
 * $: CheerioStatic
 */
export async function getMultiTags(
  selector: string,
  body: string | Buffer,
  type: ScrapingReturnType = 'text',
  log_tab = 1,
  source = 'general',
  limit: number
): Promise<ScrapingMultiResults> {
  try {
    // clg(body)
    let $ = cheerio.load(body, {
      decodeEntities: true,
      normalizeWhitespace: true,
      xmlMode: false,
    })
    let tags = $(selector).toArray()
    let result: ScrapingMultiResults = {
      found: false,
      contents: [],
      $: $,
    }
    if (!Array.isArray(tags) || tags.length == 0) {
      lg(`Could not find any [${selector}] tag`, log_tab + 2, 'warn', source)
    } else {
      if (limit != undefined) {
        tags = tags.slice(0, limit)
      }
      if (type === `text`)
        result.contents = tags.map(tag => {
          return $(tag).text().trim()
        })
      if (type === `html`)
        result.contents = tags.map(tag => {
          return $(tag).html().trim()
        })
      // if (type === `html`) result.contents = $(tags[0]).html().trim();
      if (type === `object`) result.contents = tags
      result.found = true
    }
    return result
  } catch (err) {
    catchError(err, gFName(new Error()), undefined, undefined, log_tab)
    throw new Error(err)
  }
}
