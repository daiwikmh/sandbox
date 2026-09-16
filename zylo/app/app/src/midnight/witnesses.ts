import { ecMulGenerator, type JubjubPoint } from '@midnight-ntwrk/compact-runtime';
import { hexToBytes } from '@zylo/crypto/commitments';
import { ensureSecrets } from './secrets';

export type vaultPrivateState = {
  readonly ownerSecret: Uint8Array;
  readonly buyerSecret: Uint8Array;
  readonly governorSecret: Uint8Array;
  readonly attestationNonce: JubjubPoint;
  readonly attestationScalar: bigint;
  readonly attestationChallenge: bigint;
  readonly attestationChallengeQuotient: bigint;
};

export function initialPrivateState(): vaultPrivateState {
  const secrets = ensureSecrets();
  return {
    ownerSecret: hexToBytes(secrets.ownerSecret),
    buyerSecret: hexToBytes(secrets.buyerSecret),
    governorSecret: hexToBytes(secrets.governorSecret),
    attestationNonce: ecMulGenerator(1n),
    attestationScalar: 0n,
    attestationChallenge: 0n,
    attestationChallengeQuotient: 0n,
  };
}

type Ctx = { privateState: vaultPrivateState };

/**
 * The contract constructor validates that every witness is present, so all seven
 * are supplied even for a deploy, which only reads the governor commitment.
 */
export const witnesses = {
  ownerSecret: (ctx: Ctx): [vaultPrivateState, Uint8Array] => [
    ctx.privateState,
    ctx.privateState.ownerSecret,
  ],
  buyerSecret: (ctx: Ctx): [vaultPrivateState, Uint8Array] => [
    ctx.privateState,
    ctx.privateState.buyerSecret,
  ],
  governorSecret: (ctx: Ctx): [vaultPrivateState, Uint8Array] => [
    ctx.privateState,
    ctx.privateState.governorSecret,
  ],
  attestationNonce: (ctx: Ctx): [vaultPrivateState, JubjubPoint] => [
    ctx.privateState,
    ctx.privateState.attestationNonce,
  ],
  attestationScalar: (ctx: Ctx): [vaultPrivateState, bigint] => [
    ctx.privateState,
    ctx.privateState.attestationScalar,
  ],
  attestationChallenge: (ctx: Ctx): [vaultPrivateState, bigint] => [
    ctx.privateState,
    ctx.privateState.attestationChallenge,
  ],
  attestationChallengeQuotient: (ctx: Ctx): [vaultPrivateState, bigint] => [
    ctx.privateState,
    ctx.privateState.attestationChallengeQuotient,
  ],
};
