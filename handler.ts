import { APIGatewayProxyHandler } from 'aws-lambda'
import OracleService from './src/oracle-service'
import { initOracleLib } from '@tacoinfra/harbinger-lib'

import AwsSigner from './src/aws-signer'
import HttpResponseCode from './src/http-response-code'
import BinanceCandleProvider from './src/binance-candle-provider'
import CoinbaseCandleProvider from './src/coinbase-candle-provider'

/** Handler for the Oracle Feed endpoint. */
export const oracle: APIGatewayProxyHandler = async (_event, _context) => {
  try {
    const oracleService = await getOracleService()
    const body = await oracleService.oracle()
    return {
      statusCode: HttpResponseCode.ok,
      body: JSON.stringify(body),
    }
  } catch (exception) {
    console.log(exception.message)
    console.log(exception.stack)

    return {
      statusCode: HttpResponseCode.serverError,
      body: "Error: " + exception.message
    }
  }
}

/** Handler for the Revoke endpoint. */
export const revoke: APIGatewayProxyHandler = async (_event, _context) => {
  try {
    const oracleService = await getOracleService()
    const body = await oracleService.revoke()
    return {
      statusCode: HttpResponseCode.ok,
      body: body,
    }
  } catch (exception) {
    console.log(exception.message)
    console.log(exception.stack)

    return {
      statusCode: HttpResponseCode.serverError,
      body: "Error: " + exception.message
    }
  }
}

/** Handler for the Info endpoint. */
export const info: APIGatewayProxyHandler = async (_event, _context) => {
  try {
    const oracleService = await getOracleService()
    const body = await oracleService.info()
    console.log("body" + body)

    return {
      statusCode: HttpResponseCode.ok,
      body: JSON.stringify(body),
    }
  } catch (exception) {
    console.log(exception.message)
    console.log(exception.stack)

    return {
      statusCode: HttpResponseCode.serverError,
      body: "Error: " + exception.message
    }
  }
}

/**
 * Helper function to retrieve an {@link OracleService}.
 */
const getOracleService = async () => {
  // Validate asset lists.
  const assetList = process.env.ASSETS
  if (assetList == undefined) {
    throw new Error("No asset list defined. Please check your configuration")
  }
  const assets = assetList.split(',').sort()

  // Initialize OracleLib.
  initOracleLib()

  const candleProvider = getCandleProvider()
  const signer = await getSigner()

  return new OracleService(assets, candleProvider, signer)
}

/**
 * Helper function to validate inputs and create a {@link Signer}.
 */
const getSigner = () => {
  const awsKmsKeyId = process.env.AWS_KMS_KEY_ID
  const awsKmsKeyRegion = process.env.AWS_KMS_KEY_REGION
  if (
    awsKmsKeyId === undefined ||
    awsKmsKeyRegion === undefined
  ) {
    throw new Error("Fatal: Missing an input to create Signer. Please check your configuration.")
  }

  return AwsSigner.from(awsKmsKeyId, awsKmsKeyRegion)
}

/** Helper function to validate inputs and create a {@link CandleProvider}. */
const getCandleProvider = () => {
  // Provide a candle provider based on the value of the CANDLE_PROVIDER env var.
  const candleProvider = process.env.CANDLE_PROVIDER
  if (candleProvider === "COINBASE") {
    return getCoinbaseCandleProvider()
  } else if (candleProvider === "BINANCE") {
    return getBinanceCandleProvider()
  } else {
    throw new Error("Unknown CANDLE_PROVIDER passed in env var: " + candleProvider)
  }
}

/** Helper function to return a `CoinbaseCandleProvider` */
const getCoinbaseCandleProvider = () => {
  const coinbaseApiKeyId = process.env.COINBASE_API_KEY_ID
  const coinbaseApiKeySecret = process.env.COINBASE_API_KEY_SECRET
  const coinbaseApiKeyPassphrase = process.env.COINBASE_API_KEY_PASSPHRASE
  if (
    coinbaseApiKeyId === undefined ||
    coinbaseApiKeySecret === undefined ||
    coinbaseApiKeyPassphrase === undefined
  ) {
    throw new Error("Fatal: Missing an input to create CandleProvider. Please check your configuration.")
  }

  return new CoinbaseCandleProvider(coinbaseApiKeyId, coinbaseApiKeySecret, coinbaseApiKeyPassphrase)
}

/** Helper function to return a `BinanceCandleProvider` */
const getBinanceCandleProvider = () => {
  return new BinanceCandleProvider()
}