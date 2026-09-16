<div align="center">

<img src="zylo/app/public/logo.png" alt="" width="64" height="64" />

# Zylo Vault

### They buy the answer. Never the data.

*A confidential data exchange on Midnight — Compact circuits, zero-knowledge proofs, and attested compute*

![Midnight](https://img.shields.io/badge/Midnight-preview%20%C2%B7%20ledger%20v8-7165ed)
![Compact](https://img.shields.io/badge/Compact-0.23%20%2F%20toolchain%200.31.1-252527)
![Circuits](https://img.shields.io/badge/circuits-6-5140c5)
![Tests](https://img.shields.io/badge/tests-72%20passing-1e9e68)
![Status](https://img.shields.io/badge/status-deployed%20on%20preview-1e9e68)

</div>

---

## What it does

Zylo Vault is a confidential data exchange on Midnight where buyers pay for
**answers**, never for the underlying data.

A dataset owner encrypts their file locally, before a byte leaves the machine.
Only a Merkle commitment, a schema, a price and a query budget reach the chain.
A buyer requests a bounded computation — a count, an aggregate, a grouped
statistic — and escrows shielded tDUST against the listing. An attested enclave
verifies the dataset against its on-chain commitment, decrypts it only in
protected memory, runs the query, signs the result, and zeroes the key and
plaintext afterwards. The seller claims their earnings later, in a transaction
nothing links back to the job that produced them.

## The problem it solves

Traditional data marketplaces require the seller to hand over the rows. The
moment a buyer has them, the seller has lost control of how they are copied,
shared or resold — and no contract undoes that.

So the datasets worth the most are the ones that never get listed: clinical
records, transaction histories, industrial telemetry. They stay locked up
because handing them over is the only way anyone has been able to sell them.

Zylo Vault changes what is being sold. The buyer gets a verified answer. The
dataset never moves.

## Live on Midnight preview

| | |
|---|---|
| Contract | [`1951fd9ca36d14c1458c27c80d2f0b7d2d7437c187c875e4d1d28acd9a215882`](https://explorer.preview.midnight.network/contracts/1951fd9ca36d14c1458c27c80d2f0b7d2d7437c187c875e4d1d28acd9a215882) |
| Deploy tx | [`11c63a2b42f580431d7f6190e07beccb36d32f6d2fb732a89e66c8f254da1fe6`](https://explorer.preview.midnight.network/transactions/11c63a2b42f580431d7f6190e07beccb36d32f6d2fb732a89e66c8f254da1fe6) |
| Block | 891,017 |

Six circuits are published on chain: `registerDataset`, `requestJob`,
`grantAccess`, `settleJob`, `claimEarnings`, `allowlistEnclave`.

## How it works

The lifecycle is six circuits and one enclave.

| Step | What happens | Enforced by |
|---|---|---|
| **Publish** | The file is encrypted in the browser (AES-256-GCM, 1 MiB chunks) and reduced to one Merkle root. `registerDataset` writes the commitment, terms, price and budget. | Contract |
| **Request** | A buyer escrows shielded tDUST, proving a Merkle path rather than naming the dataset. | Contract |
| **Grant** | `grantAccess` spends a one-time nullifier, and only for an enclave whose key the governor has allowlisted. | Contract |
| **Compute** | The enclave recomputes the Merkle root before decrypting. A swapped or truncated blob aborts the job. | Enclave |
| **Settle** | The enclave's Schnorr signature is verified *inside the circuit*, then escrow accrues to a payout commitment. | Contract |
| **Claim** | Earnings are withdrawn to a shielded coin, unlinkable to the job that earned them. | Contract |

Private inputs let a user prove a relationship to an on-chain commitment —
"I own this dataset", "this job targets that listing" — without revealing which
one.

## How the data is stored

Three concerns are kept separate, and only one of them involves a server.

| | Where it lives |
|---|---|
| **Plaintext** | Nowhere. It exists only inside the enclave's protected memory, for the duration of one job, and the key and plaintext are zeroed afterwards. |
| **Dataset key** | With the owner. It is wrapped to the enclave's Jubjub public key via ECIES, per job, and never transmitted in the clear. |
| **Ciphertext** | Content-addressed object storage, keyed by the Merkle root the contract already commits to. Chunks are written as `datasets/<root>/<index>`. |

The storage host is **untrusted by construction**. The enclave re-derives the
Merkle root from the chunks it fetched and compares it against the on-chain
commitment before decrypting anything, so a provider that swaps, truncates or
corrupts a chunk causes the job to abort rather than to quietly return a wrong
answer. Content addressing means a wrong byte is a wrong address.

Nothing about this requires trusting the operator, which is why the object store
can be commodity infrastructure.

## Making privacy enforceable, not promised

The hard part was never encryption. It was proving, without trusting anyone,
that a job targeted a committed dataset, that only an authorised enclave could
open it, that payment happened, and that the answers cannot be reassembled into
the rows.

Reconstruction is the subtle one. A buyer who can ask enough narrow questions
can rebuild a dataset one answer at a time, so the limits are structural rather
than advisory:

- **k-anonymity floor** — any selection or group under **25 rows** is refused
  outright, and groups below the threshold are dropped from grouped results.
- **Result ceiling** — 64 groups and 8 KB per query.
- **Query budget** — set by the owner at publish time, decremented on chain, and
  the contract refuses the job when it is spent.
- **Optional Laplace noise** — per job, at a caller-supplied epsilon and
  sensitivity.
- **Bounded query language** — counts, aggregates and grouped aggregates only.
  There is no expression that returns a row.
- **Key hygiene** — the dataset key and plaintext are zeroed after every job.

A separate problem was reaching the network at all. The contract was written for
the ledger-9 toolchain; Midnight preview runs ledger v8, whose language has no
Jubjub scalar type and no modular reduction — so the Fiat-Shamir challenge in our
attestation could not be reduced inside the circuit. The easy fix was to truncate
the challenge and accept a weaker signature. We did not ship that. Because the
enclave already reduces off-circuit, the contract does not need to *perform* a
reduction, only **verify** one — so the challenge and its quotient enter as
witnesses and the circuit pins them with an exact field identity. Same scheme,
same challenge, no truncation. [The full derivation is in the project
README.](zylo/README.md)

## Built with

**Midnight** and **Compact** for the circuits and shielded settlement ·
**zero-knowledge proofs** for consent, payment and unlinkability ·
**Merkle trees** for dataset commitment and integrity ·
**Schnorr signatures over Jubjub** for enclave attestation, verified in-circuit ·
**AES-256-GCM** envelope encryption and **ECIES** key wrap ·
**AWS Nitro Enclaves** for attested compute ·
**TypeScript**, **Next.js 16** and **React 19** for the client.

## What we learned

Confidential computing is not really about hiding data — it is about protecting
the whole lifecycle. Registration, computation, payment, settlement and earnings
each leak something different, and a system that only encrypts the file has
secured the least interesting part.

The insight worth keeping: a marketplace can trade **verified information
derived from data** without ever trading the data. Once the answer is the
product, the rows have no reason to move.

## Where things are

Everything lives under [`zylo/`](zylo/). **Start with [`zylo/README.md`](zylo/README.md)** —
architecture, the bounded query language, circuit costs, setup and an honest
status table.

| Path | What it is |
|---|---|
| [`zylo/contracts/`](zylo/contracts/) | `vault.compact` — the one contract, six circuits |
| [`zylo/crypto/`](zylo/crypto/) | Merkle chunking, AES-GCM envelope, ECIES key wrap, Schnorr over Jubjub |
| [`zylo/enclave/`](zylo/enclave/) | Bounded query runner, k-anonymity, attestation |
| [`zylo/app/`](zylo/app/) | Next.js 16 app — publish, browse, compute, claim |
| [`zylo/tests/`](zylo/tests/) | 61 contract, crypto and enclave tests |

## Quickstart

```bash
cd zylo
npm install && npm run compile && npm test   # 61 tests
cd app && npm install && npm run dev
```

Full setup, including the Compact toolchain and proof server, is in
[`zylo/README.md`](zylo/README.md#setup).

## What's next

| | |
|---|---|
| **The loop on chain** | Every page moves onto the deployed vault, so two browsers see one market instead of two private copies. |
| **A real enclave** | Run on AWS Nitro with a published measurement, and make allowlisting a deliberate, auditable act in the UI. |
| **Durable datasets** | Encrypted blobs move to content-addressed storage keyed by the Merkle root the contract already commits to. |
| **Governance** | Governor multisig in place of a single commitment, plus an explicit in-circuit range check on the attestation challenge. |
| **External review** | Independent review of the circuits before real data is invited. |
| **The first stranger** | One third-party dataset listed, one paid query against it, by someone with no connection to the team. |
| **Richer queries** | Joins across two consenting datasets, and broader statistics — each forced through the same floor, ceiling and budget. |
| **Reach** | A mobile client, and an SDK so a data team can list from their own pipeline instead of our upload page. |

## Status

The contract is live on preview and the deploy path is real. The remaining
product pages are not yet wired to it — that is the next milestone. The status
table in [`zylo/README.md`](zylo/README.md#status) says exactly what is verified
and what is not.

> Unaudited testnet software. Do not use it with data you care about.
