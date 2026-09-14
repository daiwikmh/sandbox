export type Aggregate = 'sum' | 'mean' | 'min' | 'max';

export type Predicate = {
  readonly column: string;
  readonly op: 'eq' | 'ne' | 'lt' | 'lte' | 'gt' | 'gte';
  readonly value: string | number;
};

export type JobSpec =
  | { readonly kind: 'count'; readonly where?: Predicate }
  | {
      readonly kind: 'aggregate';
      readonly column: string;
      readonly aggregate: Aggregate;
      readonly where?: Predicate;
    }
  | {
      readonly kind: 'grouped';
      readonly groupBy: string;
      readonly column: string;
      readonly aggregate: Aggregate;
      readonly where?: Predicate;
    };

export type Listing = {
  readonly datasetId: string;
  readonly datasetRoot: string;
  readonly ownerCommitment: string;
  readonly termsHash: string;
  readonly price: bigint;
  readonly rows: bigint;
  readonly jobClasses: number;
  readonly schema: string[];
  readonly title: string;
};

export type JobRecord = {
  readonly jobId: string;
  readonly escrow: bigint;
  readonly settled: boolean;
  readonly resultCommitment: string;
  readonly spec: JobSpec;
  readonly result?: unknown;
};
