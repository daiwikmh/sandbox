# Phase 0 — spike results

Measured on toolchain 0.34.0, language 0.26, ledger 9.

## 0.0 Toolchain reality vs documentation

`secp256k1EcdsaVerify`, `secp256k1EcdsaRecover`, `Secp256k1Point`, `Secp256k1Base`
and `Secp256k1Scalar` are **absent** from the shipped 0.34.0 standard library,
despite the 0.34.0-rc.1 release notes describing them. Probed every plausible
spelling; all unbound.

**Consequence:** the attestation bind cannot use ECDSA. Redesigned to
Schnorr over Jubjub, which is present (`ecMul`, `ecAdd`, `ecMulGenerator`,
`JubjubPoint`, `JubjubScalar`) and is the proving system's embedded curve.

Also corrected against the docs: the coin struct is `ShieldedCoinInfo`
(`nonce`, `color`, `value`), not `CoinInfo`.

## 0.1-0.3 Circuit cost

| Circuit | Proving key |
|---|---|
| 1x `transientHash` | 22 KB |
| 3x `transientHash` | 39 KB |
| `merkleTreePathRootNoLeafHash<12>` | 280 KB |
| **Schnorr verify over Jubjub** | **687 KB** |
| 1x `persistentHash` (SHA-256) | 2.82 MB |
| 3x `persistentHash` | 2.82 MB |
| `merkleTreePathRoot<12>` (hashes leaf) | 2.82 MB |
| `merkleTreePathRoot<20>` (hashes leaf) | 2.82 MB |
| `receiveShielded` | 2.82 MB |
| `sendShielded` | 9.99 MB |
| existing `placeOrder` (3x SHA-256) | 5.21 MB |

**SHA-256 dominates. Elliptic curve work does not.** Schnorr verification is
4x cheaper than a single SHA-256. Key sizes bucket to powers of two, so the
first `persistentHash` costs ~2.8 MB and further ones are nearly free — there is
no point contorting the design to avoid a second hash, and Merkle depth is free
within a bucket.

`sendShielded` at 9.99 MB is the heaviest primitive and lands in `claimEarnings`.
One-time download, cached thereafter, but it rules out proving on constrained
devices.

## 0.4 Escrow

`receiveShielded` compiles and **executes green in the simulator** — deposit
increments ledger state. `sendShielded` compiles. The full payout round trip
needs a real node: a `QualifiedShieldedCoinInfo` carries an `mt_index` assigned
when the coin enters the contract's coin tree, which the offline simulator does
not model. **Untested against a node.**

The compiler's disclosure analysis rejects passing a coin to `receiveShielded`
without an explicit `disclose()` — it flags the receive/commitment linkage. Good
guard rail; every coin path needs a deliberate disclosure.
