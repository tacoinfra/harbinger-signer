import Signer from './signer'
import {
  Prefixes,
  Utils,
} from '@tacoinfra/harbinger-lib'
import { KmsKeyStore, KmsSigner } from '@tacoinfra/conseil-kms'

/** Provides signing capabilities from AWS KMS. */
export default class AwsSigner implements Signer {
  /**
   * Initialize a new AwsSigner.
   *
   * @param kmsKeyId The identifier of the KMS Key ID.
   * @param region The region the KMS key is in.
   */
  public static async from(
    kmsKeyId: string,
    region: string,
  ): Promise<AwsSigner> {
    const keystore = await KmsKeyStore.from(kmsKeyId, region)
    const signer = new KmsSigner(kmsKeyId, region)
    return new AwsSigner(signer, keystore)
  }

  /** Private constructor. Please use the static `from` method. */
  private constructor(
    private readonly wrappedSigner: KmsSigner,
    private readonly wrappedKeystore: KmsKeyStore,
  ) {}

  /**
   * Sign the given operation and produce a signature.
   *
   * @param bytes The bytes to sign.
   * @returns A base58check encoded signature.
   */
  public async sign(bytes: Uint8Array): Promise<string> {
    const signedBytes = await this.wrappedSigner.signOperation(
      Buffer.from(bytes),
    )
    return Utils.base58CheckEncode(signedBytes, Prefixes.secp256k1signature)
  }

  /**
   * Returns the base58check encoded public key.
   */
  public getPublicKey(): Promise<string> {
    return new Promise((resolve, _reject) => {
      resolve(this.wrappedKeystore.publicKey)
    })
  }
}
