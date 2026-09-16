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

Data marketplaces sell a download and trust you to behave. The moment a buyer has
the rows, the seller has lost the data, the leverage, and any say in what happens
next — so the valuable datasets never get listed.

Zylo Vault never hands the data over. A dataset is encrypted in your browser
before a byte leaves the machine; only a Merkle commitment, a schema and a price
reach the chain. A buyer pays for a **computation**. An enclave whose signing key
is allowlisted on-chain verifies the commitment, decrypts in memory, runs a
bounded query, signs the answer and forgets the key. The seller claims tDUST
later, in a transaction nothing links back to the job that earned it.

## Live on Midnight preview

| | |
|---|---|
| Contract | [`1951fd9ca36d14c1458c27c80d2f0b7d2d7437c187c875e4d1d28acd9a215882`](https://explorer.preview.midnight.network/contracts/1951fd9ca36d14c1458c27c80d2f0b7d2d7437c187c875e4d1d28acd9a215882) |
| Deploy tx | [`11c63a2b42f580431d7f6190e07beccb36d32f6d2fb732a89e66c8f254da1fe6`](https://explorer.preview.midnight.network/transactions/11c63a2b42f580431d7f6190e07beccb36d32f6d2fb732a89e66c8f254da1fe6) |
| Block | 891,017 |

Six circuits are published on chain: `registerDataset`, `requestJob`,
`grantAccess`, `settleJob`, `claimEarnings`, `allowlistEnclave`.

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

## Status

The contract is live on preview and the deploy path is real. The product pages
still read and write local state rather than the deployed vault — wiring them up
is the next milestone. The status table in [`zylo/README.md`](zylo/README.md#status)
says exactly what is verified and what is not.

> Unaudited testnet software. Do not use it with data you care about.
