/**
 * An interface for an object that can sign bytes.
 */
export default interface Signer {
  /**
   * Sign the given bytes.
   *
   * @param bytes The bytes to sign.
   * @returns The signature encoded in base58check format.
   */
  sign(bytes: Uint8Array): Promise<string>

  /**
   * Retrieve the public key used to verify signed messages.
   *
   * @returns The public key encoded in base58check format.
   */
  getPublicKey(): Promise<string>
}
