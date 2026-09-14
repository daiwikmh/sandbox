export const JOB_CLASS = {
  COUNT: 1,
  AGGREGATE: 2,
  GROUPED: 4,
} as const;

export type JobClass = (typeof JOB_CLASS)[keyof typeof JOB_CLASS];

export const AGGREGATES = ['sum', 'mean', 'min', 'max'] as const;
export type Aggregate = (typeof AGGREGATES)[number];

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

export type Predicate = {
  readonly column: string;
  readonly op: 'eq' | 'ne' | 'lt' | 'lte' | 'gt' | 'gte';
  readonly value: string | number;
};

export const LIMITS = {
  MIN_GROUP_SIZE: 25,
  MAX_GROUPS: 64,
  MAX_RESULT_BYTES: 8192,
  DEFAULT_EPSILON: 1.0,
} as const;

export function classOf(spec: JobSpec): JobClass {
  switch (spec.kind) {
    case 'count':
      return JOB_CLASS.COUNT;
    case 'aggregate':
      return JOB_CLASS.AGGREGATE;
    case 'grouped':
      return JOB_CLASS.GROUPED;
  }
}

export function permits(jobClasses: number, spec: JobSpec): boolean {
  return (jobClasses & classOf(spec)) !== 0;
}
