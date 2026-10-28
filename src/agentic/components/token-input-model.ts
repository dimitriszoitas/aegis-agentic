/** Pure acceptance rules shared by the view and the consolidated contract tests. */
export type TokenValidator = (value: string) => string | null | undefined;
export type TokenBatch = {
  values: string[];
  errors: string[];
  added: number;
  skipped: number;
};
export const normalizeToken = (value: string) => value.trim().normalize('NFC');
export const tokenIdentity = (value: string) => normalizeToken(value).toLowerCase();

export function evaluateTokenBatch(
  text: string,
  values: readonly string[],
  options: {
    duplicatePolicy?: 'reject' | 'ignore';
    commaDelimiter?: boolean;
    validateValue?: TokenValidator;
  } = {},
): TokenBatch {
  const next = [...values];
  const errors: string[] = [];
  let skipped = 0;
  const candidates = text
    .split(options.commaDelimiter ? /[,\r\n\t]/ : /[\r\n\t]/)
    .map(normalizeToken)
    .filter(Boolean);
  for (const value of candidates) {
    let problem: unknown;
    try {
      problem = options.validateValue?.(value);
    } catch {
      problem = 'Validation could not complete. Retry this value.';
    }
    if (problem !== undefined && problem !== null) {
      // Async validation is unsupported. Observe a returned promise/thenable only to
      // consume rejection; its eventual result can never accept or mutate this batch.
      if (typeof problem === 'object' || typeof problem === 'function') {
        try {
          void Promise.resolve(problem).catch(() => {});
        } catch {
          // A malformed promise can throw during assimilation; it is already invalid.
        }
      }
      errors.push(
        `${value}: ${typeof problem === 'string' && problem.trim() ? problem : 'Validation must return a nonempty error string, null or undefined synchronously.'}`,
      );
      continue;
    }
    if (next.some((item) => tokenIdentity(item) === tokenIdentity(value))) {
      if (options.duplicatePolicy === 'ignore') skipped++;
      else errors.push(`${value} is already added.`);
      continue;
    }
    next.push(value);
  }
  return {
    values: errors.length ? [...values] : next,
    errors,
    added: errors.length ? 0 : next.length - values.length,
    skipped,
  };
}
