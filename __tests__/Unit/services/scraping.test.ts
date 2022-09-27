import { getAttrFromHTMLTag, getTextFromHTMLTag, getTrsFromPage } from '../../../src/services/scraping'

describe('getAttrFromHTMLTag', () => {
  it('Should extract the correct attribute value', async () => {
    const html =
      '<input type="text" id="searchstring" name="search" placeholder="Search.." oninput="filterSearch()">'
    const attr = await getAttrFromHTMLTag(
      {
        html,
        selector: 'input',
        attr: 'id',
      },
      1
    )
    expect(attr).toEqual('searchstring')
  })
  it('Should return undefined when attr does not exist', async () => {
    const html =
      '<input type="text" id="searchstring" name="search" placeholder="Search.." oninput="filterSearch()">'
    const attr = await getAttrFromHTMLTag(
      {
        html,
        selector: 'input',
        attr: 'unknown',
      },
      1
    )
    expect(attr).toBeUndefined()
  })
})

describe('getTextFromHTMLTag', () => {
  it('Should extract the correct text value', async () => {
    const html = '<h2>HTML Tags Ordered Alphabetically</h2>'
    const text = await getTextFromHTMLTag(
      {
        html,
        selector: 'h2',
      },
      1
    )
    expect(text).toEqual('HTML Tags Ordered Alphabetically')
  })
  it('Should return empty string when selector does not exist', async () => {
    const html = '<h2>HTML Tags Ordered Alphabetically</h2>'
    const text = await getTextFromHTMLTag(
      {
        html,
        selector: 'h3',
      },
      1
    )
    expect(text).toEqual('')
  })
})

describe('getTrsFromPage', () => {
  it('Should extract table rows correctly', async () => {
    const body =
      '<table> <tr> <th>Company</th> <th>Contact</th> <th>Country</th> </tr><tr> <td>Alfreds Futterkiste</td><td>Maria Anders</td><td>Germany</td></tr><tr> <td>Centro comercial Moctezuma</td><td>Francisco Chang</td><td>Mexico</td></tr></table>'
    const target_tds = [
      {
        id: 0,
        name: 'company',
      },
      {
        id: 1,
        name: 'contact',
      },
      {
        id: 2,
        name: 'country',
      },
    ]
    const rows = await getTrsFromPage(body, 'tr', target_tds, 99, 'text', 1, true, 'general', 'Jest')
    expect(rows).toEqual([
      { company: 'Alfreds Futterkiste', contact: 'Maria Anders', country: 'Germany' },
      { company: 'Centro comercial Moctezuma', contact: 'Francisco Chang', country: 'Mexico' },
    ])
  })
  it('Should return empty array when table tag is not found', async () => {
    const body =
      '<table class="table1"> <tr> <th>Company</th> <th>Contact</th> <th>Country</th> </tr><tr> <td>Alfreds Futterkiste</td><td>Maria Anders</td><td>Germany</td></tr><tr> <td>Centro comercial Moctezuma</td><td>Francisco Chang</td><td>Mexico</td></tr></table>'
    const target_tds = [
      {
        id: 0,
        name: 'company',
      },
      {
        id: 1,
        name: 'contact',
      },
      {
        id: 2,
        name: 'country',
      },
    ]
    const rows = await getTrsFromPage(
      body,
      'table.table1 > tr',
      target_tds,
      99,
      'text',
      1,
      true,
      'general',
      'Jest'
    )
    expect(rows).toEqual([])
  })
})
