const Faxios = require(`../Faxios`)
const tools = require(`../tools`)
const { clg, typeOf } = require(`../tools`)
const lg = tools.lg

// var headers = {
//   Connection: 'keep-alive',
//   Accept: 'application/json, text/javascript, */*; q=0.01',
//   // Origin: 'https://servicios.mae.com.ar',
//   // 'User-Agent':
//   //   'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.130 Safari/537.36',
//   // 'Content-Type': 'application/json; charset=UTF-8',
//   // 'Sec-Fetch-Site': 'same-origin',
//   // 'Sec-Fetch-Mode': 'cors',
//   // 'Accept-Encoding': 'gzip, deflate, br',
//   // 'Accept-Language': 'en-US,en;q=0.9',
//   // Cookie: 'ASP.NET_SessionId=ema2paudrkzdawllmnvwwghr; CultureName=en-US; COD_AGENTE=; ROL_AGENTE=',
// }

module.exports = {
  getMaeUpdates,
  getBondsList,
}

async function getMaeUpdates(source, log_tab) {
  try {
    lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
    let on_bonds = await getBondsList('ON', source, log_tab + 1) // returns Array
    let tp_bonds = await getBondsList('TP', source, log_tab + 1) // returns Array
    let all_bonds = on_bonds.concat(tp_bonds)
    lg(`Extracted  ${all_bonds.length} Bonds`, log_tab + 1, 'info', source)
    let new_table = all_bonds.map(elem => {
      return {
        ESTADO: elem.ESTADO,
        CODIGO: elem.CODIGO,
        TITLE: elem.TITLE,
        EMISORES: elem.EMISORES,
        ESPECIES: elem.ESPECIES,
        FALTA: elem.FALTA,
        FVTO: elem.FVTO,
        URL: `<a href="https://servicios.mae.com.ar/legales/emisiones/${elem.URL}" target="_blank">Link</a>`,
      }
    })
    lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
    return new_table
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}

async function getBondsList(type = 'ON', source, log_tab) {
  try {
    let url = ''
    var raw_body = {
      cabecera: {
        Estado: '',
        Titulo: '',
        Emisores: '',
        FechaAlta: '',
        FechaVto: '',
        currentLanguage: 'es-AR',
      },
    }
    lg(`Type = ${type}`, log_tab + 1, 'info', source)
    if (type == 'ON') {
      url = 'https://servicios.mae.com.ar/Services/LegalesService.asmx/GetEmisionesON'
    } else if (type == 'TP') {
      url = 'https://servicios.mae.com.ar/Services/LegalesService.asmx/GetEmisionesTP'
    }

    let response = await Faxios.down(
      {
        id: `getBondsList-${type}`,
        source,
        url,
        method: 'POST',
        // headers,// Axios will add JSON headers
        data: raw_body,
      },
      log_tab + 1
    )
    let obj = JSON.parse(response.data.d)
    lg(`Extracted  ${obj.Data.length} Securities`, log_tab + 1, 'info', source)
    return obj.Data
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}
