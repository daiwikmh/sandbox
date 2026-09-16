import { describe, expect, it } from 'vitest';
import {
  type JubjubPoint,
  CompactTypeBytes,
  CompactTypeJubjubPoint,
  ContractState,
  createCircuitContext,
  createConstructorContext,
  ecAdd,
  ecMul,
  ecMulGenerator,
  jubjubPointX,
  jubjubPointY,
  sampleContractAddress,
  transientHash,
} from '@midnight-ntwrk/compact-runtime';
import { Contract, ledger } from '../spike-l8/contract/index.js';

const CPK = '0'.repeat(64);
const ORDER = 6554484396890773809930967563523245729705921265872317281365359162392183254199n;
const MASK = (1n << 128n) - 1n;
const BYTES_32 = new CompactTypeBytes(32);

const CHALLENGE_TYPE = {
  alignment: () => [
    ...CompactTypeJubjubPoint.alignment(),
    ...CompactTypeJubjubPoint.alignment(),
    ...BYTES_32.alignment(),
  ],
  toValue: (x: { r: JubjubPoint; pk: JubjubPoint; msg: Uint8Array }) => [
    ...CompactTypeJubjubPoint.toValue(x.r),
    ...CompactTypeJubjubPoint.toValue(x.pk),
    ...BYTES_32.toValue(x.msg),
  ],
  fromValue: () => { throw new Error('nope'); },
} as never;

const reduce = (v: bigint) => ((v % ORDER) + ORDER) % ORDER;

describe('ledger-8 truncated challenge', () => {
  it('accepts a signature whose challenge is the low 128 bits of the hash', async () => {
    const secret = reduce(987654321123456789n);
    const pk = ecMulGenerator(secret);
    const msg = new Uint8Array(32).fill(7);

    const k = reduce(555666777888n);
    const r = ecMulGenerator(k);
    const h = transientHash(CHALLENGE_TYPE, { r, pk, msg });
    const e = h & MASK;
    const s = reduce(k + e * secret);

    const contract = new Contract<Record<string, never>>({
      sigS: (ctx: never) => [ctx, s] as never,
      sigR: (ctx: never) => [ctx, r] as never,
    } as never);
    const { currentContractState } = contract.initialState(
      createConstructorContext({}, CPK) as never,
    );
    const ctx = createCircuitContext(sampleContractAddress(), CPK, currentContractState, {});
    const { context } = await contract.impureCircuits.verify(ctx as never, pk, msg);
    const next = new ContractState();
    next.data = context.currentQueryContext.state;
    expect(ledger(next.data).ok).toBe(1n);
    expect(h > MASK).toBe(true);
  });
});
