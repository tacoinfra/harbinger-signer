import CandleProvider from "./candle-provider"
import Signer from "./signer"
import { TezosParameterFormat } from 'conseiljs/dist/types/tezos/TezosChainTypes'
import { TezosMessageUtils } from '../node_modules/conseiljs/dist/chain/tezos/TezosMessageUtil'
import { Utils } from '@tacoinfra/harbinger-lib'
import Candle from "./candle"

/**
 * Schemas for Michelson messages.
 */
enum MichelsonSchema {
    candle = 'pair string (pair timestamp (pair timestamp (pair nat (pair nat (pair nat (pair nat nat))))))',
    revoke = "option key"
}

/** Provides functionality for the oracle by composing a candle provider and signer. */
export default class OracleService {
    /**
     * Create a new Oracle Service.
     * 
     * @param assetNames An array of asset names that this oracle service will serve.
     * @param candleProvider A provider for Candles.
     * @param signer A signer that will sign data.
     */
    public constructor(
        public readonly assetNames: Array<string>,
        public readonly candleProvider: CandleProvider,
        public readonly signer: Signer
    ) { }

    /**
     * Handler for the oracle endpoint.
     */
    public async oracle(): Promise<object> {
        const candles: Array<Candle> = []
        for (var i = 0; i < this.assetNames.length; i++) {
            const assetName = this.assetNames[i]
            try {
                const candle = await this.candleProvider.getCandle(assetName)
                candles.push(candle)
            } catch (e) {
                console.log(`Unable to produce a candle for ${assetName}: ${e.message}`)
            }
        }

        const michelsonCandles = candles.map((candle) => {
            return `Pair \"${candle.assetName}\" (Pair ${candle.startTimestamp} (Pair ${candle.endTimestamp} (Pair ${candle.open} (Pair ${candle.high} (Pair ${candle.low} (Pair ${candle.close} ${candle.volume}))))))`
        })

        const packedCandles = michelsonCandles.map((michelsonCandle) => {
            console.log("Packing " + michelsonCandle)
            const bytes = OracleService.pack(michelsonCandle, MichelsonSchema.candle)
            return Utils.bytesToHex(bytes)
        })

        const byteCandles = michelsonCandles.map((michelsonCandles) => {
            return OracleService.pack(michelsonCandles, MichelsonSchema.candle)
        })

        const signatures = await Promise.all(byteCandles.map(async (byteCandle) => {
            return await this.signer.sign(byteCandle)
        }))

        return {
            messages: packedCandles,
            signatures: signatures
        }
    }

    /**
     * Handler for revoke endpoint.
     */
    public async revoke(): Promise<string> {
        const michelson = "None"
        const bytes = OracleService.pack(michelson, MichelsonSchema.revoke)
        return await this.signer.sign(bytes)
    }

    /**
     * Handler for info endpoint.
     */
    public async info(): Promise<object> {
        const candleProviderName = this.candleProvider.getProviderName()
        const publicKey = await this.signer.getPublicKey()
        return {
            dataFeed: candleProviderName,
            assetNames: this.assetNames,
            publicKey: publicKey
        }
    }

    /**
     * Pack the given Michelson to hex encoded bytes.
     *
     * @param michelson A Michelson string to pack.
     * @param types A Michelson schema for the provided Michelson.
     * @returns The inputs as packed bytes.
     */
    private static pack(michelson: string, types: string): Uint8Array {
        const packedHex = TezosMessageUtils.writePackedData(
            michelson,
            types,
            TezosParameterFormat.Michelson,
        )
        return Utils.hexToBytes(packedHex)
    }
}