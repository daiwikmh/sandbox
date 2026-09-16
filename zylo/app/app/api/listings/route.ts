import { NextRequest, NextResponse } from 'next/server';
import { D1_CONFIGURED, query } from '../../src/server/d1';

export const dynamic = 'force-dynamic';

type ListingRow = {
  dataset_id: string;
  dataset_root: string;
  owner_commitment: string;
  terms_hash: string;
  price: string;
  rows: string;
  job_classes: number;
  budget: string;
  schema_json: string;
  title: string;
  tx_hash: string | null;
  created_at: number;
};

const toListing = (r: ListingRow) => ({
  datasetId: r.dataset_id,
  datasetRoot: r.dataset_root,
  ownerCommitment: r.owner_commitment,
  termsHash: r.terms_hash,
  price: r.price,
  rows: r.rows,
  jobClasses: r.job_classes,
  budget: r.budget,
  schema: JSON.parse(r.schema_json) as string[],
  title: r.title,
  txHash: r.tx_hash,
  createdAt: r.created_at,
});

export async function GET(): Promise<NextResponse> {
  if (!D1_CONFIGURED) return NextResponse.json({ listings: [], configured: false });
  try {
    const rows = await query<ListingRow>(
      'SELECT * FROM listings ORDER BY created_at DESC LIMIT 200',
    );
    return NextResponse.json({ listings: rows.map(toListing), configured: true });
  } catch (cause) {
    return NextResponse.json({ error: (cause as Error).message }, { status: 502 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!D1_CONFIGURED) {
    return NextResponse.json({ error: 'D1 is not configured' }, { status: 503 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Body must be JSON' }, { status: 400 });
  }

  const required = [
    'datasetId', 'datasetRoot', 'ownerCommitment', 'termsHash',
    'price', 'rows', 'jobClasses', 'budget', 'schema', 'title',
  ];
  const missing = required.filter((k) => body[k] === undefined || body[k] === null);
  if (missing.length > 0) {
    return NextResponse.json({ error: `Missing: ${missing.join(', ')}` }, { status: 400 });
  }
  if (!Array.isArray(body.schema)) {
    return NextResponse.json({ error: 'schema must be an array' }, { status: 400 });
  }

  try {
    await query(
      `INSERT INTO listings
         (dataset_id, dataset_root, owner_commitment, terms_hash, price, rows,
          job_classes, budget, schema_json, title, tx_hash, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (dataset_id) DO NOTHING`,
      [
        String(body.datasetId),
        String(body.datasetRoot),
        String(body.ownerCommitment),
        String(body.termsHash),
        String(body.price),
        String(body.rows),
        Number(body.jobClasses),
        String(body.budget),
        JSON.stringify(body.schema),
        String(body.title),
        body.txHash === undefined ? null : String(body.txHash),
        Date.now(),
      ],
    );
    return NextResponse.json({ ok: true });
  } catch (cause) {
    return NextResponse.json({ error: (cause as Error).message }, { status: 502 });
  }
}
