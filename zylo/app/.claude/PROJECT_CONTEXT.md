# Zylo — confidential data vault on Midnight

The web client for a dataset marketplace where the data is never handed over. Owners
publish encrypted datasets; buyers pay tDUST for a bounded computation over them; an
attested enclave runs the job and signs the result.

## Tech stack

- **Framework**: Next.js 16 (App Router), React 19
- **Chain**: Midnight testnet, contract compiled with Compact 0.26 / toolchain 0.34.0
- **Wallet**: Lace, via `@midnight-ntwrk/dapp-connector-api`
- **Chain access**: `midnight-js` providers — indexer, HTTP proof server, fetch ZK config,
  LevelDB private state
- **Crypto**: Web Crypto (AES-256-GCM, SHA-256) plus Jubjub from `@midnight-ntwrk/compact-runtime`
- **Styling**: two hand-written stylesheets (`app/styles/landing.css`, `app/styles/dashboard.css`)
  plus `app.css` for app-specific pieces. No utility framework.
- **Mobile**: Capacitor wraps the running dev/prod server

## Routes

| Route | What it does |
|---|---|
| `/` | Landing — photographic hero with an interactive scanner canvas |
| `/datasets` | Your listings, what they commit to, what they have earned |
| `/upload` | Chunk, hash, encrypt and register a CSV, all client-side |
| `/catalog` | Browse every listing by schema, row count and price |
| `/compute` | Compose a bounded job, run it, read the signed result |
| `/earnings` | Claim accrued tDUST unlinkably |
| `/settings` | Wallet, endpoints, secret backup, enforced limits |
| `/api/enclave/[...path]` | Server-side proxy so the enclave is not publicly addressable |

## Key modules

- `app/src/midnight/wallet.tsx` — Lace detection and connection
- `app/src/midnight/providers.ts` — `midnight-js` provider bundle (lazy; SSR-unsafe WASM)
- `app/src/midnight/secrets.ts` — `ownerSecret` / `buyerSecret`, exportable from Settings
- `app/src/midnight/store.ts` — local listing/job state until a contract is deployed
- `app/src/components/landing/` — landing markup plus the scanner script
- `app/src/components/shell/DashboardShell.tsx` — sidebar, topbar, header facts
- `app/src/components/ui/index.tsx` — the small set of primitives the routes render onto

Shared code lives outside this package and is aliased in `next.config.ts`:
`@zylo/crypto` → `../crypto`, `@zylo/enclave` → `../enclave`.

## State of play

The app encrypts and computes for real. It does **not** settle on chain yet:
`NEXT_PUBLIC_vault_ADDRESS` is unset, so `store.ts` keeps listings and jobs in browser
storage and the shell says so. Encrypted blobs live in `sessionStorage`, which means a
reload loses them — object storage is not wired up.

See the root `README.md` for what is verified and what is not.
