# Zylo — refactor to a confidential data vault on Midnight

**Status: built.** All six phases executed. `PLAN.md` and `DARKPOOL.md` were
retired in Phase 1. What follows is the plan as written, annotated where the
build contradicted it — the annotations matter more than the plan did.

## What the build changed about this plan

| Plan said | Reality | Why |
|---|---|---|
| Attestation signed with ECDSA (`secp256k1EcdsaVerify`) | **Schnorr over Jubjub** | secp256k1 is entirely absent from the shipped 0.34.0 stdlib despite the release notes. Jubjub is native and 4x cheaper than one SHA-256. |
| Enclave written in Go | **TypeScript** | The enclave must compute `transientHash` bit-identically to the circuit. The only correct implementation is the official `compact-runtime`; reimplementing Midnight's hash in Go is a correctness risk with no upside. |
| Spend ZK "where it is cheap" | **SHA-256 is the only expensive thing** | `persistentHash` costs 2.8 MB; `transientHash` 22 KB; Schnorr 687 KB. Key sizes bucket to powers of two, so the first hash dominates and further ones are ~free. |
| Storage on Cloudflare R2 | **Not built** | The blob path is exercised in-browser and over HTTP against the enclave. Swapping the transport for R2 is mechanical and untouched by any of the crypto. |
| Deployable once written | **Not deployable yet** | `midnight-js` 4.1.1 targets ledger 8; this contract targets ledger 9. See the README's "Why it is not deployed". |
| Keep the orbit landing and Tailwind shell | **Replaced twice** | The UI was re-skinned on request — briefly onto a light bento design, then onto the current editorial one (photographic scanner landing, sidebar dashboard, self-hosted DM Sans). Tailwind was dropped; the ported stylesheets are the design system. |

Phase 0 earned its place: three of the five rows above were found by spikes
before a line of the contract was written.


Users upload datasets that stay encrypted and never leave their control in the
clear. Buyers pay to *compute* on those datasets without ever seeing them.
Owners earn tDUST, and nobody — not the buyer, not an observer, not the operator
— can tell which dataset earned it or who owns it.

---

## 1. What is actually being built

Three parties, one contract, one enclave.

| Party | Holds | Never sees |
|---|---|---|
| **Owner** | the dataset, its encryption key, `ownerSecret` | who computed on their data |
| **Buyer** | a job spec, tDUST, the result | the dataset, its rows, its owner |
| **Enclave** | plaintext in memory, for one job | the key after the job ends |
| **Ledger** | commitments, nullifiers, escrow, allowlist | everything else |

The dataset is stored encrypted off-chain. The enclave is the only place
plaintext ever exists, and only in memory, only for the duration of one job, only
after the chain has agreed the job was paid for and the enclave is genuine.

### What Midnight enforces — and what it does not

This distinction is the whole integrity story. State it this way in the README
too; overclaiming here is the fastest way to lose credibility.

**Midnight cryptographically enforces:**

1. **Dataset integrity** — the enclave computed on exactly the bytes committed at
   registration. A swapped or truncated dataset fails the Merkle root check.
2. **Enclave authenticity** — a decryption key is only ever released to an
   enclave whose signing key is on the on-chain allowlist. Verified in-circuit
   with `secp256k1EcdsaVerify`.
3. **Payment atomicity** — escrow is released only against a signed result
   commitment, and each job's escrow is claimable exactly once (nullifier).
4. **Consent** — a job runs only if it satisfies the owner's committed terms
   (price, permitted job class), proved without revealing which dataset it is.
5. **Unlinkability** — no observer can link a job to a dataset, a payout to a
   job, an owner to a listing, or two jobs by the same buyer.

**Midnight does not enforce:**

- **That the computation was correct.** That rests on hardware attestation.
  A broken TEE is a broken result. This is the cost of choosing attested compute
  over in-circuit proving, and it is the right trade — see §2.
- **That an adversarial buyer cannot reconstruct data from results.** Results are
  an exfiltration channel. Mitigated in §5.3, never eliminated.

---

## 2. Why compute is attested, not proved

Measured, not assumed. The current `placeOrder` circuit performs three SHA-256
hashes and three asserts. Its proving key is **5.2 MB**:

```
5208836  managed/darkpool/keys/placeOrder.prover
5216454  managed/darkpool/keys/settle.prover
```

Midnight's own documentation benchmarks a Merkle root over seven SHA-256
operations at **330,077 constraints and a 138.5 MB proving key**. Proving keys
are downloaded and held in memory by the prover.

Extrapolating: an aggregate over even a few thousand rows in-circuit produces a
proving key measured in gigabytes and a proof that never finishes on a laptop,
let alone the Capacitor mobile build. In-circuit computation over user datasets
is not a tuning problem. It is off the table.

So the ZK is spent where it is cheap and decisive — commitments, membership,
signature checks, nullifiers, escrow — and the computation runs in an enclave
whose authenticity the ZK verifies.

---

## 3. Repository layout

```
zylo/
├── contracts/
│   └── vault.compact          # the one contract
├── managed/vault/             # compiled circuits + keys (committed)
├── tests/
│   ├── vault.test.ts
│   └── vault-simulator.ts
├── enclave/                      # Go, runs inside AWS Nitro
│   ├── cmd/enclave/main.go
│   ├── internal/attest/          # Nitro attestation doc, signing key
│   ├── internal/runner/          # the bounded job runtime
│   ├── internal/dataset/         # fetch, verify Merkle root, decrypt
│   └── internal/keyring/         # sealed key custody
├── host/                         # Go, the untrusted parent instance
│   ├── vsock proxy, blob fetch, job queue
├── crypto/                       # TS, shared browser + enclave format
│   ├── chunk.ts                  # chunking + per-chunk hash + Merkle root
│   └── envelope.ts               # AES-256-GCM + key wrapping
└── app/                          # Next.js (the stripped zylofinance)
```

`contracts/darkpool.compact`, `managed/darkpool/`, `tests/darkpool*` are deleted
in Phase 1. They stay in git history. The commitment/nullifier pattern in that
contract is lifted directly — it is a good template and the new contract reuses
its shape.

---

## 4. The contract

One contract. Cross-contract calls exist in ledger 9 but buy nothing here and
cost real complexity.

### 4.1 Ledger state

```compact
export ledger listings: MerkleTree<12, Bytes<32>>;
export ledger listingCount: Counter;
export ledger catalog: Map<Bytes<32>, Listing>;
export ledger enclaveKeys: Set<Bytes<32>>;
export ledger jobs: Map<Bytes<32>, Job>;
export ledger grantsSpent: Set<Bytes<32>>;
export ledger earningsClaimed: Set<Bytes<32>>;
export ledger governor: Bytes<32>;
```

`listings` is a Merkle tree so a job can prove *"this targets some listed
dataset whose price I covered"* without saying which. Depth 12 holds 4,096
datasets; raise it when that binds. `catalog` is the public, browsable side —
schema hash, row count, price, job classes. The offer is public; the data, the
owner and the buyer are not. This mirrors the dark pool's public book size over
private terms.

### 4.2 Circuits

| Circuit | Private inputs | Reaches the ledger |
|---|---|---|
| `registerDataset` | `ownerSecret`, dataset key, Merkle root of chunks | listing leaf, public terms |
| `requestJob` | `buyerSecret`, target dataset, job spec, listing path | job id, escrow, spec commitment |
| `grantAccess` | job details, enclave pubkey | grant nullifier, enclave binding |
| `settleJob` | result, enclave signature | result commitment, escrow split |
| `claimEarnings` | `ownerSecret`, accrual path | payout nullifier, coin out |
| `allowlistEnclave` | governor secret | enclave signing key |

The interesting one:

```compact
export circuit requestJob(
  datasetId: Bytes<32>,
  price: Uint<64>,
  path: MerkleTreePath<12, Bytes<32>>,
  jobSpec: Bytes<32>,
  escrow: QualifiedShieldedCoinInfo
): [] {
  const leaf = persistentHash<Vector<3, Bytes<32>>>(
    [pad(32, "zylo:listing:v1"), datasetId, priceBytes(price)]
  );
  assert(listings.checkRoot(merkleTreePathRoot<12, Bytes<32>>(path)), "stale listing root");
  assert(escrow.value >= price, "escrow below listed price");

  receiveShielded(escrow);

  const jobId = persistentCommit<Vector<2, Bytes<32>>>(
    [datasetId, jobSpec], buyerSecret()
  );
  jobs.insert(disclose(jobId), newJob(escrow.value));
}
```

`datasetId` is a private circuit input. The ledger learns a job exists and what
it escrowed — never which dataset it points at.

### 4.3 Earning unlinkably

The naive design pays the owner inside `settleJob`. That links owner to job in
one transaction and throws away most of the privacy.

Instead `settleJob` accrues the payout to a *commitment* derived from the
listing. The owner later calls `claimEarnings` at a moment of their choosing,
proving in zero knowledge that they hold `ownerSecret` for an accrued listing,
burning a payout nullifier, and receiving tDUST via `sendShielded`.

Settlement and payout are separate transactions, separately timed, with no
on-chain link between them. This is the circuit that earns the "earn in
Midnight" claim rather than asserting it.

### 4.4 The attestation bind — and its honest limit

Full Nitro attestation verification (CBOR document, x509 chain to the AWS root)
in-circuit is far outside the constraint budget. The realistic split:

1. **Off-chain, once per enclave build:** an operator verifies the full
   attestation document, confirms the PCR measurements match the reproducible
   build, and extracts the enclave's ephemeral secp256k1 signing key.
2. **On-chain, once:** `allowlistEnclave` records that public key, governor-gated.
3. **On-chain, every job:** `grantAccess` and `settleJob` verify a cheap ECDSA
   signature from an allowlisted key using `secp256k1EcdsaVerify`.

**The trust assumption, stated plainly:** the governor is trusted to only
allowlist keys backed by a genuine attestation of a reproducible build. That is
a real assumption and the README must say so. It narrows over time — publish the
build hash, let anyone reproduce it, move the governor to a multisig, eventually
to a committee of verifiers. It does not disappear.

---

## 5. The enclave

**Runtime: AWS Nitro Enclaves, Go.** Nitro gives real attestation with no special
hardware to buy, a clean vsock isolation boundary, and no SGX toolchain. Go for
continuity with the previous enclave work.

### 5.1 Job lifecycle

1. Host receives a job, passes `jobId` + blob locations over vsock.
2. Enclave reads the on-chain job and listing via the host (untrusted transport,
   verified content).
3. Enclave receives the wrapped dataset key, unwrappable only by the key sealed
   to its attestation.
4. Enclave streams the encrypted blob, decrypts chunk by chunk, and recomputes
   the Merkle root. **Root mismatch aborts the job.**
5. Runs the job in the bounded runtime (§5.3).
6. Signs `(jobId, datasetRoot, resultHash)` with its attested key.
7. Returns the result encrypted to the buyer's public key; zeroes all key
   material and plaintext.

Plaintext never touches disk. The enclave has no persistent storage and no
network — the host is the only channel, and everything from the host is verified
against an on-chain commitment before it is trusted.

### 5.2 What the host can and cannot do

The host is untrusted and assumed hostile. It can refuse to run jobs, delay them,
or lie about chain state. It cannot read plaintext, forge a result signature, or
learn the dataset key. Liveness depends on the host; confidentiality does not.

### 5.3 The exfiltration problem

**A buyer who can request arbitrary computation and read unbounded results has
simply downloaded the dataset in a slow, expensive way.** This is the central
product risk and it is a design constraint, not a footnote.

Mitigations, in order of importance:

- **A bounded job DSL, not arbitrary code.** Aggregates, group-bys, fitted model
  parameters, summary statistics. No row-level output, ever. Job classes are
  committed in the listing and checked by the enclave.
- **Result size caps** enforced in the enclave, proportional to job class, never
  to dataset size.
- **Minimum group sizes** — refuse any group-by whose cells fall below `k` rows.
- **Per-dataset query budgets**, tracked on-chain as a counter on the listing.
  Owners set the budget; exhaustion requires a new listing.
- **Differential privacy noise** on numeric aggregates, with the epsilon in the
  listing terms so buyers know what they are buying.

The first three are Phase 2 and non-negotiable. Budgets and DP are Phase 6.

---

## 6. Storage and client crypto

**Cloudflare R2.** S3-compatible, no egress fees, and the project already has
Cloudflare tooling configured.

The browser does all of it before a byte leaves the machine:

1. Chunk the file at 1 MiB.
2. `SHA-256` each chunk; build a Merkle tree; the root is the dataset commitment.
3. Generate a random AES-256-GCM key; encrypt each chunk with a per-chunk nonce.
4. Upload ciphertext to R2 via a presigned URL.
5. Wrap the dataset key to the allowlisted enclave keys; store the wrapped blobs.
6. Call `registerDataset` with the root and terms.

`crypto/` is shared TypeScript so the browser encryptor and the enclave decryptor
cannot drift — a format mismatch is a silent data-loss bug otherwise. The Go
enclave reimplements only the read path, tested against browser-produced vectors.

---

## 7. Frontend: what dies, what lives

From the current 7,305 lines under `app/`, roughly 2,700 survive.

### Delete — Flare, FAssets, XRPL, smart accounts (~4,600 lines)

```
app/src/contracts/{abis,markets,client,config}.ts          689
app/src/utils/etherspot.ts                                 290
app/src/services/{fdc,portfolio,analytics,transaction}Service.ts  479
app/src/services/{mintSessionStore,xamanService,darkPoolService}.ts  346+
app/src/components/{mint,redeem,vault,send,portfolio,pool}/  ~2,100
app/src/providers/{wallet,smart-account}.tsx               162
app/src/hooks/{useTxSender,usePoolSession}.ts              125
app/api/{xaman,fdc,pool}/                                  ~250
app/(app)/{fxrp,redeem,send,analytics,pool,dashboard}/
```

Dependencies dropped: `wagmi`, `viem`, `@etherspot/prime-sdk`, `xumm-sdk`.
Tests dropped: `calls`, `markets`, `mintSessionStore`.

### Keep — the shell and the design system (~2,700 lines)

```
app/src/components/landing/*        1,343   the orbit poster, untouched
app/src/components/ui/index.tsx       144   Card Button Stat Chip Spinner Row Empty Notice Mono
app/src/components/shell/*            ~290   DashboardShell, PageHeader
app/src/components/auth/*             ~180   AuthGuard, LoginScreen — rewired to Lace
app/globals.css, layout.tsx, tailwind/postcss/eslint/tsconfig
android/, capacitor.config.ts
tests/format.test.ts
```

The landing page needs new copy, not new code. `DashboardShell` needs a new nav
list. The UI primitives carry over unchanged — that is the whole reason to strip
rather than greenfield.

### Build — the new surfaces

| Route | What it does |
|---|---|
| `/datasets` | Your datasets: commitment, terms, query budget, accrued earnings |
| `/upload` | Chunk, hash, encrypt, upload, register — with real progress |
| `/catalog` | Browse public listings: schema, row count, price, job classes |
| `/compute` | Compose a job, see the price, escrow, watch it run, read the result |
| `/earnings` | Accrued balance and the unlinkable claim flow |
| `/settings` | Wallet, network, contract address, enclave allowlist, proof server |

### Wallet and providers

`wagmi` is replaced by `@midnight-ntwrk/dapp-connector-api` (Lace) and a
`MidnightProviders` object:

```
@midnight-ntwrk/midnight-js-contracts                    deploy + call
@midnight-ntwrk/midnight-js-network-id
@midnight-ntwrk/midnight-js-types
@midnight-ntwrk/midnight-js-indexer-public-data-provider  GraphQL chain reads
@midnight-ntwrk/midnight-js-http-client-proof-provider    remote proof server
@midnight-ntwrk/midnight-js-level-private-state-provider  encrypted local state
@midnight-ntwrk/midnight-js-fetch-zk-config-provider      browser ZK artifacts
```

`ownerSecret` and `buyerSecret` live in the private state provider. **Losing that
state means losing the ability to claim earnings** — the recovery story (seed
phrase derivation, exportable secrets) is a Phase 5 requirement, not a nicety.

---

## 8. Phases

Each phase states what it retires. Nothing is claimed done without the evidence
named in the last column.

### Phase 0 — Spikes. Retire the cost unknowns before committing.

The whole plan assumes three circuits are affordable. Measure them first.

| Spike | Question | Evidence |
|---|---|---|
| 0.1 | What does `secp256k1EcdsaVerify` cost in a circuit? | proving key size on disk |
| 0.2 | What does a depth-12 Merkle path check cost? | proving key size on disk |
| 0.3 | Both together, plus escrow — still provable in a browser? | wall-clock proof time |
| 0.4 | Can a contract hold and pay out coins? | `receiveShielded` → `sendShielded` round trip, green test |

**0.4 is the fiddliest part of Compact and the least documented.** Budget real
time for it. If 0.1–0.3 blow the budget, the fallback is to move the ECDSA check
off-circuit and bind via a commitment instead — weaker, and worth knowing before
Phase 1 rather than during Phase 4.

### Phase 1 — Contract

Write `vault.compact`, all six circuits. Port the simulator harness from
`tests/darkpool-simulator.ts` — it is good and it transfers directly. Delete the
dark pool. Retire `PLAN.md` and `DARKPOOL.md`.

*Verify:* `compact compile` emits six circuits. Tests cover every circuit, both
nullifier paths, the escrow split, a stale Merkle root rejection, a non-allowlisted
enclave rejection, and four privacy assertions of the form *"the ledger never
holds X."*

### Phase 2 — Enclave

Nitro image, attestation, key sealing, dataset fetch and root verification, the
bounded job runtime, result signing. Reproducible build with published PCRs.

*Verify:* a job runs end to end against a fixture dataset in a real Nitro
enclave; a tampered blob aborts on root mismatch; the signature verifies against
the Phase 1 circuit.

### Phase 3 — Storage and crypto

`crypto/` in TypeScript, the read path in Go, cross-tested against shared
vectors. R2 buckets and presigned upload.

*Verify:* a 100 MB file round-trips browser → R2 → enclave with a matching root,
and a cross-language vector test passes in both languages.

### Phase 4 — Strip

Execute §7's delete list in one commit. Drop the four dependencies. Get a green
`typecheck` and `build` with the shell, landing and UI primitives intact and
nothing else.

*Verify:* `npm run build` clean, `npm run typecheck` clean, landing page renders,
zero references to `wagmi`, `viem`, `etherspot`, `xumm`, `flare`, `fxrp`.

### Phase 5 — Frontend

Midnight providers, Lace connect, then the six routes. Secret backup and
recovery.

*Verify:* driven in a real browser against Preprod — a dataset registered, a job
requested and paid, a result read, earnings claimed. Not by inspection.

### Phase 6 — Hardening

Query budgets, differential privacy, the governor multisig, the mobile proof
story, indexer-backed catalog pagination.

---

## 9. Risks

| Risk | Severity | Response |
|---|---|---|
| Circuits from Phase 0 exceed the proving budget | **High** | Phase 0 exists to find this in week one; fallback is an off-circuit ECDSA bind |
| Result channel leaks the dataset | **High** | Bounded DSL + result caps + k-anonymity in Phase 2; budgets and DP in Phase 6 |
| Governor is a single trusted party | **Medium** | Stated openly; reproducible builds and published PCRs; multisig in Phase 6 |
| Browser proving is too slow on real hardware | **Medium** | Remote proof server via the HTTP proof provider; measure in Phase 0.3 |
| Capacitor mobile cannot download multi-MB proving keys | **Medium** | Hosted proof server for mobile; if it does not hold, ship web-first and say so |
| Losing private state loses earnings | **Medium** | Derive secrets from the wallet seed; exportable backup is a Phase 5 blocker |
| Nitro ties the project to AWS | **Low** | The attestation interface is abstracted; TDX/SEV-SNP are drop-in later |

---

## 10. The first thing to do

Phase 0.4 — prove a Compact contract can take a coin in and pay one out. It is
the least documented step, it is load-bearing for the entire "owners earn" thesis,
and everything else in this plan is conventional by comparison.
