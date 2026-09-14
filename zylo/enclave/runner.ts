import { AGGREGATES, LIMITS, type Aggregate, type JobSpec, type Predicate } from './jobspec.js';

/**
 * Laplace noise at the given epsilon. Sensitivity is supplied by the caller
 * because it differs per aggregate: a count changes by 1 when one row is added
 * or removed, a mean by at most range/n.
 */
export function laplaceNoise(epsilon: number, sensitivity: number): number {
  const u = crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32 - 0.5;
  return -(sensitivity / epsilon) * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
}

export type Privacy = { readonly epsilon: number };

export type Table = { readonly columns: string[]; readonly rows: string[][] };

export type JobResult =
  | { readonly kind: 'count'; readonly value: number }
  | { readonly kind: 'aggregate'; readonly value: number }
  | { readonly kind: 'grouped'; readonly groups: { key: string; value: number }[] };

export function parseCsv(text: string): Table {
  const lines = text.split(/\r?\n/).filter((line) => line.length > 0);
  if (lines.length < 2) throw new Error('dataset needs a header and at least one row');
  const columns = splitRow(lines[0]);
  const rows = lines.slice(1).map(splitRow);
  for (const row of rows) {
    if (row.length !== columns.length) throw new Error('ragged row in dataset');
  }
  return { columns, rows };
}

function splitRow(line: string): string[] {
  return line.split(',').map((cell) => cell.trim());
}

function columnIndex(table: Table, name: string): number {
  const index = table.columns.indexOf(name);
  if (index === -1) throw new Error(`unknown column: ${name}`);
  return index;
}

function numeric(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error('non-numeric value in an aggregate column');
  return parsed;
}

function matches(table: Table, row: string[], predicate: Predicate | undefined): boolean {
  if (predicate === undefined) return true;
  const cell = row[columnIndex(table, predicate.column)];
  const target = predicate.value;
  if (typeof target === 'number') {
    const left = numeric(cell);
    switch (predicate.op) {
      case 'eq': return left === target;
      case 'ne': return left !== target;
      case 'lt': return left < target;
      case 'lte': return left <= target;
      case 'gt': return left > target;
      case 'gte': return left >= target;
    }
  }
  switch (predicate.op) {
    case 'eq': return cell === target;
    case 'ne': return cell !== target;
    default: throw new Error('ordering comparison on a non-numeric literal');
  }
}

function fold(values: number[], aggregate: Aggregate): number {
  if (!AGGREGATES.includes(aggregate)) throw new Error(`unknown aggregate: ${aggregate}`);
  if (values.length === 0) throw new Error('aggregate over an empty selection');
  switch (aggregate) {
    case 'sum': return values.reduce((a, b) => a + b, 0);
    case 'mean': return values.reduce((a, b) => a + b, 0) / values.length;
    case 'min': return Math.min(...values);
    case 'max': return Math.max(...values);
  }
}

export function run(table: Table, spec: JobSpec, privacy?: Privacy): JobResult {
  const noise = (value: number, sensitivity: number): number =>
    privacy === undefined ? value : value + laplaceNoise(privacy.epsilon, sensitivity);

  const selected = table.rows.filter((row) => matches(table, row, spec.where));

  if (selected.length < LIMITS.MIN_GROUP_SIZE) {
    throw new Error(
      `selection of ${selected.length} rows is below the k-anonymity minimum of ${LIMITS.MIN_GROUP_SIZE}`,
    );
  }

  if (spec.kind === 'count') {
    return { kind: 'count', value: Math.max(0, Math.round(noise(selected.length, 1))) };
  }

  if (spec.kind === 'aggregate') {
    const index = columnIndex(table, spec.column);
    const values = selected.map((r) => numeric(r[index]));
    return { kind: 'aggregate', value: noise(fold(values, spec.aggregate), sensitivityOf(values, spec.aggregate)) };
  }

  const keyIndex = columnIndex(table, spec.groupBy);
  const valueIndex = columnIndex(table, spec.column);
  const buckets = new Map<string, number[]>();
  for (const row of selected) {
    const key = row[keyIndex];
    const bucket = buckets.get(key);
    if (bucket === undefined) buckets.set(key, [numeric(row[valueIndex])]);
    else bucket.push(numeric(row[valueIndex]));
  }

  if (buckets.size > LIMITS.MAX_GROUPS) {
    throw new Error(`query produces ${buckets.size} groups, above the cap of ${LIMITS.MAX_GROUPS}`);
  }

  const groups = [...buckets.entries()]
    .filter(([, values]) => values.length >= LIMITS.MIN_GROUP_SIZE)
    .map(([key, values]) => ({
      key,
      value: noise(fold(values, spec.aggregate), sensitivityOf(values, spec.aggregate)),
    }))
    .sort((a, b) => (a.key < b.key ? -1 : 1));

  if (groups.length === 0) {
    throw new Error('every group fell below the k-anonymity minimum');
  }

  return { kind: 'grouped', groups };
}

function sensitivityOf(values: number[], aggregate: Aggregate): number {
  const spread = Math.max(...values) - Math.min(...values);
  switch (aggregate) {
    case 'sum': return spread;
    case 'mean': return spread / values.length;
    case 'min':
    case 'max': return spread;
  }
}

export function encodeResult(result: JobResult): Uint8Array {
  const encoded = new TextEncoder().encode(JSON.stringify(result));
  if (encoded.length > LIMITS.MAX_RESULT_BYTES) {
    throw new Error(
      `result of ${encoded.length} bytes exceeds the cap of ${LIMITS.MAX_RESULT_BYTES}`,
    );
  }
  return encoded;
}
