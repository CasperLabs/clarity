import {
  AccountDeploy,
  CasperServiceByJsonRPC,
  DeployResult,
  EventService,
  TransferResult
} from '../services';
import { DeployUtil, Keys, PublicKey } from './index';
import { encodeBase16 } from './Conversions';
import {
  Deploy,
  DeployParams,
  ExecutableDeployItem,
  Transfer
} from './DeployUtil';
import { AsymmetricKey, SignatureAlgorithm } from './Keys';
import { CasperHDKey } from './CasperHDKey';

type ByteArray = Uint8Array;

export class CasperClient {
  private nodeClient: CasperServiceByJsonRPC;
  private eventStoreClient: EventService;

  constructor(nodeUrl: string, eventStoreUrl: string) {
    this.nodeClient = new CasperServiceByJsonRPC(nodeUrl);
    this.eventStoreClient = new EventService(eventStoreUrl);
  }

  /**
   * Generate new key pair.
   * @param algo Currently we support Ed25519 and Secp256K1.
   */
  public getKeyPair(algo: SignatureAlgorithm): AsymmetricKey {
    switch (algo) {
      case SignatureAlgorithm.Ed25519:
        return Keys.Ed25519.new();
      case SignatureAlgorithm.Secp256K1:
        return Keys.Secp256K1.new();
      default:
        throw new Error('Invalid signature algorithm');
    }
  }

  /**
   * Load public key from file
   *
   * @param path the path to the publicKey file
   * @param algo the signature algorithm of the file
   */
  public getPublicKeyFromPEMFile(
    path: string,
    algo: SignatureAlgorithm
  ): ByteArray {
    switch (algo) {
      case SignatureAlgorithm.Ed25519:
        return Keys.Ed25519.getPublicKeyFromPEMFile(path);
      case SignatureAlgorithm.Secp256K1:
        return Keys.Secp256K1.getPublicKeyFromPEMFile(path);
      default:
        throw new Error('Invalid signature algorithm');
    }
  }

  /**
   * Load secret key
   * @param path the path to the secret key file
   */
  public getSecretKeyFromPEMFile(
    path: string,
    algo: SignatureAlgorithm
  ): ByteArray {
    switch (algo) {
      case SignatureAlgorithm.Ed25519:
        return Keys.Ed25519.getSecretKeyFromPEMFile(path);
      case SignatureAlgorithm.Secp256K1:
        return Keys.Secp256K1.getSecretKeyFromPEMFile(path);
      default:
        throw new Error('Invalid signature algorithm');
    }
  }

  /**
   * Load secret key file to restore keyPair
   *
   * @param path The path to the secret key
   * @param algo
   */
  public getKeyPairFromSecretPEMFile(
    path: string,
    algo: SignatureAlgorithm
  ): AsymmetricKey {
    switch (algo) {
      case SignatureAlgorithm.Ed25519:
        return Keys.Ed25519.getKeyPairFromSecretPEMFile(path);
      case SignatureAlgorithm.Secp256K1:
        return Keys.Secp256K1.getKeyPairFromSecretPEMFile(path);
      default:
        throw new Error('Invalid signature algorithm');
    }
  }

  /**
   * Create a new hierarchical deterministic wallet, supporting bip32 protocol
   *
   * @param seed The seed buffer for parent key
   */
  public getWalletFromSeed(seed: ByteArray): CasperHDKey {
    return CasperHDKey.fromMasterSeed(seed);
  }

  /**
   * Compute public key from secret Key.
   * @param secretKey
   */
  public getPublicKeyFromSecretKey(
    secretKey: ByteArray,
    algo: SignatureAlgorithm
  ): ByteArray {
    switch (algo) {
      case SignatureAlgorithm.Ed25519:
        return Keys.Ed25519.getPublicKeyFromSecretKey(secretKey);
      case SignatureAlgorithm.Secp256K1:
        return Keys.Secp256K1.getPublicKeyFromSecretKey(secretKey);
      default:
        throw new Error('Invalid signature algorithm');
    }
  }

  /**
   * Construct a unsigned Deploy object
   *
   * @param deployParams Parameters for deploy
   * @param session
   * @param payment
   */
  public makeDeploy(
    deployParams: DeployParams,
    session: ExecutableDeployItem,
    payment: ExecutableDeployItem
  ): Deploy {
    return DeployUtil.makeDeploy(deployParams, session, payment);
  }

  /**
   * Sign the deploy with the specified signKeyPair
   * @param deploy unsigned Deploy object
   * @param signKeyPair the keypair to sign the Deploy object
   */
  public signDeploy(deploy: Deploy, signKeyPair: AsymmetricKey): Deploy {
    return DeployUtil.signDeploy(deploy, signKeyPair);
  }

  /**
   * Send deploy to network
   * @param signedDeploy Signed deploy object
   */
  public putDeploy(signedDeploy: Deploy): Promise<string> {
    return this.nodeClient.deploy(signedDeploy).then(it => it.deploy_hash);
  }

  /**
   * convert the deploy object to json
   * @param deploy
   */
  public getDeployAsJSON(deploy: Deploy) {
    return DeployUtil.getDeployAsJSON(deploy);
  }

  /**
   * Construct the deploy for transfer purpose
   *
   * @param deployParams
   * @param session
   * @param payment
   */
  public makeTransferDeploy(
    deployParams: DeployParams,
    session: Transfer,
    payment: ExecutableDeployItem
  ): Deploy {
    return this.makeDeploy(deployParams, session, payment);
  }

  /**
   * Get the balance of public key
   */
  public async getBalanceOfByPublicKey(publicKey: PublicKey): Promise<number> {
    return this.getBalanceOfByAccountHash(
      encodeBase16(publicKey.toAccountHash())
    );
  }

  /**
   * Get the balance by account hash
   */
  public async getBalanceOfByAccountHash(
    accountHashStr: string
  ): Promise<number> {
    try {
      const stateRootHash = await this.nodeClient
        .getLatestBlockInfo()
        .then(it => it.block?.header.state_root_hash);
      // Find the balance Uref and cache it if we don't have it.
      if (!stateRootHash) {
        return 0;
      }
      const balanceUref = await this.nodeClient.getAccountBalanceUrefByPublicKeyHash(
        stateRootHash,
        accountHashStr
      );

      if (!balanceUref) {
        return 0;
      }

      return await this.nodeClient.getAccountBalance(
        stateRootHash,
        balanceUref
      );
    } catch (e) {
      return 0;
    }
  }

  /**
   * Get deploys for specified account
   * @param publicKey
   * @param page
   * @param limit
   */
  public async getAccountDeploys(
    publicKey: PublicKey,
    page: number = 0,
    limit: number = 20
  ): Promise<AccountDeploy[]> {
    const data = await this.eventStoreClient.getAccountDeploys(
      publicKey.toAccountHex(),
      page,
      limit
    );
    return data.data;
  }

  /**
   * Get deploy by hash
   * @param deployHash
   */
  public async getDeployByHash(deployHash: string): Promise<DeployResult> {
    return await this.eventStoreClient.getDeployByHash(deployHash);
  }

  /**
   * Get the main purse uref for the specified publicKey
   * @param publicKey
   */
  public async getAccountMainPurseUref(
    publicKey: PublicKey
  ): Promise<string | null> {
    const stateRootHash = await this.nodeClient
      .getLatestBlockInfo()
      .then(it => it.block?.header.state_root_hash);

    if (!stateRootHash) {
      return null;
    }

    const balanceUref = await this.nodeClient.getAccountBalanceUrefByPublicKeyHash(
      stateRootHash,
      encodeBase16(publicKey.toAccountHash())
    );

    return balanceUref;
  }

  /**
   * Get transfers for the specified purseUref, including sending and receiving transactions
   * @param purseUref
   */
  public async getTransfersByPurse(
    purseUref: string
  ): Promise<TransferResult[]> {
    return await this.eventStoreClient.getTransfersByPurse(purseUref);
  }
}
