import * as fs from 'fs';
import * as nacl from 'tweetnacl-ts';
import { decodeBase64 } from 'tweetnacl-util';
import { ByteArray, encodeBase16, encodeBase64 } from '../index';
import { byteHash } from './Contracts';

// Based on Keys.scala
const publicKeyHashUtil = (signatureAlgorithm: string) => {
  const separator = Buffer.from([0]);
  const prefix = Buffer.concat([
    Buffer.from(signatureAlgorithm.toLowerCase()),
    separator
  ]);

  return (publicKey: ByteArray) => {
    if (publicKey.length === 0) {
      return Buffer.from([]);
    } else {
      return byteHash(Buffer.concat([prefix, Buffer.from(publicKey)]));
    }
  };
};

// Based on SignatureAlgorithm.scala
export class Ed25519 {
  /**
   * Generating a new key pair
   */
  public static newKeyPair() {
    return nacl.sign_keyPair();
  }

  /**
   * Compute a unique hash from the algorithm name(Ed25519 here) and a public key, used for accounts.
   */
  public static publicKeyHash: (
    publicKey: ByteArray
  ) => ByteArray = publicKeyHashUtil('ed25519');

  /**
   * Get the public key hex for public key
   * @param publicKey
   */
  public static publicKeyHex(publicKey: ByteArray) {
    return '01' + encodeBase16(publicKey);
  }

  /**
   * Parse the key pair from publicKey file and privateKey file
   * @param publicKeyPath path of public key file
   * @param privateKeyPath path of private key file
   */
  public static parseKeyFiles(
    publicKeyPath: string,
    privateKeyPath: string
  ): nacl.SignKeyPair {
    const publicKey = Ed25519.parsePublicKeyFile(publicKeyPath);
    const privateKey = Ed25519.parsePrivateKeyFile(privateKeyPath);
    // nacl expects that the private key will contain both.
    return {
      publicKey,
      secretKey: Buffer.concat([privateKey, publicKey])
    };
  }

  public static parseKeyPair(
    publicKey: ByteArray,
    privateKey: ByteArray
  ): nacl.SignKeyPair {
    const publ = Ed25519.parsePublicKey(publicKey);
    const priv = Ed25519.parsePrivateKey(privateKey);
    // nacl expects that the private key will contain both.
    return {
      publicKey: publ,
      secretKey: Buffer.concat([priv, publ])
    };
  }

  public static parsePrivateKeyFile(path: string): ByteArray {
    return Ed25519.parsePrivateKey(Ed25519.readBase64File(path));
  }

  public static parsePublicKeyFile(path: string): ByteArray {
    return Ed25519.parsePublicKey(Ed25519.readBase64File(path));
  }

  public static parsePrivateKey(bytes: ByteArray) {
    return Ed25519.parseKey(bytes, 0, 32);
  }

  public static parsePublicKey(bytes: ByteArray) {
    return Ed25519.parseKey(bytes, 32, 64);
  }

  /**
   * Get rid of PEM frames, skips header `-----BEGIN PUBLIC KEY-----`
   * and footer `-----END PUBLIC KEY-----`
   *
   * Example PEM:
   *
   * ```
   * -----BEGIN PUBLIC KEY-----
   * MFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAEj1fgdbpNbt06EY/8C+wbBXq6VvG+vCVD
   * Nl74LvVAmXfpdzCWFKbdrnIlX3EFDxkd9qpk35F/kLcqV3rDn/u3dg==
   * -----END PUBLIC KEY-----
   * ```
   *
   */
  public static readBase64WithPEM(content: string): ByteArray {
    const base64 = content
      .split('\n')
      .filter(x => !x.startsWith('---'))
      .join('');
    const bytes = decodeBase64(base64);
    return bytes;
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

  static privateKeyEncodeInPem(privateKey: ByteArray) {
    // prettier-ignore
    const derPrefix = Buffer.from([48, 46, 2, 1, 0, 48, 5, 6, 3, 43, 101, 112, 4, 34, 4, 32]);
    const encoded = encodeBase64(
      Buffer.concat([
        derPrefix,
        Buffer.from(Ed25519.parsePrivateKey(privateKey))
      ])
    );
    return (
      '-----BEGIN PRIVATE KEY-----\n' +
      encoded +
      '\n-----END PRIVATE KEY-----\n'
    );
  }

  static publicKeyEncodeInPem(publicKey: ByteArray) {
    // prettier-ignore
    const derPrefix = Buffer.from([48, 42, 48, 5, 6, 3, 43, 101, 112, 3, 33, 0] );
    const encoded = encodeBase64(
      Buffer.concat([derPrefix, Buffer.from(publicKey)])
    );
    return (
      '-----BEGIN PUBLIC KEY-----\n' + encoded + '\n-----END PUBLIC KEY-----\n'
    );
  }
}
