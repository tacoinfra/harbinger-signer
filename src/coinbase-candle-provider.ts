import Candle from './candle';
import CandleProvider from './candle-provider'
import * as WebRequest from 'web-request'
import HttpResponseCode from './http-response-code'
import promiseRetry from 'promise-retry'
import crypto = require('crypto')
import { Utils } from 'tezos-oracle-lib'

/** User agent for requests to the API. */
const USER_AGENT = 'tezos-oracle'

/** Granularity parameter for Coinbase API. */
const GRANULARITY_SECONDS = 60

/** Coinbase REST API base URL */
const COINBASE_PRO_API_BASE_URL = 'https://api.pro.coinbase.com'

/** Scale to report prices in. */
const SCALE = 6

/** The number of times to retry an attempt to the Coinbase API */
const COINBASE_API_RETRY_COUNT = 10

/** Provides candles from the Coinbase Pro API. */
export default class CoinbaseCandleProvider implements CandleProvider {
    /**
     * Construct a new CoinbaseCandleProvider.
     * 
     * @param coinbaseApiKeyId The ID for a Coinbase Pro API Key.
     * @param coinbaseApiKeySecret The secret for a Coinbase Pro API Key.
     * @param coinbaseApiKeyPassphrase The passphrase for a Coinbase Pro API Key.
     */
    public constructor(
        public readonly coinbaseApiKeyId: string,
        public readonly coinbaseApiKeySecret: string,
        public readonly coinbaseApiKeyPassphrase: string
    ) { }

    /**
     * Get a description of the CandleProvider's backing service.
     *
     * @returns A string describing where the candles are pulled from.
     */
    public getProviderName(): string {
        return COINBASE_PRO_API_BASE_URL
    }


    /**
     * Retrieves a candle from the Coinbase Pro API.
     * 
     * @param assetName The assetName to retrieve. For instance, "XTZ-USD".
     */
    public async getCandle(assetName: string): Promise<Candle> {
        for (var i = 0; i < COINBASE_API_RETRY_COUNT; i++) {
            console.log("Trying to fetch " + assetName + " on attempt " + i)
            try {
                return await this.queryCoinbaseForCandle(assetName)
            } catch (err) {
                console.log((Date.now() / 1000) + ": Caught error: " + err)
                Utils.sleep(1)
            }
        }
        throw new Error("Could not get candle")
    }

    public async queryCoinbaseForCandle(assetName: string): Promise<Candle> {
        // Query the Coinbase Pro API.
        const requestPath = CoinbaseCandleProvider.makeRequestPath(assetName)
        const apiURL = COINBASE_PRO_API_BASE_URL + requestPath

        const timestamp = Date.now() / 1000;
        const method = 'GET';
        const what = timestamp + method + requestPath;
        const secretKey = Buffer.from(this.coinbaseApiKeySecret, 'base64');
        const hmac = crypto.createHmac('sha256', secretKey);
        const signature = hmac.update(what).digest('base64');

        const response = await WebRequest.get(apiURL, {
            headers: {
                'User-Agent': USER_AGENT,
                'CB-ACCESS-KEY': this.coinbaseApiKeyId,
                'CB-ACCESS-SIGN': signature,
                'CB-ACCESS-TIMESTAMP': timestamp,
                'CB-ACCESS-PASSPHRASE': this.coinbaseApiKeyPassphrase,
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
        const [startTimestamp, low, high, open, close, volume] = candles[0]

        // Return the data formatted as an {@link Candle}.      
        return {
            assetName,
            startTimestamp,
            endTimestamp: startTimestamp + GRANULARITY_SECONDS,
            low: Utils.scale(low, SCALE),
            high: Utils.scale(high, SCALE),
            open: Utils.scale(open, SCALE),
            close: Utils.scale(close, SCALE),
            volume: Utils.scale(volume, SCALE)
        }
    }

    /**
     * Make an request path for the given asset in the Coinbase Pro API.
     * 
     * @param assetName The assetName to retrieve. For instance, "XTZ-USD".
     * @return The request path to hit.
     */
    private static makeRequestPath(assetName: string): string {
        return `/products/${assetName}/candles?granularity=${GRANULARITY_SECONDS}`
    }
}