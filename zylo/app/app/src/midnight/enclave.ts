import type { JobSpec } from '../types';

export type EnclaveInfo = {
  readonly publicKey: { x: string; y: string };
  readonly fingerprint: string;
  readonly measurement: string;
  readonly attested: boolean;
};

export type JobOutcomeDto = {
  readonly result: unknown;
  readonly resultCommitment: string;
  readonly grantSignature: { nonce: { x: string; y: string }; scalar: string };
  readonly resultSignature: { nonce: { x: string; y: string }; scalar: string };
};

async function call<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/enclave/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `enclave returned ${response.status}`);
  }
  return (await response.json()) as T;
}

export function enclaveInfo(): Promise<EnclaveInfo> {
  return call<EnclaveInfo>('info');
}

export function submitJob(payload: {
  jobId: string;
  datasetId: string;
  spec: JobSpec;
}): Promise<JobOutcomeDto> {
  return call<JobOutcomeDto>('job', payload);
}
