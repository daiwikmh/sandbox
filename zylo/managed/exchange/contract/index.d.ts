import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  ownerSecret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  buyerSecret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  governorSecret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  attestationNonce(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, __compactRuntime.JubjubPoint];
  attestationScalar(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
}

export type ImpureCircuits<PS> = {
  registerDataset(context: __compactRuntime.CircuitContext<PS>,
                  datasetRoot_0: Uint8Array,
                  termsHash_0: Uint8Array,
                  price_0: bigint,
                  rows_0: bigint,
                  jobClasses_0: bigint,
                  budget_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  requestJob(context: __compactRuntime.CircuitContext<PS>,
             datasetId_0: Uint8Array,
             price_0: bigint,
             path_0: { leaf: Uint8Array,
                       path: { sibling: { field: bigint }, goes_left: boolean }[]
                     },
             specCommitment_0: Uint8Array,
             escrow_0: { nonce: Uint8Array, color: Uint8Array, value: bigint }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  grantAccess(context: __compactRuntime.CircuitContext<PS>,
              jobId_0: Uint8Array,
              enclaveKey_0: __compactRuntime.JubjubPoint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  settleJob(context: __compactRuntime.CircuitContext<PS>,
            jobId_0: Uint8Array,
            resultCommitment_0: Uint8Array,
            enclaveKey_0: __compactRuntime.JubjubPoint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  claimEarnings(context: __compactRuntime.CircuitContext<PS>,
                datasetRoot_0: Uint8Array,
                coin_0: { nonce: Uint8Array,
                          color: Uint8Array,
                          value: bigint,
                          mt_index: bigint
                        },
                amount_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  allowlistEnclave(context: __compactRuntime.CircuitContext<PS>,
                   enclaveKey_0: __compactRuntime.JubjubPoint): Promise<__compactRuntime.CircuitResults<PS, []>>;
}

export type ProvableCircuits<PS> = {
  registerDataset(context: __compactRuntime.CircuitContext<PS>,
                  datasetRoot_0: Uint8Array,
                  termsHash_0: Uint8Array,
                  price_0: bigint,
                  rows_0: bigint,
                  jobClasses_0: bigint,
                  budget_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  requestJob(context: __compactRuntime.CircuitContext<PS>,
             datasetId_0: Uint8Array,
             price_0: bigint,
             path_0: { leaf: Uint8Array,
                       path: { sibling: { field: bigint }, goes_left: boolean }[]
                     },
             specCommitment_0: Uint8Array,
             escrow_0: { nonce: Uint8Array, color: Uint8Array, value: bigint }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  grantAccess(context: __compactRuntime.CircuitContext<PS>,
              jobId_0: Uint8Array,
              enclaveKey_0: __compactRuntime.JubjubPoint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  settleJob(context: __compactRuntime.CircuitContext<PS>,
            jobId_0: Uint8Array,
            resultCommitment_0: Uint8Array,
            enclaveKey_0: __compactRuntime.JubjubPoint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  claimEarnings(context: __compactRuntime.CircuitContext<PS>,
                datasetRoot_0: Uint8Array,
                coin_0: { nonce: Uint8Array,
                          color: Uint8Array,
                          value: bigint,
                          mt_index: bigint
                        },
                amount_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  allowlistEnclave(context: __compactRuntime.CircuitContext<PS>,
                   enclaveKey_0: __compactRuntime.JubjubPoint): Promise<__compactRuntime.CircuitResults<PS, []>>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  registerDataset(context: __compactRuntime.CircuitContext<PS>,
                  datasetRoot_0: Uint8Array,
                  termsHash_0: Uint8Array,
                  price_0: bigint,
                  rows_0: bigint,
                  jobClasses_0: bigint,
                  budget_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  requestJob(context: __compactRuntime.CircuitContext<PS>,
             datasetId_0: Uint8Array,
             price_0: bigint,
             path_0: { leaf: Uint8Array,
                       path: { sibling: { field: bigint }, goes_left: boolean }[]
                     },
             specCommitment_0: Uint8Array,
             escrow_0: { nonce: Uint8Array, color: Uint8Array, value: bigint }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  grantAccess(context: __compactRuntime.CircuitContext<PS>,
              jobId_0: Uint8Array,
              enclaveKey_0: __compactRuntime.JubjubPoint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  settleJob(context: __compactRuntime.CircuitContext<PS>,
            jobId_0: Uint8Array,
            resultCommitment_0: Uint8Array,
            enclaveKey_0: __compactRuntime.JubjubPoint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  claimEarnings(context: __compactRuntime.CircuitContext<PS>,
                datasetRoot_0: Uint8Array,
                coin_0: { nonce: Uint8Array,
                          color: Uint8Array,
                          value: bigint,
                          mt_index: bigint
                        },
                amount_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  allowlistEnclave(context: __compactRuntime.CircuitContext<PS>,
                   enclaveKey_0: __compactRuntime.JubjubPoint): Promise<__compactRuntime.CircuitResults<PS, []>>;
}

export type Ledger = {
  listings: {
    isFull(): boolean;
    checkRoot(rt_0: { field: bigint }): boolean;
    root(): __compactRuntime.MerkleTreeDigest;
    firstFree(): bigint;
    pathForLeaf(index_0: bigint, leaf_0: Uint8Array): __compactRuntime.MerkleTreePath<Uint8Array>;
    findPathForLeaf(leaf_0: Uint8Array): __compactRuntime.MerkleTreePath<Uint8Array> | undefined
  };
  readonly listingCount: bigint;
  catalog: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): { ownerCommitment: Uint8Array,
                                 datasetRoot: Uint8Array,
                                 termsHash: Uint8Array,
                                 price: bigint,
                                 rows: bigint,
                                 jobClasses: bigint,
                                 budget: bigint
                               };
    [Symbol.iterator](): Iterator<[Uint8Array, { ownerCommitment: Uint8Array,
  datasetRoot: Uint8Array,
  termsHash: Uint8Array,
  price: bigint,
  rows: bigint,
  jobClasses: bigint,
  budget: bigint
}]>
  };
  enclaveKeys: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  jobs: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): { escrow: bigint,
                                 specCommitment: Uint8Array,
                                 payoutCommitment: Uint8Array,
                                 resultCommitment: Uint8Array,
                                 settled: boolean
                               };
    [Symbol.iterator](): Iterator<[Uint8Array, { escrow: bigint,
  specCommitment: Uint8Array,
  payoutCommitment: Uint8Array,
  resultCommitment: Uint8Array,
  settled: boolean
}]>
  };
  grantsSpent: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  earningsClaimed: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  accrued: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): bigint;
    [Symbol.iterator](): Iterator<[Uint8Array, bigint]>
  };
  readonly governor: Uint8Array;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               governorCommitment_0: Uint8Array): Promise<__compactRuntime.ConstructorResult<PS>>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
export declare const expectedVk: Record<string, string>;
