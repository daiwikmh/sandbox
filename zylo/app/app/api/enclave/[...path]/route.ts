import { NextRequest, NextResponse } from 'next/server';
import { ENCLAVE_URL } from '../../../src/utils/constants';

/**
 * Proxies the browser to the enclave host.
 *
 * Keeping the URL server-side means the enclave is not addressable from the
 * public internet just because someone loaded the app. The enclave authenticates
 * every job against on-chain state, so this proxy is never in a position to
 * grant access it was not already given.
 */
async function forward(request: NextRequest, path: string[]): Promise<NextResponse> {
  const target = `${ENCLAVE_URL}/${path.join('/')}`;
  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers: { 'content-type': request.headers.get('content-type') ?? 'application/json' },
      body: request.method === 'GET' ? undefined : await request.text(),
      cache: 'no-store',
    });
    const body = await upstream.text();
    return new NextResponse(body, {
      status: upstream.status,
      headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
    });
  } catch {
    return NextResponse.json({ error: 'enclave unreachable' }, { status: 503 });
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return forward(request, (await context.params).path);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return forward(request, (await context.params).path);
}
