/** Network responses are untyped. Disable some linting rules to accomodate. */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import Candle from './candle'
import CandleProvider from './candle-provider'
import * as WebRequest from 'web-request'
import HttpResponseCode from './http-response-code'
import { Utils } from '@tacoinfra/harbinger-lib'

/** User agent for requests to the API. */
const USER_AGENT = 'harbinger-signer'

/** Granularity parameter for the OKEx API. */
const GRANULARITY = '60'

/** OKEx REST API base URL */
const OKEX_API_BASE_URL = 'https://www.okex.com'

/** Scale to report prices in. */
const SCALE = 6

/** Provides candles from the OKEx API. */
export default class OkexCandleProvider implements CandleProvider {
  /**
   * Get a description of the CandleProvider's backing service.
   *
   * @returns A string describing where the candles are pulled from.
   */
  public getProviderName(): string {
    return OKEX_API_BASE_URL
  }

  /**
   * Retrieves a candle from the OKEx API.
   *
   * @param assetName The assetName to retrieve. For instance, "XTZ-USD".
   */
  public async getCandle(assetName: string): Promise<Candle> {
    // Query the Binance API.
    const requestPath = OkexCandleProvider.makeRequestPath(assetName)
    const apiURL = OKEX_API_BASE_URL + requestPath

    const response = await WebRequest.get(apiURL, {
      headers: {
        'User-Agent': USER_AGENT,
      },
    })

    // Throw an error if API returned something other than a 200.
    if (response.statusCode !== HttpResponseCode.ok) {
      throw new Error(response.content)
    }

    // OKEx returns an array of arrays. The outer array contains many candles and
    // the inner array is the data for each candle.
    const candles: Array<Array<string>> = JSON.parse(response.content)

    // Grab and destructure the first candle, which is the most recent.
    const [startTimeISO, open, high, low, close, volume] = candles[
      candles.length - 1
    ]

    // Timestamp is returned as an ISO string, parse it to a unix timestamp.
    const startTime = Date.parse(startTimeISO) / 1000
    const endTime = startTime + 60

    // Return the data formatted as an {@link Candle}.
    return {
      assetName,
      startTimestamp: startTime,
      endTimestamp: endTime,
      low: Utils.scale(parseFloat(low), SCALE),
      high: Utils.scale(parseFloat(high), SCALE),
      open: Utils.scale(parseFloat(open), SCALE),
      close: Utils.scale(parseFloat(close), SCALE),
      volume: Utils.scale(parseFloat(volume), SCALE),
    }
  }

  /**
   * Make an request path for the given asset in the OKEx API.
   *
   * @param assetName The assetName to retrieve. For instance, "BTC-USD".
   * @return The request path to hit.
   */
  private static makeRequestPath(assetName: string): string {
    return `/api/spot/v3/instruments/${assetName}/candles?granularity=${GRANULARITY}`
  }
}
