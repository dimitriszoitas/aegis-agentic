import { describe, expect, it } from 'vitest';
import { evaluateTokenBatch, tokenIdentity, type TokenValidator } from './token-input-model';

describe('consolidated TokenInput acceptance rules', () => {
  it('keeps literal commas, normalizes NFC, and splits tabs and CRLF', () => {
    expect(evaluateTokenBatch('  Cafe\u0301, Paris \t Beta\r\nGamma ', []).values).toEqual([
      'Café, Paris',
      'Beta',
      'Gamma',
    ]);
    expect(tokenIdentity(' CAFE\u0301 ')).toBe('café');
  });
  it('supports explicit comma delimiter migration', () => {
    expect(evaluateTokenBatch('A, B', [], { commaDelimiter: true }).values).toEqual(['A', 'B']);
  });
  it('rejects all siblings when an existing or intra-batch duplicate is found', () => {
    expect(evaluateTokenBatch('new\tCAFÉ', ['Café'])).toMatchObject({
      values: ['Café'],
      added: 0,
      errors: ['CAFÉ is already added.'],
    });
    expect(evaluateTokenBatch('Alpha\nalpha', [])).toMatchObject({
      values: [],
      added: 0,
      errors: ['alpha is already added.'],
    });
  });
  it('counts explicitly ignored existing and intra-batch duplicates', () => {
    expect(
      evaluateTokenBatch('ALPHA\nBeta\nbeta', ['Alpha'], { duplicatePolicy: 'ignore' }),
    ).toEqual({ values: ['Alpha', 'Beta'], added: 1, skipped: 2, errors: [] });
  });
  it('rejects the entire batch for invalid siblings even under ignore policy', () => {
    expect(
      evaluateTokenBatch('Alpha\nBeta\ninvalid', ['Alpha'], {
        duplicatePolicy: 'ignore',
        validateValue: (value) => (value === 'invalid' ? 'Bad value' : null),
      }),
    ).toEqual({ values: ['Alpha'], added: 0, skipped: 1, errors: ['invalid: Bad value'] });
  });
  it('treats whitespace-only batches as a no-op', () => {
    expect(evaluateTokenBatch(' \n\t ', ['kept'])).toEqual({
      values: ['kept'],
      added: 0,
      skipped: 0,
      errors: [],
    });
  });
  it('accepts null or undefined validator results', () => {
    for (const result of [null, undefined])
      expect(evaluateTokenBatch('A', [], { validateValue: () => result }).values).toEqual(['A']);
  });
  it.each([true, false, '', 1, {}, Promise.resolve(null)])(
    'rejects invalid validator result %j',
    (result) => {
      expect(
        evaluateTokenBatch('A', [], { validateValue: (() => result) as unknown as TokenValidator }),
      ).toMatchObject({ values: [], added: 0 });
      expect(
        evaluateTokenBatch('A', [], { validateValue: (() => result) as unknown as TokenValidator })
          .errors,
      ).toHaveLength(1);
    },
  );
  it('rejects a failing async validator atomically without an unhandled rejection', async () => {
    const unhandled: unknown[] = [];
    const observe = (reason: unknown) => unhandled.push(reason);
    process.on('unhandledRejection', observe);
    try {
      const result = evaluateTokenBatch('valid\ninvalid', ['kept'], {
        validateValue: ((value: string) =>
          value === 'valid'
            ? null
            : (async () => {
                throw new Error('network unavailable');
              })()) as unknown as TokenValidator,
      });
      expect(result).toMatchObject({ values: ['kept'], added: 0 });
      expect(result.errors).toEqual([
        'invalid: Validation must return a nonempty error string, null or undefined synchronously.',
      ]);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(unhandled).toEqual([]);
      expect(result.values).toEqual(['kept']);
    } finally {
      process.off('unhandledRejection', observe);
    }
  });
  it.each([
    {
      name: 'rejecting then method',
      make: () => ({
        then: (_resolve: unknown, reject: (error: Error) => void) =>
          reject(new Error('rejected thenable')),
      }),
    },
    {
      name: 'throwing then method',
      make: () => ({
        then: () => {
          throw new Error('invalid thenable');
        },
      }),
    },
    {
      name: 'throwing then getter',
      make: () =>
        Object.defineProperty({}, 'then', {
          get: () => {
            throw new Error('invalid then accessor');
          },
        }),
    },
  ])('rejects $name safely without accepting eventual results', async ({ make }) => {
    const unhandled: unknown[] = [];
    const observe = (reason: unknown) => unhandled.push(reason);
    process.on('unhandledRejection', observe);
    try {
      const result = evaluateTokenBatch('new', ['kept'], {
        validateValue: (() => make()) as unknown as TokenValidator,
      });
      expect(result).toMatchObject({ values: ['kept'], added: 0 });
      expect(result.errors).toHaveLength(1);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(unhandled).toEqual([]);
      expect(result.values).toEqual(['kept']);
    } finally {
      process.off('unhandledRejection', observe);
    }
  });
  it('catches validator failures without mutating host values', () => {
    const values = Object.freeze(['kept']);
    const result = evaluateTokenBatch('A', values, {
      validateValue: () => {
        throw new Error('offline');
      },
    });
    expect(result.values).toEqual(['kept']);
    expect(result.errors).toEqual(['A: Validation could not complete. Retry this value.']);
  });
});
