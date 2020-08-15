/** Network responses are untyped. Disable some linting rules to accomodate. */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import Candle from './candle'
import CandleProvider from './candle-provider'
import * as WebRequest from 'web-request'
import HttpResponseCode from './http-response-code'
import { Utils } from '@tacoinfra/harbinger-lib'

/** User agent for requests to the API. */
const USER_AGENT = 'harbinger-signer'

/** Granularity parameter for the Gemini API. */
const GRANULARITY = '1m'

/** Gemini REST API base URL */
const GEMINI_API_BASE_URL = 'https://api.gemini.com/'

/** Scale to report prices in. */
const SCALE = 6

/** Provides candles from the Gemini API. */
export default class GeminiCandleProvider implements CandleProvider {
  /**
   * Get a description of the CandleProvider's backing service.
   *
   * @returns A string describing where the candles are pulled from.
   */
  public getProviderName(): string {
    return GEMINI_API_BASE_URL
  }

  /**
   * Retrieves a candle from the Gemini API.
   *
   * @param assetName The assetName to retrieve. For instance, "XTZ-USD".
   */
  public async getCandle(assetName: string): Promise<Candle> {
    // Gemini ommits dashes in their API.
    const normalizedAssetName = assetName.replace('-', '')

    // Query the Gemini API.
    const requestPath = GeminiCandleProvider.makeRequestPath(
      normalizedAssetName,
    )
    const apiURL = GEMINI_API_BASE_URL + requestPath

    const response = await WebRequest.get(apiURL, {
      headers: {
        'User-Agent': USER_AGENT,
        accept: 'json',
      },
    })

    // Throw an error if API returned something other than a 200.
    if (response.statusCode !== HttpResponseCode.ok) {
      throw new Error(response.content)
    }

    // Coinbase returns an array of arrays. The outer array contains many candles and
    // the inner array is the data for each candle.
    const candles: Array<Array<number>> = JSON.parse(response.content)

    // Grab and destructure the first candle, which is the most recent.
    const [
      startTimestamp,
      open,
      high,
      low,
      close,
      volume,
    ] = candles[candles.length - 1]

    // Return the data formatted as an {@link Candle}.
    return {
      assetName,
      // Gemini uses milliseconds instead of microseconds.
      startTimestamp: Math.round(startTimestamp / 1000),
      endTimestamp: Math.round(startTimestamp / 1000) + 60,
      low: Utils.scale(low, SCALE),
      high: Utils.scale(high, SCALE),
      open: Utils.scale(open, SCALE),
      close: Utils.scale(close, SCALE),
      volume: Utils.scale(volume, SCALE),
    }
  }

  /**
   * Make an request path for the given asset in the Gemini API.
   *
   * @param assetName The assetName to retrieve. For instance, "BATUSDC".
   * @return The request path to hit.
   */
  private static makeRequestPath(assetName: string): string {
    return `/v2/candles/${assetName}/${GRANULARITY}`
  }
}
