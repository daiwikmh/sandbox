import 'server-only';

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID ?? '';
const DATABASE_ID = process.env.D1_DATABASE_ID ?? '';
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN ?? '';

export const D1_CONFIGURED =
  ACCOUNT_ID.length > 0 && DATABASE_ID.length > 0 && API_TOKEN.length > 0;

const ENDPOINT = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;

type D1Response<T> = {
  readonly success: boolean;
  readonly errors: { readonly code: number; readonly message: string }[];
  readonly result: { readonly results: T[] }[];
};

/**
 * Runs one statement against D1 over the HTTP API.
 *
 * Server-only: the token grants write access to the database, so this module
 * must never reach the browser. `server-only` makes that a build error rather
 * than a leak.
 */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params: (string | number | null)[] = [],
): Promise<T[]> {
  if (!D1_CONFIGURED) {
    throw new Error('D1 is not configured. Set CLOUDFLARE_ACCOUNT_ID, D1_DATABASE_ID and CLOUDFLARE_API_TOKEN.');
  }
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${API_TOKEN}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ sql, params }),
    cache: 'no-store',
  });

  const payload = (await response.json()) as D1Response<T>;
  if (!response.ok || !payload.success) {
    // The Cloudflare error carries the useful detail; the HTTP status does not.
    const detail = payload.errors?.map((e) => `${e.code}: ${e.message}`).join('; ');
    throw new Error(detail && detail.length > 0 ? detail : `D1 request failed (${response.status})`);
  }
  return payload.result[0]?.results ?? [];
}
