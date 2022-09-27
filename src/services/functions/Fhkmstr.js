const tools = require(`../tools`)
//Simplify logging
const lg = tools.lg
// const XLSX = require("xlsx");

const Ffetch = require(`../Ffetch`)

const { clg, typeOf } = require(`../tools`)

module.exports = {
  getSecuritiesList,
  getAllSecurities,
}

// function getHKCMU(log_tab) {
//   return new Promise(function getTaiwanMSTRUpdates(resolve, reject) {
//     (async () => {
//       try {
//         lg(`START - ${tools.gFName(new Error())}`, log_tab);
//         let securities = await getSecuritiesList(`taiwanmstr`, log_tab + 1);
//         lg(`END - ${tools.gFName(new Error())}`, log_tab + 1);
//         resolve(securities);
//         return;
//       } catch (err) {
//         tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab);
//         reject(`${tools.gFName(new Error())} : ${err.message}`);
//       }
//     })();
//   });
// }

function getSecuritiesList(source, type, offset, log_tab) {
  return new Promise(function getSecuritiesList(resolve, reject) {
    ;(async () => {
      try {
        lg(`START - ${tools.gFName(new Error())}`, log_tab)
        offset = offset * gfinalConfig[source].pagesize
        let url
        process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0
        if (type === 'CMU Instruments')
          url = `https://api.hkma.gov.hk/public/debt-securities-settlement-system/operational-information/list-of-cmu-instruments?offset=${offset}&pagesize=${gfinalConfig[source].pagesize}&fields=isin,common_code,issue_number,issue_description,issue_ccy,issue_size,outstanding_amount,form,issuer,issue_date,maturity_date,coupon_rate,p_agent_code,call_put_option_date,last_coupon_date,next_coupon_date,int_pay_freq,tender_allowed,income_dist,repo_cat_hkd,repo_cat_usd,repo_cat_eur,repo_cat_cny_cb,repo_cat_cny_ma,bank_repo_cat,min_tradable_amount,multi_tradable_amount,special_action_date,special_action,fatca_withholding`
        if (type === 'Exchange Fund Bills and Notes')
          url = `https://api.hkma.gov.hk/public/debt-securities-settlement-system/operational-information/list-of-exchange-fund-bills-and-notes?offset=${offset}&pagesize=${gfinalConfig[source].pagesize}&fields=isin,common_code,issue_number,issue_description,issue_ccy,issue_size,outstanding_amount,form,issuer,issue_date,maturity_date,coupon_rate,p_agent_code,last_coupon_date,next_coupon_date,int_pay_freq,repo_cat_hkd,repo_cat_usd,repo_cat_eur,repo_cat_cny_cb,repo_cat_cny_ma,bank_repo_cat,min_tradable_amount,multi_tradable_amount`
        let securities = await Ffetch.down(
          {
            source: source,
            url: url,
            json: true,
          },
          log_tab + 1
        )
        process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 1
        securities = securities.result.records.map(sec => {
          let security = {}
          if (type === 'CMU Instruments') {
            security = {
              issue_number: sec.issue_number,
              issue_description: sec.issue_description,
              issuer: sec.issuer,
              paying_agent: sec.p_agent_code,
              issue_date: sec.issue_date,
              maturity_date: sec.maturity_date,
              call_put_option_date: sec.call_put_option_date,
              coupon_rate: sec.coupon_rate,
              last_coupon_date: sec.last_coupon_date,
              next_coupon_date: sec.next_coupon_date,
              int_pay_freq: sec.int_pay_freq,
              common_code: sec.common_code,
              isin: sec.isin,
              issue_ccy: sec.issue_ccy,
              issue_size: sec.issue_size,
              outstanding_amount: sec.outstanding_amount,
              tender_allowed: sec.tender_allowed,
              income_dist: sec.income_dist,
              repo_cat_hkd: sec.repo_cat_hkd,
              repo_cat_usd: sec.repo_cat_usd,
              repo_cat_eur: sec.repo_cat_eur,
              repo_cat_cny_cb: sec.repo_cat_cny_cb,
              repo_cat_cny_ma: sec.repo_cat_cny_ma,
              bank_repo_cat: sec.bank_repo_cat,
              min_tradable_amount: sec.min_tradable_amount,
              multi_tradable_amount: sec.multi_tradable_amount,
              special_action_date: sec.special_action_date,
              special_action: sec.special_action,
              fatca_withholding: sec.fatca_withholding,
              form: sec.form,
            }
          } else {
            security = {
              issue_number: sec.issue_number,
              issue_description: sec.issue_description,
              issuer: sec.issuer,
              paying_agent: sec.p_agent_code,
              issue_date: sec.issue_date,
              maturity_date: sec.maturity_date,
              coupon_rate: sec.coupon_rate,
              last_coupon_date: sec.last_coupon_date,
              next_coupon_date: sec.next_coupon_date,
              int_pay_freq: sec.int_pay_freq,
              common_code: sec.common_code,
              isin: sec.isin,
              issue_ccy: sec.issue_ccy,
              issue_size: sec.issue_size,
              outstanding_amount: sec.outstanding_amount,
              repo_cat_hkd: sec.repo_cat_hkd,
              repo_cat_usd: sec.repo_cat_usd,
              repo_cat_eur: sec.repo_cat_eur,
              repo_cat_cny_cb: sec.repo_cat_cny_cb,
              repo_cat_cny_ma: sec.repo_cat_cny_ma,
              bank_repo_cat: sec.bank_repo_cat,
              min_tradable_amount: sec.min_tradable_amount,
              multi_tradable_amount: sec.multi_tradable_amount,
              form: sec.form,
            }
          }
          return security
        })
        // .filter((sec) => !(sec.isin === null));
        lg(`END - ${tools.gFName(new Error())}`, log_tab)
        lg(`Extracted ${securities.length} Sec from this page`, log_tab + 2)
        resolve(securities)
        return
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}

function getAllSecurities(source, type, log_tab) {
  return new Promise(function getAllSecurities(resolve, reject) {
    ;(async () => {
      try {
        lg(`Extract Securities Type [${type}]`, log_tab + 1)
        let all_data = new Array()
        let end_reached = false
        let page_id = 0
        while (!end_reached) {
          if (page_id > gfinalConfig[source].maximum_pages) {
            lg(`Max pages [ ${gfinalConfig[source].maximum_pages} ] reached ! `, log_tab + 2)
            // all_data = [...new Map(all_data.map((item, key) => [item[key], item])).values()];
            // all_data = all_data.filter((v, i, a) => a.findIndex((t) => JSON.stringify(t) === JSON.stringify(v)) === i);
            // all_data = Array.from(new Set(all_data)); //Remove duplicates
            lg(`Total Securities extracted= ${all_data.length}`, log_tab + 3)
            resolve(all_data)
            return
          }
          lg(`Get Offset : ${page_id}`, log_tab + 2)
          let this_page_data = await getSecuritiesList(source, type, page_id, log_tab + 1)
          await tools.pleaseWait(gfinalConfig[source].delay_min, gfinalConfig[source].delay_max, log_tab + 3)
          //Somehow the previous line returns an Object instead of array, so this line is necessary
          // lg(`[${this_page_data.length}] News in this page`, log_tab + 2);
          // if (this_page_data.length < 1) {
          //   resolve(all_data);
          //   return;
          // }
          if (this_page_data.length < 1) {
            end_reached = true
            // all_data = Array.from(new Set(all_data)); //Remove duplicates
            lg(`END REACHED`, log_tab + 3)
            lg(`Total Securities extracted= ${all_data.length}`, log_tab + 3)
            resolve(all_data)
            return
          } else {
            all_data = all_data.concat(this_page_data)
            page_id++
          }
        }
      } catch (err) {
        tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab)
        reject(`${tools.gFName(new Error())} : ${err.message}`)
      }
    })()
  })
}
