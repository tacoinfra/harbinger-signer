import Candle from './candle';
import CandleProvider from './candle-provider'
import * as WebRequest from 'web-request'
import HttpResponseCode from './http-response-code'
import promiseRetry from 'promise-retry'
import crypto = require('crypto')
import { Utils } from 'tezos-oracle-lib'

/** User agent for requests to the API. */
const USER_AGENT = 'tezos-oracle'

/** Granularity parameter for the Binance API. */
const GRANULARITY = '1m'

/** Coinbase REST API base URL */
const BINANCE_API_BASE_URL = 'https://api.binance.com'

/** Scale to report prices in. */
const SCALE = 6

/** Provides candles from the Binance API. */
export default class BinanceCandleProvider implements CandleProvider {
    /**
     * Construct a new BinanceCandleProvider.
     */
    public constructor() { }

    /**
     * Get a description of the CandleProvider's backing service.
     *
     * @returns A string describing where the candles are pulled from.
     */
    public getProviderName(): string {
        return BINANCE_API_BASE_URL
    }

    /**
     * Retrieves a candle from the Binance API.
     * 
     * @param assetName The assetName to retrieve. For instance, "XTZ-USD".
     */
    public async getCandle(assetName: string): Promise<Candle> {
        // Binance ommits dashes in their API.
        const normalizedAssetName = assetName.replace("-", "")

        // Query the Binance API.
        const requestPath = BinanceCandleProvider.makeRequestPath(normalizedAssetName)
        const apiURL = BINANCE_API_BASE_URL + requestPath
        
        const response = await WebRequest.get(apiURL, {
            headers: {
                'User-Agent': USER_AGENT,
                'accept': 'json'
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
        const [startTimestamp, open, high, low, close, volume, endTimestamp] = candles[candles.length - 1]

        // Return the data formatted as an {@link Candle}.      
        return {
            assetName,
            // Binance uses milliseconds instead of microseconds.
            startTimestamp: Math.round(startTimestamp / 1000),
            endTimestamp: Math.round(endTimestamp / 1000),
            low: Utils.scale(low, SCALE),
            high: Utils.scale(high, SCALE),
            open: Utils.scale(open, SCALE),
            close: Utils.scale(close, SCALE),
            volume: Utils.scale(volume, SCALE)
        }
    }

    /**
     * Make an request path for the given asset in the Binance API.
     * 
     * @param assetName The assetName to retrieve. For instance, "BATUSDC".
     * @return The request path to hit.
     */
    private static makeRequestPath(assetName: string): string {
        return `/api/v3/klines?symbol=${assetName}&interval=${GRANULARITY}`
    }
}