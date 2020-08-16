import Candle from './candle'

/**
 * An interface for an object which provides candles for the Oracle.
 */
export default interface CandleProvider {
  /**
   * Get a description of the CandleProvider's backing service.
   *
   * @returns A string describing where the candles are pulled from.
   */
  getProviderName(): string

  /**
   * Retrieve the latest candle to sign.
   *
   * @param assetName The asset name to retrieve. For instance "XTZ-USD".
   * @returns The associated {@link Candle}.
   */
  getCandle(assetName: string): Promise<Candle>
}
