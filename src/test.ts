import KrakenCandleProvider from './kraken-candle-provider'

const a = () => {
  const prov = new KrakenCandleProvider().getCandle('xtzusd')
  console.log(prov)
}

a()
