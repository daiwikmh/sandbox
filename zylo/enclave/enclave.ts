import { type JubjubPoint } from '@midnight-ntwrk/compact-runtime';
import {
  type Keypair,
  type Signature,
  fingerprint,
  generateKeypair,
  sign,
} from '../crypto/attestation.js';
import { type SealedDataset, equal, openDataset } from '../crypto/envelope.js';
import { type WrappedKey, unwrapKeyInEnclave } from '../crypto/keywrap.js';
import { permits, type JobSpec } from './jobspec.js';
import { encodeResult, parseCsv, run, type JobResult, type Privacy } from './runner.js';

export type JobRequest = {
  readonly jobId: Uint8Array;
  readonly datasetRoot: Uint8Array;
  readonly jobClasses: number;
  readonly spec: JobSpec;
  readonly sealed: SealedDataset;
  readonly wrappedKey: WrappedKey;
  readonly privacy?: Privacy;
};

export type JobOutcome = {
  readonly result: JobResult;
  readonly resultCommitment: Uint8Array;
  readonly grantSignature: Signature;
  readonly resultSignature: Signature;
};

async function commit(bytes: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as BufferSource));
}

export class Enclave {
  private readonly keypair: Keypair;

  constructor(keypair: Keypair = generateKeypair()) {
    this.keypair = keypair;
  }

  get publicKey(): JubjubPoint {
    return this.keypair.publicKey;
  }

  get fingerprint(): Uint8Array {
    return fingerprint(this.keypair.publicKey);
  }

  async execute(request: JobRequest): Promise<JobOutcome> {
    if (!permits(request.jobClasses, request.spec)) {
      throw new Error('job class is not permitted by the listing');
    }
    if (!equal(request.sealed.root, request.datasetRoot)) {
      throw new Error('blob root does not match the on-chain dataset commitment');
    }

    const grantSignature = sign(this.keypair, request.jobId);

    let datasetKey: Uint8Array | undefined;
    let plaintext: Uint8Array | undefined;
    try {
      datasetKey = await unwrapKeyInEnclave(request.wrappedKey, this.keypair.secret);
      plaintext = await openDataset(request.sealed, datasetKey);
      const table = parseCsv(new TextDecoder().decode(plaintext));
      const result = run(table, request.spec, request.privacy);
      const resultCommitment = await commit(encodeResult(result));
      return {
        result,
        resultCommitment,
        grantSignature,
        resultSignature: sign(this.keypair, resultCommitment),
      };
    } finally {
      if (datasetKey !== undefined) datasetKey.fill(0);
      if (plaintext !== undefined) plaintext.fill(0);
    }
  }
}
