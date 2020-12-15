import * as fs from 'fs';
import * as nacl from 'tweetnacl-ts';
import { SignKeyPair, SignLength } from 'tweetnacl-ts';
import { decodeBase64 } from 'tweetnacl-util';
import { ByteArray, encodeBase16, encodeBase64, PublicKey } from '../index';
import { byteHash } from './Contracts';
import { ec as EC } from 'elliptic';
import * as secp256k1 from 'ethereum-cryptography/secp256k1';
import KeyEncoder from 'key-encoder';
import { sha256 } from 'ethereum-cryptography/sha256';
import { CasperHDKey } from './CasperHDKey';

const keyEncoder = new KeyEncoder('secp256k1');
const ec = new EC('secp256k1');

const ED25519_PEM_SECRET_KEY_TAG = 'PRIVATE KEY';
const ED25519_PEM_PUBLIC_KEY_TAG = 'PUBLIC KEY';

/**
 * Supported types of Asymmetric Key algorithm
 */
export enum SignatureAlgorithm {
  Ed25519 = 'ed25519',
  Secp256K1 = 'secp256k1'
}

function accountHashHelper(
  signatureAlgorithm: SignatureAlgorithm,
  publicKey: ByteArray
) {
  const separator = Buffer.from([0]);
  const prefix = Buffer.concat([Buffer.from(signatureAlgorithm), separator]);

  if (publicKey.length === 0) {
    return Buffer.from([]);
  } else {
    return byteHash(Buffer.concat([prefix, Buffer.from(publicKey)]));
  }
}

/**
 * Get rid of PEM frames, skips header `-----BEGIN PUBLIC KEY-----`
 * and footer `-----END PUBLIC KEY-----`
 *
 * Example PEM:
 *
 * ```
 * -----BEGIN PUBLIC KEY-----\r\n
 * MFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAEj1fgdbpNbt06EY/8C+wbBXq6VvG+vCVD\r\n
 * Nl74LvVAmXfpdzCWFKbdrnIlX3EFDxkd9qpk35F/kLcqV3rDn/u3dg==\r\n
 * -----END PUBLIC KEY-----\r\n
 * ```
 *
 */
export function readBase64WithPEM(content: string): ByteArray {
  const base64 = content
    // there are two kinks of line-endings, CRLF(\r\n) and LF(\n)
    // we need handle both
    .split(/\r?\n/)
    .filter(x => !x.startsWith('---'))
    .join('')
    // remove the line-endings in the end of content
    .trim();
  return decodeBase64(base64);
}

export abstract class AsymmetricKey {
  public readonly publicKey: PublicKey;
  public readonly secretKey: ByteArray;
  public readonly signatureAlgorithm: SignatureAlgorithm;

  constructor(
    publicKey: ByteArray,
    secretKey: ByteArray,
    signatureAlgorithm: SignatureAlgorithm
  ) {
    this.publicKey = PublicKey.from(publicKey, signatureAlgorithm);
    this.secretKey = secretKey;
    this.signatureAlgorithm = signatureAlgorithm;
  }

  /**
   * Compute a unique hash from the algorithm name(Ed25519 here) and a public key, used for accounts.
   */
  public getAccountHash(): ByteArray {
    return this.publicKey.toAccountHash();
  }

  /**
   * Get the account hex
   */
  public getAccountHex(): string {
    return this.publicKey.toAccountHex();
  }

  protected toPem(tag: string, content: string) {
    // prettier-ignore
    return `-----BEGIN ${tag}-----\n` +
      `${content}\n` +
      `-----END ${tag}-----\n`;
  }

  /**
   * Export the public key encoded in pem
   */
  public abstract exportPublicKeyInPem(): string;

  /**
   * Expect the secret key encoded in pem
   */
  public abstract exportSecretKeyInPem(): string;

  /**
   * Sign the message by using the keyPair
   * @param msg
   */
  public abstract sign(msg: ByteArray): ByteArray;

  /**
   * Verify the signature along with the raw message
   * @param signature
   * @param msg
   */
  public abstract verfiy(signature: ByteArray, msg: ByteArray): boolean;
}

// Based on SignatureAlgorithm.scala
export class Ed25519 extends AsymmetricKey {
  constructor(keyPair: SignKeyPair) {
    super(keyPair.publicKey, keyPair.secretKey, SignatureAlgorithm.Ed25519);
  }

  /**
   * Generating a new Ed25519 key pair
   */
  public static new() {
    return new Ed25519(nacl.sign_keyPair());
  }

  /**
   * Generate the accountHex for the Ed25519 public key
   * @param publicKey
   */
  public static getAccountHex(publicKey: ByteArray): string {
    return '01' + encodeBase16(publicKey);
  }

  /**
   * Parse the key pair from publicKey file and secretKey file
   * @param publicKeyPath path of public key file
   * @param secretKeyPath path of secret key file
   */
  public static getKeyPairFromFiles(
    publicKeyPath: string,
    secretKeyPath: string
  ): AsymmetricKey {
    const publicKey = Ed25519.getPublicKeyFromPEMFile(publicKeyPath);
    const secretKey = Ed25519.getSecretKeyFromPEMFile(secretKeyPath);
    // nacl expects that the secret key will contain both.
    return new Ed25519({
      publicKey,
      secretKey: Buffer.concat([secretKey, publicKey])
    });
  }

  /**
   * Generate the accountHash for the Ed25519 public key
   * @param publicKey
   */
  public static getAccountHashFromPublicKey(publicKey: ByteArray): ByteArray {
    return accountHashHelper(SignatureAlgorithm.Ed25519, publicKey);
  }

  /**
   * Construct keyPair from a public key and secret key
   * @param publicKey
   * @param secretKey
   */
  public static getKeyPairFromBytes(
    publicKey: ByteArray,
    secretKey: ByteArray
  ): AsymmetricKey {
    const publ = Ed25519.parsePublicKey(publicKey);
    const priv = Ed25519.parseSecretKey(secretKey);
    // nacl expects that the secret key will contain both.
    return new Ed25519({
      publicKey: publ,
      secretKey: Buffer.concat([priv, publ])
    });
  }

  public static getSecretKeyFromPEMFile(path: string): ByteArray {
    return Ed25519.parseSecretKey(Ed25519.readBase64File(path));
  }

  public static getPublicKeyFromPEMFile(path: string): ByteArray {
    return Ed25519.parsePublicKey(Ed25519.readBase64File(path));
  }

  public static parseSecretKey(bytes: ByteArray) {
    return Ed25519.parseKey(bytes, 0, 32);
  }

  public static parsePublicKey(bytes: ByteArray) {
    return Ed25519.parseKey(bytes, 32, 64);
  }

  public static readBase64WithPEM(content: string) {
    return readBase64WithPEM(content);
  }

  /**
   * Read the Base64 content of a file, get rid of PEM frames.
   *
   * @param path the path of file to read from
   */
  private static readBase64File(path: string): ByteArray {
    const content = fs.readFileSync(path).toString();
    return Ed25519.readBase64WithPEM(content);
  }

  private static parseKey(bytes: ByteArray, from: number, to: number) {
    const len = bytes.length;
    // prettier-ignore
    const key =
      (len === 32) ? bytes :
        (len === 64) ? Buffer.from(bytes).slice(from, to) :
          (len > 32 && len < 64) ? Buffer.from(bytes).slice(len % 32) :
            null;
    if (key == null || key.length !== 32) {
      throw Error(`Unexpected key length: ${len}`);
    }
    return key;
  }

  /**
   * Export the secret key encoded in pem
   */
  public exportSecretKeyInPem() {
    // prettier-ignore
    const derPrefix = Buffer.from([48, 46, 2, 1, 0, 48, 5, 6, 3, 43, 101, 112, 4, 34, 4, 32]);
    const encoded = encodeBase64(
      Buffer.concat([
        derPrefix,
        Buffer.from(Ed25519.parseSecretKey(this.secretKey))
      ])
    );
    return this.toPem(ED25519_PEM_SECRET_KEY_TAG, encoded);
  }

  /**
   * Expect the public key encoded in pem
   */
  public exportPublicKeyInPem() {
    // prettier-ignore
    const derPrefix = Buffer.from([48, 42, 48, 5, 6, 3, 43, 101, 112, 3, 33, 0]);
    const encoded = encodeBase64(
      Buffer.concat([derPrefix, Buffer.from(this.publicKey.rawPublicKey)])
    );
    return this.toPem(ED25519_PEM_PUBLIC_KEY_TAG, encoded);
  }

  /**
   * Sign the message by using the keyPair
   * @param msg
   */
  public sign(msg: ByteArray): ByteArray {
    return nacl.sign_detached(msg, this.secretKey);
  }

  /**
   * Verify the signature along with the raw message
   * @param signature
   * @param msg
   */
  public verfiy(signature: ByteArray, msg: ByteArray) {
    return nacl.sign_detached_verify(
      msg,
      signature,
      this.publicKey.rawPublicKey
    );
  }

  /**
   * Derive public key from secret key
   * @param secretKey
   */
  public static getPublicKeyFromSecretKey(secretKey: ByteArray) {
    if (secretKey.length === SignLength.SecretKey) {
      return nacl.sign_keyPair_fromSecretKey(secretKey).publicKey;
    } else {
      return nacl.sign_keyPair_fromSeed(secretKey).publicKey;
    }
  }

  /**
   * Restore Ed25519 keyPair from secret key file
   * @param secretKeyPath
   */
  public static getKeyPairFromSecretPEMFile(secretKeyPath: string) {
    const secretKey = Ed25519.getSecretKeyFromPEMFile(secretKeyPath);
    const publicKey = Ed25519.getPublicKeyFromSecretKey(secretKey);
    return Ed25519.getKeyPairFromBytes(publicKey, secretKey);
  }
}

export class Secp256K1 extends AsymmetricKey {
  constructor(publicKey: ByteArray, secretKey: ByteArray) {
    super(publicKey, secretKey, SignatureAlgorithm.Secp256K1);
  }

  /**
   * Generating a new Secp256K1 key pair
   */
  public static new() {
    const keyPair = ec.genKeyPair();
    const publicKey = Uint8Array.from(keyPair.getPublic(true, 'array'));
    const secretKey = keyPair.getPrivate().toBuffer();
    return new Secp256K1(publicKey, secretKey);
  }

  /**
   * Parse the key pair from publicKey file and secretKey file
   * @param publicKeyPath path of public key file
   * @param secretKeyPath path of secret key file
   */
  public static getKeyPairFromFiles(
    publicKeyPath: string,
    secretKeyPath: string
  ): AsymmetricKey {
    const publicKey = Secp256K1.getPublicKeyFromPEMFile(publicKeyPath);
    const secretKey = Secp256K1.getSecretKeyFromPEMFile(secretKeyPath);
    return new Secp256K1(publicKey, secretKey);
  }

  /**
   * Generate the accountHash for the Secp256K1 public key
   * @param publicKey
   */
  public static getAccountHash(publicKey: ByteArray): ByteArray {
    return accountHashHelper(SignatureAlgorithm.Secp256K1, publicKey);
  }

  /**
   * Construct keyPair from public key and secret key
   * @param publicKey
   * @param secretKey
   * @param originalFormat the format of the public/secret key
   */
  public static getKeyPairFromBytes(
    publicKey: ByteArray,
    secretKey: ByteArray,
    originalFormat: 'raw' | 'der'
  ): AsymmetricKey {
    const publ = Secp256K1.parsePublicKey(publicKey, originalFormat);
    const priv = Secp256K1.parseSecretKey(secretKey, originalFormat);
    // nacl expects that the secret key will contain both.
    return new Secp256K1(publ, priv);
  }

  public static getSecretKeyFromPEMFile(path: string): ByteArray {
    return Secp256K1.parseSecretKey(Secp256K1.readBase64File(path));
  }

  public static getPublicKeyFromPEMFile(path: string): ByteArray {
    return Secp256K1.parsePublicKey(Secp256K1.readBase64File(path));
  }

  public static parseSecretKey(
    bytes: ByteArray,
    originalFormat: 'der' | 'raw' = 'der'
  ) {
    let rawKeyHex: string;
    if (originalFormat === 'der') {
      rawKeyHex = keyEncoder.encodePrivate(Buffer.from(bytes), 'der', 'raw');
    } else {
      rawKeyHex = encodeBase16(bytes);
    }
    const secretKey = ec
      .keyFromPrivate(rawKeyHex, 'hex')
      .getPrivate()
      .toBuffer();
    return secretKey;
  }

  public static parsePublicKey(
    bytes: ByteArray,
    originalFormat: 'der' | 'raw' = 'der'
  ) {
    let rawKeyHex: string;
    if (originalFormat === 'der') {
      rawKeyHex = keyEncoder.encodePublic(Buffer.from(bytes), 'der', 'raw');
    } else {
      rawKeyHex = encodeBase16(bytes);
    }

    const publicKey = Uint8Array.from(
      ec.keyFromPublic(rawKeyHex, 'hex').getPublic(true, 'array')
    );
    return publicKey;
  }

  public static readBase64WithPEM(content: string) {
    return readBase64WithPEM(content);
  }

  /**
   * Read the Base64 content of a file, get rid of PEM frames.
   *
   * @param path the path of file to read from
   */
  private static readBase64File(path: string): ByteArray {
    const content = fs.readFileSync(path).toString();
    return Secp256K1.readBase64WithPEM(content);
  }

  /**
   * Export the secret key encoded in pem
   */
  public exportSecretKeyInPem(): string {
    return keyEncoder.encodePrivate(encodeBase16(this.secretKey), 'raw', 'pem');
  }

  /**
   * Expect the public key encoded in pem
   */
  public exportPublicKeyInPem(): string {
    return keyEncoder.encodePublic(
      encodeBase16(this.publicKey.rawPublicKey),
      'raw',
      'pem'
    );
  }

  /**
   * Sign the message by using the keyPair
   * @param msg
   */
  public sign(msg: ByteArray): ByteArray {
    const res = secp256k1.ecdsaSign(sha256(Buffer.from(msg)), this.secretKey);
    return res.signature;
  }

  /**
   * Verify the signature along with the raw message
   * @param signature
   * @param msg
   */
  public verfiy(signature: ByteArray, msg: ByteArray) {
    return secp256k1.ecdsaVerify(
      signature,
      sha256(Buffer.from(msg)),
      this.publicKey.rawPublicKey
    );
  }

  /**
   * Derive public key from secret key
   * @param secretKey
   */
  public static getPublicKeyFromSecretKey(secretKey: ByteArray): ByteArray {
    return secp256k1.publicKeyCreate(secretKey, true);
  }

  /**
   * Restore Secp256K1 keyPair from secret key file
   * @param secretKeyPath a path to file of the secret key
   */
  public static getKeyPairFromSecretPEMFile(secretKeyPath: string) {
    const secretKey = Secp256K1.getSecretKeyFromPEMFile(secretKeyPath);
    const publicKey = Secp256K1.getPublicKeyFromSecretKey(secretKey);
    return Secp256K1.getKeyPairFromBytes(publicKey, secretKey, 'raw');
  }

  /**
   * From hdKey derive a child Secp256K1 key
   * @param hdKey
   * @param index
   */
  public static deriveIndex(hdKey: CasperHDKey, index: number) {
    return hdKey.deriveIndex(index);
  }
}
