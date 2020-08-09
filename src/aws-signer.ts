import Signer from './signer'
import { AwsKmsKeyStore, AwsKmsSigner, Utils } from 'tezos-oracle-lib'

// TODO(keefertaylor): Centralize this.
const SIGNATURE_WATERMARK = new Uint8Array([13, 115, 101, 19, 63]) // spsig

/** Provides signing capabilities from AWS KMS. */
export default class AwsSigner implements Signer {
    /**
     * Initialize a new AwsSigner.
     * 
     * @param kmsKeyId The identifier of the KMS Key ID.
     * @param region The region the KMS key is in.
     */
    public static async from(kmsKeyId: string, region: string) {
        const keystore = await AwsKmsKeyStore.from(kmsKeyId, region)
        const signer = new AwsKmsSigner(kmsKeyId, region)
        return new AwsSigner(signer, keystore)
    }

    /** Private constructor. Please use the static `from` method. */
    private constructor(
        private readonly wrappedSigner: AwsKmsSigner,
        private readonly wrappedKeystore: AwsKmsKeyStore
    ) { }

    /**
     * Sign the given operation and produce a signature.
     * 
     * @param bytes The bytes to sign. 
     * @returns A base58check encoded signature.
     */
    public async sign(bytes: Uint8Array): Promise<string> {
        const signedBytes = await this.wrappedSigner.signOperation(Buffer.from(bytes))
        return Utils.base58CheckEncode(signedBytes, SIGNATURE_WATERMARK)
    }

    /**
     * Returns the base58check encoded public key.
     */
    public async getPublicKey(): Promise<string> {
        return this.wrappedKeystore.publicKey
    }
}