"use client";

import { useEffect } from 'react';
import '../../../styles/landing.css';
import '../../../styles/app.css';
import { initLanding } from './landing-script';

const SCENE = { base: 'yard', mesh: 'yard-mesh', xray: 'yard-xray' } as const;

const STAGES = [
  { name: 'Publish', description: 'Commit a dataset on Midnight before a single byte is readable.', position: 'issue' },
  { name: 'Escrow', description: 'A buyer locks tDUST against a listing without naming which one.', position: 'verify' },
  { name: 'Attest', description: 'Only an enclave whose key is allowlisted on-chain receives the unlock.', position: 'collateral' },
  { name: 'Settle', description: 'The contract checks the enclave signature, then accrues your earnings.', position: 'settlement' },
];

const APPLICATIONS = [
  {
    id: 'collateral',
    tab: 'Private datasets',
    audience: 'FOR DATA OWNERS',
    title: 'The data stays put. The value moves.',
    text: 'Encrypt a dataset in your own browser and list only its shape and its price. Buyers pay for an answer; the rows never leave the enclave, and the ledger never sees them.',
    image: SCENE.base,
    label: 'DATASET / MERKLE COMMITMENT',
    facts: [
      ['Held', 'Encrypted chunks, one Merkle root'],
      ['Earned', 'Shielded tDUST on Midnight'],
      ['Gate', 'Proved enclave signature'],
    ],
  },
  {
    id: 'price',
    tab: 'Attested compute',
    audience: 'FOR BUYERS & ANALYSTS',
    title: 'An answer nobody has to be trusted for.',
    text: 'The enclave recomputes the Merkle root before it decrypts anything. A swapped or truncated blob aborts the job, so the result you buy is bound to exactly the bytes that were published.',
    image: SCENE.mesh,
    label: 'ENCLAVE / SCHNORR OVER JUBJUB',
    facts: [
      ['Evidence', 'Signed result commitment'],
      ['Verifier', 'In-circuit signature check'],
      ['Operators', 'None in the trust path'],
    ],
  },
  {
    id: 'default',
    tab: 'Bounded queries',
    audience: 'FOR PRIVACY TEAMS',
    title: 'A result is not a download.',
    text: 'Counts, aggregates and grouped aggregates — never a row. Minimum group sizes, a hard result cap and a per-listing query budget are what stop a buyer reconstructing a dataset one narrow question at a time.',
    image: SCENE.base,
    label: 'RUNNER / K-ANONYMITY ENFORCED',
    facts: [
      ['Floor', '25 rows minimum per group'],
      ['Ceiling', '8 KB, 64 groups per query'],
      ['Budget', 'Set by the owner, spent on-chain'],
    ],
  },
];

const WORKFLOW = ['Publish the dataset', 'Escrow the payment', 'Run inside the enclave', 'Claim the earnings'];

const Arrow = () => (
  <svg className="arrow" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 12h15m-6-6 6 6-6 6" />
  </svg>
);

export function Landing() {
  useEffect(() => initLanding(), []);


  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <nav className="navigation" aria-label="Main navigation">
          <a className="wordmark" href="#home" aria-label="Zylo home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="mark" src="/logo.png" alt="" width="28" height="28" />
            zylo<span>vault</span>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M8 1 15 8 8 15 1 8Z" />
            </svg>
          </a>
          <button className="menu-toggle" aria-expanded="false" aria-controls="nav-links">
            Menu <span aria-hidden="true">+</span>
          </button>
          <div className="nav-links" id="nav-links">
            <a href="#home" className="active">Home</a>
            <a href="#assets">What it does</a>
            <a href="#platform">Proof path</a>
            <a href="#network">Developers</a>
          </div>
          <a className="nav-cta" href="/datasets">
            <Arrow /> Open the dashboard
          </a>
        </nav>
      </header>

      <main id="main">
        <section id="home" className="hero scanner" data-scanner aria-label="Interactive data landscape">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="map-photo" src={`/images/${SCENE.base}.webp`} width={1376} height={768} alt="A container terminal at night, standing in for datasets nobody can read" fetchPriority="high" />
          <canvas className="scan-canvas" aria-hidden="true" />
          <div className="hero-heading">
            <h1>
              They buy the answer.<br className="mobile-break" /> Never the data.
            </h1>
            <p>Encrypted datasets on Midnight, computed by an attested enclave and paid for in shielded tDUST.</p>
          </div>
          <div className="scan-controls">
            <button className="scan-toggle" aria-pressed="false">
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M5 3v10M11 3v10" />
              </svg>
              <span>Pause scan</span>
            </button>
            <span className="scan-hint">Move to discover ↗</span>
          </div>
          <div className="hero-caption">
            <span className="status-dot" /> Interactive visualisation <span>/</span> Midnight testnet
          </div>
          <a className="scroll-cue" href="#about" aria-label="Discover Zylo">
            <svg className="arrow" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3v17m-6-6 6 6 6-6" />
            </svg>
          </a>
        </section>

        <section className="intro section-frame" id="about">
          <h2>
            You hold the data.<br />Midnight holds the proof.<br />Nobody holds both.
          </h2>
          <div className="intro-bottom">
            <span className="section-name">
              <i /> WHY ZYLO
            </span>
            <p>
              Data marketplaces sell a download and trust you to behave. Zylo never hands the data
              over — an enclave computes on it and the chain enforces which bytes, which enclave,
              and that you were paid.
            </p>
          </div>
          <span className="frame-node left" />
          <span className="frame-node right" />
        </section>

        <section className="asset-landscape scanner" data-scanner id="platform" aria-labelledby="landscape-title">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="map-photo" src={`/images/${SCENE.base}.webp`} width={1376} height={768} loading="lazy" alt="The proof path, annotated" />
          <canvas className="scan-canvas" aria-hidden="true" />
          <div className="pixel-edge" aria-hidden="true">
            <i /><i /><i /><i />
          </div>
          <h2 id="landscape-title">
            One dataset.<br />Four proofs. No operator.
          </h2>
          <div className="asset-pins">
            {STAGES.map((stage, i) => (
              <button key={stage.name} className={`asset-pin ${stage.position}`} data-stage={i} aria-expanded={i === 0}>
                <span className="pin-anchor" aria-hidden="true" />
                <span className="pin-content">
                  <span className="pin-title">
                    {stage.name}
                    <span aria-hidden="true">↗</span>
                  </span>
                  <span className="pin-description">{stage.description}</span>
                </span>
              </button>
            ))}
          </div>
          <span className="landscape-caption">SELECT A POINT TO EXPLORE THE PROOF PATH</span>
        </section>

        <section className="connection section-frame" aria-labelledby="connection-title">
          <div className="section-heading">
            <h2 id="connection-title">
              From an encrypted file<br />to earnings you can claim.
            </h2>
            <p>
              The dataset is committed and the payment escrowed before anything is unlocked. Both
              are checked in zero knowledge before a single byte is decrypted.
            </p>
          </div>
          <div className="connection-graphic" aria-label="A dataset connects to commitment, escrow, attestation and payout">
            <svg className="connection-lines" viewBox="0 0 1000 360" preserveAspectRatio="none" aria-hidden="true">
              <path d="M120 80H360L500 180 640 80H880M120 280H360L500 180 640 280H880M500 0V360" />
              <path className="flow-line" d="M120 80H360L500 180 640 280H880" />
            </svg>
            <div className="connection-center">
              <div className="diamond-stack" aria-hidden="true">
                <i /><i /><i />
              </div>
              <strong>zylo</strong>
              <span>vault</span>
            </div>
            <span className="connection-label top-left">Merkle commitment</span>
            <span className="connection-label bottom-left">Shielded escrow</span>
            <span className="connection-label top-right">Enclave attestation</span>
            <span className="connection-label bottom-right">Unlinkable payout</span>
          </div>
          <div className="tech-strip">
            <span>BUILT AROUND</span>
            <span className="hedera-mark">◈ <b>Midnight</b></span>
            <span>Compact circuits</span>
            <span>AWS Nitro Enclaves ↗</span>
          </div>
        </section>

        <section className="applications section-frame" id="assets" aria-labelledby="applications-title">
          <div className="section-heading">
            <h2 id="applications-title">
              Real data.<br />Real evidence.
            </h2>
            <p>Three places where Zylo replaces a promise with something the contract can check for itself.</p>
          </div>
          <div className="application-tabs" role="tablist" aria-label="Zylo applications">
            {APPLICATIONS.map((app, i) => (
              <button
                key={app.id}
                id={`tab-${app.id}`}
                role="tab"
                aria-selected={i === 0}
                aria-controls={`panel-${app.id}`}
                tabIndex={i === 0 ? 0 : -1}
                data-tab={app.id}
              >
                {app.tab}
                <span aria-hidden="true">↗</span>
              </button>
            ))}
          </div>
          {APPLICATIONS.map((app, i) => (
            <div
              key={app.id}
              className="application-panel"
              id={`panel-${app.id}`}
              role="tabpanel"
              aria-labelledby={`tab-${app.id}`}
              tabIndex={0}
              hidden={i !== 0}
            >
              <div className={`application-image ${app.id}-image`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/images/${app.image}.webp`} alt={`Visualisation for ${app.tab.toLowerCase()}`} loading="lazy" width={2752} height={1536} />
                <span className="image-bracket" />
                <span className="image-label">{app.label}</span>
              </div>
              <div className="application-content">
                <span className="small-label">{app.audience}</span>
                <h3>{app.title}</h3>
                <p>{app.text}</p>
                <dl>
                  {app.facts.map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
                <a className="text-link" href="#explore">
                  Explore the workflow <Arrow />
                </a>
              </div>
            </div>
          ))}
          <p className="section-footnote">
            Midnight testnet. The contract, the crypto and the enclave runtime are tested end to
            end; deployment waits on midnight-js supporting the ledger this contract targets.
          </p>
        </section>

        <section className="demo-section section-frame" id="explore" aria-labelledby="demo-title">
          <div className="section-heading">
            <h2 id="demo-title">
              See the proof path.<br />Follow the evidence.
            </h2>
            <p>A small, interactive look at how an encrypted file becomes claimable tDUST.</p>
          </div>
          <div className="demo-workspace">
            <div className="demo-summary">
              <span className="small-label">
                <i className="status-dot" /> INTERACTIVE DEMO
              </span>
              <h3>Zylo Data vault</h3>
              <p>Walk the proof path here · Run a real job on the dashboard.</p>
              <div className="demo-asset-mark" aria-hidden="true">
                <svg viewBox="0 0 200 200">
                  <path d="m100 20 80 45v75l-80 45-80-45V65Zm0 0v80m-80-35 80 35 80-35m-80 35v85m-80-45 80-40 80 40" />
                </svg>
              </div>
              <span className="demo-caption">A CLEAR PATH FROM FILE TO PAYOUT</span>
            </div>
            <div className="demo-flow">
              <ol className="workflow-steps">
                {WORKFLOW.map((step, i) => (
                  <li key={step} data-demo-step={i} className={i === 0 ? 'current' : ''}>
                    <span className="step-number">0{i + 1}</span>
                    <span>{step}</span>
                    <span className="step-state">{i === 0 ? 'Ready' : 'Upcoming'}</span>
                  </li>
                ))}
              </ol>
              <div className="demo-next">
                <p id="demo-description" aria-live="polite">
                  Start by committing an encrypted dataset on Midnight.
                </p>
                <button className="dark-button" id="demo-advance">
                  <span>Escrow payment</span>
                  <Arrow />
                </button>
                <button className="reset-button" id="demo-reset">
                  Reset demo
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="access-section section-frame" id="network">
          <div className="section-heading">
            <h2>
              One proof layer.<br />Two ways to connect.
            </h2>
            <p>For the people who own the data and the developers wiring compute into it.</p>
          </div>
          <div className="access-columns">
            <article>
              <span className="small-label">DATA OWNERS</span>
              <h3>
                Bring your dataset.<br />Keep it where it lives.
              </h3>
              <p>
                Encrypt it in your browser, publish only a commitment and a price, and collect tDUST
                whenever someone computes on it.
              </p>
              <a className="text-link" href="#assets">
                Discover the workflows <span aria-hidden="true">→</span>
              </a>
            </article>
            <article>
              <span className="small-label">DEVELOPER INFRASTRUCTURE</span>
              <h3>
                Connect the proof.<br />Keep your own keys.
              </h3>
              <p>
                The enclave verifies the Merkle root before it decrypts and signs every result. The
                only key in the trust path is the one the governor allowlisted.
              </p>
              <details>
                <summary>
                  View integration overview <span aria-hidden="true">+</span>
                </summary>
                <div className="integration-details">
                  <p>The enclave exposes a small HTTP surface; the browser reaches it through a server-side proxy.</p>
                  <code>
                    GET /info
                    <br />
                    POST /job
                    <br />
                    registerDataset · requestJob
                    <br />
                    grantAccess · settleJob
                    <br />
                    claimEarnings · allowlistEnclave
                  </code>
                  <p>Proof generation runs against a proof server; value-moving calls are signed by the Lace wallet.</p>
                </div>
              </details>
            </article>
          </div>
        </section>

        <section className="closing scanner" data-scanner aria-labelledby="closing-title">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="map-photo" src={`/images/${SCENE.base}.webp`} alt="" width={1376} height={768} loading="lazy" />
          <canvas className="scan-canvas" aria-hidden="true" />
          <div className="closing-content">
            <h2 id="closing-title">
              The data is yours.<br />The evidence is on-chain.
            </h2>
            <a className="light-button" href="/datasets">
              Open the dashboard <Arrow />
            </a>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-top">
          <a className="wordmark" href="#home">
            zylo<span>vault</span>
          </a>
          <p>Confidential data vault, proved on Midnight.</p>
          <div>
            <a href="#assets">What it does</a>
            <a href="#platform">Proof path</a>
            <a href="#network">Developers</a>
            <a href="#about">About Zylo</a>
          </div>
        </div>
        <div className="footer-statement">
          Your data.<br />
          <span>Still yours.</span>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Zylo</span>
          <span>In development · Midnight Testnet</span>
          <a href="#home">Back to top ↑</a>
        </div>
      </footer>
    </>
  );
}
