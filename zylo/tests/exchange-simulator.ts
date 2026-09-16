import {
  type CircuitContext,
  type JubjubPoint,
  ChargedState,
  CompactTypeBytes,
  CompactTypeField,
  CompactTypeJubjubPoint,
  CompactTypeVector,
  ContractState,
  ConstructorContext,
  createCircuitContext,
  createConstructorContext,
  ecAdd,
  ecMul,
  ecMulGenerator,
  persistentHash,
  sampleContractAddress,
  transientHash,
} from '@midnight-ntwrk/compact-runtime';
import { Contract, type Ledger, ledger } from '../managed/exchange/contract/index.js';
import {
  type Keypair,
  challengeParts,
  fingerprint,
  keypairFromSeed,
  sign,
} from '../crypto/attestation.js';

const COIN_PUBLIC_KEY = '0'.repeat(64);

export type PrivateState = {
  readonly ownerSecret: Uint8Array;
  readonly buyerSecret: Uint8Array;
  readonly governorSecret: Uint8Array;
  readonly attestationNonce: JubjubPoint;
  readonly attestationScalar: bigint;
  readonly attestationChallenge: bigint;
  readonly attestationChallengeQuotient: bigint;
};

export const witnesses = {
  ownerSecret: (ctx: { privateState: PrivateState }): [PrivateState, Uint8Array] =>
    [ctx.privateState, ctx.privateState.ownerSecret],
  buyerSecret: (ctx: { privateState: PrivateState }): [PrivateState, Uint8Array] =>
    [ctx.privateState, ctx.privateState.buyerSecret],
  governorSecret: (ctx: { privateState: PrivateState }): [PrivateState, Uint8Array] =>
    [ctx.privateState, ctx.privateState.governorSecret],
  attestationNonce: (ctx: { privateState: PrivateState }): [PrivateState, JubjubPoint] =>
    [ctx.privateState, ctx.privateState.attestationNonce],
  attestationScalar: (ctx: { privateState: PrivateState }): [PrivateState, bigint] =>
    [ctx.privateState, ctx.privateState.attestationScalar],
  attestationChallenge: (ctx: { privateState: PrivateState }): [PrivateState, bigint] =>
    [ctx.privateState, ctx.privateState.attestationChallenge],
  attestationChallengeQuotient: (ctx: { privateState: PrivateState }): [PrivateState, bigint] =>
    [ctx.privateState, ctx.privateState.attestationChallengeQuotient],
};

const V1_FIELD = new CompactTypeVector(1, CompactTypeField);
const V2_BYTES = new CompactTypeVector(2, new CompactTypeBytes(32));
const V3_BYTES = new CompactTypeVector(3, new CompactTypeBytes(32));
const BYTES_32 = new CompactTypeBytes(32);


export function bytes(fill: number): Uint8Array {
  return new Uint8Array(32).fill(fill);
}

export { tag, commitSecret, datasetIdOf } from '../crypto/commitments.js';
import { tag, commitSecret, datasetIdOf } from '../crypto/commitments.js';

export function priceTag(price: bigint): Uint8Array {
  return persistentHash(V1_FIELD, [price]);
}


export function listingLeaf(datasetId: Uint8Array, price: bigint): Uint8Array {
  return persistentHash(V3_BYTES, [tag('zylo:listing:v1'), datasetId, priceTag(price)]);
}

export function jobIdOf(buyerSecret: Uint8Array, specCommitment: Uint8Array): Uint8Array {
  return persistentHash(V3_BYTES, [tag('zylo:job:v1'), buyerSecret, specCommitment]);
}


export function payoutCommitmentOf(datasetId: Uint8Array): Uint8Array {
  return persistentHash(V2_BYTES, [tag('zylo:accrue:v1'), datasetId]);
}

export function grantNullifierOf(jobId: Uint8Array): Uint8Array {
  return persistentHash(V2_BYTES, [tag('zylo:grant:v1'), jobId]);
}

export const enclaveKeypair = keypairFromSeed;
export const enclaveFingerprint = fingerprint;
export const signAttestation = sign;
export type EnclaveKeypair = Keypair;

export class ExchangeSimulator {
  private readonly contract: Contract<PrivateState>;
  private contractState: ContractState;
  private privateState: PrivateState;
  readonly address = sampleContractAddress();

  private constructor(contractState: ContractState, privateState: PrivateState) {
    this.contract = new Contract<PrivateState>(witnesses);
    this.contractState = contractState;
    this.privateState = privateState;
  }

  static async deploy(governorSecret: Uint8Array): Promise<ExchangeSimulator> {
    const contract = new Contract<PrivateState>(witnesses);
    const privateState: PrivateState = {
      ownerSecret: bytes(1),
      buyerSecret: bytes(2),
      governorSecret,
      attestationNonce: ecMulGenerator(1n),
      attestationScalar: 0n,
      attestationChallenge: 0n,
      attestationChallengeQuotient: 0n,
    };
    const { currentContractState, currentPrivateState } = await contract.initialState(
      createConstructorContext(privateState, COIN_PUBLIC_KEY) as ConstructorContext<PrivateState>,
      commitSecret('zylo:governor:v1', governorSecret),
    );
    return new ExchangeSimulator(currentContractState, currentPrivateState as PrivateState);
  }

  patch(next: Partial<PrivateState>): void {
    this.privateState = { ...this.privateState, ...next };
  }

  ledger(): Ledger {
    return ledger(this.contractState.data);
  }

  rawLedgerState(): string {
    return this.contractState.data.toString();
  }

  private context(): CircuitContext<PrivateState> {
    return createCircuitContext(
      this.address,
      COIN_PUBLIC_KEY,
      this.contractState,
      this.privateState,
    );
  }

  private commit(context: CircuitContext<PrivateState>): void {
    this.privateState = context.currentPrivateState as PrivateState;
    const next = new ContractState();
    next.data = new ChargedState(context.currentQueryContext.state.state);
    this.contractState = next;
  }

  async registerDataset(
    datasetRoot: Uint8Array,
    termsHash: Uint8Array,
    price: bigint,
    rows: bigint,
    jobClasses: bigint,
    budget = 100n,
  ): Promise<void> {
    const { context } = await this.contract.impureCircuits.registerDataset(
      this.context(), datasetRoot, termsHash, price, rows, jobClasses, budget,
    );
    this.commit(context);
  }

  async allowlistEnclave(key: JubjubPoint): Promise<void> {
    const { context } = await this.contract.impureCircuits.allowlistEnclave(
      this.context(), key,
    );
    this.commit(context);
  }

  async requestJob(
    datasetId: Uint8Array,
    price: bigint,
    specCommitment: Uint8Array,
    escrowValue: bigint,
  ): Promise<void> {
    const leaf = listingLeaf(datasetId, price);
    const path = this.pathFor(leaf);
    const { context } = await this.contract.impureCircuits.requestJob(
      this.context(), datasetId, price, path, specCommitment,
      { nonce: bytes(9), color: new Uint8Array(32), value: escrowValue },
    );
    this.commit(context);
  }

  async grantAccess(jobId: Uint8Array, key: JubjubPoint): Promise<void> {
    const grantParts = challengeParts(this.privateState.attestationNonce, key, jobId);
    this.patch({
      attestationChallenge: grantParts.challenge,
      attestationChallengeQuotient: grantParts.quotient,
    });
    const { context } = await this.contract.impureCircuits.grantAccess(
      this.context(), jobId, key,
    );
    this.commit(context);
  }

  async settleJob(
    jobId: Uint8Array,
    resultCommitment: Uint8Array,
    key: JubjubPoint,
  ): Promise<void> {
    const settleParts = challengeParts(this.privateState.attestationNonce, key, resultCommitment);
    this.patch({
      attestationChallenge: settleParts.challenge,
      attestationChallengeQuotient: settleParts.quotient,
    });
    const { context } = await this.contract.impureCircuits.settleJob(
      this.context(), jobId, resultCommitment, key,
    );
    this.commit(context);
  }

  async claimEarnings(
    datasetRoot: Uint8Array,
    amount: bigint,
    mtIndex = 0n,
  ): Promise<void> {
    const { context } = await this.contract.impureCircuits.claimEarnings(
      this.context(), datasetRoot,
      { nonce: bytes(11), color: new Uint8Array(32), value: amount, mt_index: mtIndex },
      amount,
    );
    this.commit(context);
  }

  pathFor(leaf: Uint8Array): {
    leaf: Uint8Array;
    path: { sibling: { field: bigint }; goes_left: boolean }[];
  } {
    const found = this.ledger().listings.findPathForLeaf(leaf);
    if (found === undefined) throw new Error('leaf not in listings tree');
    return found as never;
  }
}
