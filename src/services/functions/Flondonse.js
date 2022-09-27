const cheerio = require('cheerio')
const { catchError } = require(`../tools`)
const tor = require(`../tor`)
const tools = require(`../tools`)
const fileModule = require(`../file`)
const puppeteer = require('puppeteer')
const htmlDocx = require('html-docx-js-typescript')
const moment = require('moment')
const { exitOnError } = require('winston')

//Simplify logging
const lg = tools.lg

const { clg, typeOf } = require(`../tools`)

module.exports = {
  getAnnouncementsList,
  getArticleBody,
  getLondonSEUpdates,
  getAllArticles,
}

var LSE_headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:78.0) Gecko/20100101 Firefox/78.0',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.5',
  'Content-Type': 'application/json',
  Origin: 'https://www.londonstockexchange.com',
  Connection: 'keep-alive',
  //   Referer:
  //     "https://www.londonstockexchange.com/news?tab=news-explorer&headlinetypes=&excludeheadlines=&period=custom&beforedate=20200721&afterdate=20200719&headlines=,16,75,79",
}

function getLondonSEUpdates(datevalue) {
  return new Promise(function (resolve, reject) {
    (async () => {
      try {
        let browser = await puppeteer.launch({
          headless: true,
          // args: ['--no-sandbox', '--disable-setuid-sandbox'],
        })
        // let desired_date = moment().subtract(1, "days").format("YYYYMMDD");
        let desired_date = datevalue
        lg(`START Londonse: Get Updates for yesterday [${desired_date}]`, 0)
        let params = {
          headlines: `16,75,79`,
          beforedate: desired_date,
          afterdate: desired_date,
          size: `500`,
          page_id: `0`,
        }
        let announcements = await getAnnouncementsList(params)
        let articles = await getAllArticles(announcements, browser, desired_date)
        await browser.close()
        let RC_global_file = await generateGlobalFile(articles, 'RC', desired_date)
        let CON_global_file = await generateGlobalFile(articles, 'CON', desired_date)
        let CAN_global_file = await generateGlobalFile(articles, 'CAN', desired_date)
        articles = articles.map(article => {
          delete article.body
          return article
        })
        // articles.push(RC_global_file);
        articles.push(RC_global_file.docx)
        articles.push(RC_global_file.html)
        articles.push(CON_global_file.docx)
        articles.push(CON_global_file.html)
        articles.push(CAN_global_file.docx)
        articles.push(CAN_global_file.html)

        lg(`Londonse: Finished`, 0)
        resolve(articles)
        return
      } catch (err) {
        lg(`getLondonSEUpdates : ${err.message}`, 1, 'error')
        reject(`getLondonSEUpdates : ${err.message}`)
      }
    })()
  })
}

function generateGlobalFile(articles, type, desired_date) {
  return new Promise(function (resolve, reject) {
    (async () => {
      try {
        let HTML = ''
        let file_name_prefix = ''
        //GB_FI_FRN_Fixes_200707
        switch (type) {
          case 'RC':
            file_name_prefix = 'FRN_Fixes'
            break
          case 'CON':
            file_name_prefix = 'Conversion'
            break
          case 'CAN':
            file_name_prefix = 'Name_Change'
            break
        }
        let this_type_articles = []
        articles.map(article => {
          if (article.category === type) this_type_articles.push(article)
        })

        // console.log(this_type_articles);
        // return;
        if (this_type_articles.length == 0) {
          HTML += `<p style="text-align: center; font-size:17px"><b>London Stock Exchange</b></p>`
          HTML += `<p style="text-align: center">There is no articles type "${file_name_prefix}" available for ${desired_date}</p>`
        } else {
          this_type_articles.forEach(article => {
            HTML +=
              article.body +
              `<p style="text-align: center">-------------------------------------------------</p>`
          })
        }

        // if (Object.keys(this_type_articles).length == 0) {
        //   globalfile += `<h3>London Stock Exchange</h3>`;
        //   globalfile += `<p style="text-align: center">There is no articles type "${file_name_prefix}" available for ${desired_date}</p>`;
        // } else {
        //   Object.keys(this_type_articles).forEach((key) => {
        //     globalfile +=
        //       this_type_articles[key].body +
        //       `<p style="text-align: center">-------------------------------------------------</p>`;
        //   });
        // }

        // Object.keys(articles).forEach((key) => {
        //   if (articles[key].category === type) {
        //     globalfile =
        //       globalfile +
        //       articles[key].body +
        //       `<p style="text-align: center">-------------------------------------------------</p>`;
        //   }
        // });
        let WORD = await htmlDocx.asBlob(HTML) // asBlob() return Promise<Blob|Buffer>
        let size = tools.formatBytes(Buffer.byteLength(HTML, 'utf8'))
        desired_date = moment(desired_date, 'YYYYMMDD').format('YYMMDD')
        let filename_word = `GB_FI_${file_name_prefix}_${desired_date}_${size
          .replace(/\s/gm, `-`)
          .replace(`.`, `-`)}.docx`
        let filename_html = `GB_FI_${file_name_prefix}_${desired_date}_${size
          .replace(/\s/gm, `-`)
          .replace(`.`, `-`)}.html`
        await fileModule.writeToFile(`${process.env.LONDONSE_EXPORTED_FILES_PATH}${filename_word}`, WORD)
        await fileModule.writeToFile(`${process.env.LONDONSE_EXPORTED_FILES_PATH}${filename_html}`, HTML)
        resolve({
          docx: {
            date: desired_date,
            id: `ALL_WORD`,
            category: file_name_prefix,
            title: `ALL_WORD`,
            issuername: `ALL_WORD`,
            issuercode: `ALL_WORD`,
            companyname: `ALL_WORD`,
            companycode: `ALL_WORD`,
            filename: filename_word,
            size: size,
          },
          html: {
            date: desired_date,
            id: `ALL_HTML`,
            category: file_name_prefix,
            title: `ALL_HTML`,
            issuername: `ALL_HTML`,
            issuercode: `ALL_HTML`,
            companyname: `ALL_HTML`,
            companycode: `ALL_HTML`,
            filename: filename_html,
            size: size,
          },
        })
        return
      } catch (err) {
        // tools.catchError(err, "general", true, "error", 2);
        lg(`generateGlobalFile: ${err.message} Stack: ${err.stack}`, 4, 'error')
        reject(`generateGlobalFile: ${err.message}`)
      }
    })()
  })
}

function getAllArticles(announcements, browser, desired_date) {
  return new Promise(function (resolve, reject) {
    (async () => {
      try {
        let chunks = tools.arrayToChunks(announcements, gfinalConfig.londonse.chunck_size, 2)
        let all_details = []
        for (let i = 0; i < chunks.length; i++) {
          if (i >= gfinalConfig.londonse.chunks_limit) {
            lg(`Chunk limit [ ${gfinalConfig.londonse.chunks_limit} ] reached !`, 2)
            resolve(all_details)
            return
          }
          lg(``)
          lg(`Process chunk = ${i} | remaining = ${chunks.length - (i + 1)}`, 2)

          all_details = all_details.concat(
            await Promise.all(
              chunks[i].map(async announcement => {
                return await getArticleBody(announcement, browser, desired_date)
              })
            )
          )
          all_details = [].concat.apply([], all_details) //flattern the array
          await tools.pleaseWait(gfinalConfig.londonse.delay_min, gfinalConfig.londonse.delay_max, 2)
        }
        resolve(all_details)
        return
      } catch (err) {
        lg(`getAllArticles:  ${err.message}`, 2, 'error')
        reject(`getAllArticles: ${err.message}`)
      }
    })()
  })
}

function getAnnouncementsList(params) {
  return new Promise(function (resolve, reject) {
    (async () => {
      try {
        let json_object = {
          path: 'news',
          parameters: `tab=news-explorer&headlinetypes=&excludeheadlines=&period=custom&beforedate=${params.beforedate}&afterdate=${params.afterdate}&headlines=,${params.headlines}&tabId=58734a12-d97c-40cb-8047-df76e660f23f`,
          components: [
            {
              componentId: 'block_content%3A431d02ac-09b8-40c9-aba6-04a72a4f2e49',
              parameters: `headlines=${params.headlines}&period=custom&beforedate=${params.beforedate}&afterdate=${params.afterdate}&headlinetypes=&excludeheadlines=&page=${params.page_id}&size=${params.size}`,
            },
          ],
        }
        let response = await tor.downloadUrlUsingTor(
          'Londonse',
          `https://api.londonstockexchange.com/api/v1/components/refresh`,
          LSE_headers,
          'POST',
          undefined,
          false,
          undefined,
          JSON.stringify(json_object),
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          4
        )
        let data_json = JSON.parse(response.body)
        let announcements = data_json[0].content[1].value.content
        announcements = announcements.map(notice => {
          //Fix null issuer name
          if (notice.companyname === null) notice.companyname = notice.issuername
          if (notice.issuername === null) notice.issuername = notice.companyname
          return notice
        })
        lg(`Extracted ${announcements.length} Announcements`, 1)
        resolve(announcements)
        return
      } catch (err) {
        lg(`getAnnouncementsFromPage : ${err.message}`, 3, 'error')
        reject(`getAnnouncementsFromPage : ${err.message}`)
      }
    })()
  })
}

function getArticleBody(announcement, browser, desired_date) {
  return new Promise(function (resolve, reject) {
    (async () => {
      try {
        const page = await browser.newPage()
        let url = `https://www.londonstockexchange.com/news-article/${
          announcement.companycode === null ? `market-news` : announcement.companycode
        }/${announcement.title.replace(/\s/gm, `-`).toLowerCase().trim()}/${announcement.id}`
        let trial = 1
        let page_loaded = false
        while (!page_loaded) {
          try {
            if (trial > gfinalConfig.londonse.pupeteer_max_trials) {
              lg(`Chrome Maximum Trials [${gfinalConfig.londonse.pupeteer_max_trials}] exceeded`, 4)
              resolve({
                date: moment().format('YYYYMMDD'),
                id: announcement.id,
                category: announcement.category,
                title: announcement.title,
                issuername: announcement.issuername,
                issuercode: announcement.issuercode,
                companyname: announcement.companyname,
                companycode: announcement.companycode,
                filename: `#`,
                size: 'Page Load Error',
                body: '',
              })
              return
            }
            lg(`Trial [${trial}] Chrome Goto: ${url}`, 3)
            trial++
            await page.goto(url, {
              waitUntil: 'networkidle0',
              timeout: gfinalConfig.londonse.puppeteer_timeout,
            })

            lg('Page networkidle0');
            
            await page.waitForSelector('#news-article-content > div.news-article-content-wrapper > div.news-article-content-body', {
              visible: true,
            });
            lg('Page selector loaded');

            page_loaded = true
          } catch (err) {
            lg(`getArticleBody => LoadPage: ${err.message}`, 4, 'error')
            await tools.pleaseWait(gfinalConfig.londonse.delay_min, gfinalConfig.londonse.delay_max, 5)
          }
        }
        const content = await page.evaluateHandle(
          `document.querySelector("#news-article-content > div.news-article-content-wrapper > div.news-article-content-body").shadowRoot.querySelector("div")`
        )

        await tools.pleaseWait(9,9, 3)
        let article_body = await GetProperty(content, 'innerHTML')
        // clg(article_body.replace(/(\\n)+/g, ""));
        announcement.body = article_body
          .replace(/\r?\n|\r/g, '')
          .replace(/\/\*.*\*\//gs, '')
          .replace(/\.bwblockalignl.*<\/style>/gs, '')
          .replace(
            ///\.bwalignc \{ text-align: center; list-style-position:inside; \}/gs,
            /\.bwalignc \{.*\}/gs,
            ''
          )
          .replace(/<!--.*?-->/gs, '')
          .replace(/<img[^>]*>/g, '')
          .replace(/<meta[^>]*>/g, '')
          .replace(/<style[^>]*>/g, '')
          .replace(/¦/g, ' ')

        await page.close()
        let header = `
        <h3>${announcement.title}</h3>
        <h4>${announcement.companyname}</h4>
        <p>Released: ${announcement.datetime}<p>
        `
        let footer = `<br><p>Source: <a href="${url}">${url}</a></p>`
        announcement.body = header + announcement.body + footer

        let size = tools.formatBytes(Buffer.byteLength(announcement.body, 'utf8'))
        let filename = `${desired_date}_${announcement.title.replace(/\s/gm, `-`).toLowerCase().trim()}_${
          announcement.id
        }_${size.replace(/\s/gm, `-`).replace(`.`, `-`)}.html`
        await fileModule.writeToFile(
          `${process.env.LONDONSE_EXPORTED_FILES_PATH}${filename}`,
          announcement.body
        )

        // let data = await htmlDocx.asBlob(announcement.body); // asBlob() return Promise<Blob|Buffer>
        // let size = tools.formatBytes(
        //   Buffer.byteLength(announcement.body, "utf8")
        // );
        // let filename = `${desired_date}_${announcement.title
        //   .replace(/\s/gm, `-`)
        //   .toLowerCase()
        //   .trim()}_${announcement.id}_${size
        //   .replace(/\s/gm, `-`)
        //   .replace(`.`, `-`)}.docx`;
        // await fileModule.writeToFile(
        //   `${process.env.LONDONSE_EXPORTED_FILES_PATH}${filename}`,
        //   data
        // );
        resolve({
          date: desired_date,
          id: announcement.id,
          category: announcement.category,
          title: announcement.title,
          issuername: announcement.issuername,
          issuercode: announcement.issuercode,
          companyname: announcement.companyname,
          companycode: announcement.companycode,
          filename: filename,
          size: size,
          body: announcement.body,
        })
        return
      } catch (err) {
        tools.catchError(err, 'getArticleBody', true, 'general', 5)
        // lg(`getArticleBody: ${err.message} Stack: ${err.stack}`, 4, "error");
        reject(`getArticleBody: ${err.message}`)
      }
    })()
  })
}

function GetProperty(element, property) {
  return new Promise(function (resolve, reject) {
    (async () => {
      try {
        resolve(await (await element.getProperty(property)).jsonValue())
        return
      } catch (err) {
        lg(`GetProperty:  ${err.message}`, 2, 'error')
        reject(`GetProperty: ${err.message}`)
      }
    })()
  })
}
