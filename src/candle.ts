/**
 * Candle data returned from an asset data feed.
 *
 * Note that by convention this data is expressed in natural numbers with six digits of
 * precision. For instance, $123.42 USD would be expressed as 123_420_000.
 */
export default interface Candle {
    /** Asset pair the candle identifies. Example: "XTZ-USD" */
    assetName: string

    /** Unix timestamp of the candle's start in seconds. */
    startTimestamp: number

    /** Unix timestamp of the candle's end in seconds. */
    endTimestamp: number

    /** 
     * Candle components expressed as natural numbers with 6 digits of precision. 
     * For instance, $123.42 USD would be expressed as 123_420_000.
     */
    low: number
    high: number
    open: number
    close: number

    volume: number
}