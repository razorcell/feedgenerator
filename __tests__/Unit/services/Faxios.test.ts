import Faxios from '../../../src/services/Faxios'
import { initGlobalFinalConfig } from '../../../src/services/tools'

beforeAll(() => {
  initGlobalFinalConfig()
  require('dotenv-safe').config({
    allowEmptyValues: true,
    example: __dirname + '/../../../.env',
  })
})

describe('Faxios without proxy', () => {
  it('Should download example.com with correct status code and length', async () => {
    const response = await Faxios.down(
      {
        url: 'http://example.com',
      },
      1
    )
    expect(response.status).toEqual(200)
    expect(response.headers['content-length']).toEqual('1256')
  })
})

describe('Faxios using proxy', () => {
  it('Should download using TOR', async () => {
    const response = await Faxios.down(
      {
        url: 'https://example.com',
        use_tor: 1,
      },
      1
    )
    expect(response.status).toEqual(200)
    expect(response.headers['content-length']).toEqual('1256')
  })

  it('Should download using AWS', async () => {
    const response = await Faxios.down(
      {
        url: 'https://example.com',
        use_awsproxy: 1,
      },
      1
    )
    expect(response.status).toEqual(200)
    expect(response.headers['content-length']).toEqual('1256')
  })

  it('Should download using ADSL proxy', async () => {
    const response = await Faxios.down(
      {
        url: 'https://example.com',
        use_ediagadir_proxy: 1,
      },
      1
    )
    expect(response.status).toEqual(200)
    expect(response.headers['content-length']).toEqual('1256')
  })
})
