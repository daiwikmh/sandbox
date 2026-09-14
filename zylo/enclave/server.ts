import { createServer } from 'node:http';
import { constructJubjubPoint } from '@midnight-ntwrk/compact-runtime';
import { bootKeypair, describe, pointToHex } from './attest.js';
import { Enclave, type JobRequest } from './enclave.js';

const PORT = Number(process.env.PORT ?? 8088);

const keypair = bootKeypair();
const enclave = new Enclave(keypair);

type SealedDto = {
  root: string;
  byteLength: number;
  chunks: { index: number; nonce: string; ciphertext: string }[];
};

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('hex');
}

async function readBody(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}

const server = createServer((request, response) => {
  void (async () => {
    const send = (status: number, body: unknown) => {
      response.writeHead(status, { 'content-type': 'application/json' });
      response.end(JSON.stringify(body));
    };

    try {
      if (request.method === 'GET' && request.url === '/info') {
        return send(200, await describe(keypair));
      }

      if (request.method === 'POST' && request.url === '/job') {
        const payload = JSON.parse(await readBody(request)) as {
          jobId: string;
          jobClasses: number;
          spec: JobRequest['spec'];
          sealed: SealedDto;
          wrappedKey: { ephemeralPublicKey: { x: string; y: string }; nonce: string; ciphertext: string };
          epsilon?: number;
        };

        const outcome = await enclave.execute({
          jobId: hexToBytes(payload.jobId),
          datasetRoot: hexToBytes(payload.sealed.root),
          jobClasses: payload.jobClasses,
          spec: payload.spec,
          sealed: {
            root: hexToBytes(payload.sealed.root),
            byteLength: payload.sealed.byteLength,
            chunkCount: payload.sealed.chunks.length,
            chunks: payload.sealed.chunks.map((c) => ({
              index: c.index,
              nonce: hexToBytes(c.nonce),
              ciphertext: hexToBytes(c.ciphertext),
            })),
          },
          wrappedKey: {
            ephemeralPublicKey: reconstruct(payload.wrappedKey.ephemeralPublicKey),
            nonce: hexToBytes(payload.wrappedKey.nonce),
            ciphertext: hexToBytes(payload.wrappedKey.ciphertext),
          },
          privacy: payload.epsilon === undefined ? undefined : { epsilon: payload.epsilon },
        });

        return send(200, {
          result: outcome.result,
          resultCommitment: bytesToHex(outcome.resultCommitment),
          grantSignature: {
            nonce: pointToHex(outcome.grantSignature.nonce),
            scalar: outcome.grantSignature.scalar.toString(16),
          },
          resultSignature: {
            nonce: pointToHex(outcome.resultSignature.nonce),
            scalar: outcome.resultSignature.scalar.toString(16),
          },
        });
      }

      send(404, { error: 'not found' });
    } catch (cause) {
      send(400, { error: cause instanceof Error ? cause.message : 'job failed' });
    }
  })();
});

function reconstruct(point: { x: string; y: string }) {
  return constructJubjubPoint(BigInt(`0x${point.x}`), BigInt(`0x${point.y}`));
}

server.listen(PORT, () => {
  process.stdout.write(`zylo enclave listening on ${PORT}\n`);
});
