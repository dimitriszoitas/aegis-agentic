import { describe, expect, it } from 'vitest';
import {
  createInitialState,
  csvText,
  invoiceTotal,
  parseStoredState,
  revenueByMonth,
} from './model';
import type { FormaInvoice, FormaState } from './types';

const referenceDate = new Date(2026, 9, 27, 12);

function invoice(overrides: Partial<FormaInvoice> = {}): FormaInvoice {
  return {
    id: 'invoice-test',
    number: 'INV-TEST',
    userId: 'user-test',
    customer: 'Alex Rivera',
    email: 'alex@example.com',
    issued: '2026-10-15',
    due: '2026-10-29',
    status: 'Paid',
    lines: [{ productId: 'product-test', description: 'Pro subscription', quantity: 1, price: 10 }],
    ...overrides,
  };
}

describe('Forma persisted workspace validation', () => {
  it('round-trips a complete workspace, including an invited user with no activity', () => {
    const initial = createInitialState(referenceDate);
    expect(initial.users.some((user) => user.lastActive === '')).toBe(true);
    expect(parseStoredState(JSON.stringify(initial))).toEqual(initial);
  });

  it.each(['not json', 'null', '[]', '"workspace"', '{}', '{"version":2}'])(
    'rejects an invalid or incompatible root: %s',
    (raw) => expect(parseStoredState(raw)).toBeNull(),
  );

  const malformedCases: [string, (state: FormaState) => void][] = [
    ['unsupported appearance', (state) => Object.assign(state.settings, { theme: 'system' })],
    ['unsupported currency', (state) => Object.assign(state.settings, { currency: 'INVALID' })],
    ['missing workspace name', (state) => Object.assign(state.settings, { workspace: null })],
    ['missing user collection', (state) => Object.assign(state, { users: null })],
    ['partial user record', (state) => Object.assign(state.users[0], { name: undefined })],
    ['invalid user role', (state) => Object.assign(state.users[0], { role: 'Owner' })],
    ['invalid joined date', (state) => Object.assign(state.users[0], { joined: 'yesterday' })],
    [
      'negative product price',
      (state) => {
        state.products[0].price = -1;
      },
    ],
    [
      'nonfinite product price',
      (state) => {
        state.products[0].price = Number.POSITIVE_INFINITY;
      },
    ],
    [
      'missing invoice lines',
      (state) => {
        state.invoices[0].lines = [];
      },
    ],
    [
      'fractional invoice quantity',
      (state) => {
        state.invoices[0].lines[0].quantity = 1.5;
      },
    ],
    [
      'zero invoice quantity',
      (state) => {
        state.invoices[0].lines[0].quantity = 0;
      },
    ],
    [
      'unsafe invoice quantity',
      (state) => {
        state.invoices[0].lines[0].quantity = Number.MAX_SAFE_INTEGER + 1;
      },
    ],
    [
      'negative invoice price',
      (state) => {
        state.invoices[0].lines[0].price = -0.01;
      },
    ],
    ['unsupported invoice status', (state) => Object.assign(state.invoices[0], { status: 'Sent' })],
    [
      'invalid due date',
      (state) => {
        state.invoices[0].due = '2026-13-01';
      },
    ],
    [
      'duplicate user identity',
      (state) => {
        state.users[1].id = state.users[0].id;
      },
    ],
    [
      'duplicate product identity',
      (state) => {
        state.products[1].id = state.products[0].id;
      },
    ],
    [
      'duplicate invoice identity',
      (state) => {
        state.invoices[1].id = state.invoices[0].id;
      },
    ],
  ];
  it.each(malformedCases)('rejects %s before the workspace renders', (_name, corrupt) => {
    const state = createInitialState(referenceDate);
    corrupt(state);
    expect(parseStoredState(JSON.stringify(state))).toBeNull();
  });

  it('rejects a calendar date that JavaScript would silently roll into the next month', () => {
    const state = createInitialState(referenceDate);
    state.invoices[0].issued = '2026-02-30';
    expect(parseStoredState(JSON.stringify(state))).toBeNull();
  });

  it('accepts an intentionally empty workspace and zero-priced products', () => {
    const state = createInitialState(referenceDate);
    state.products[0].price = 0;
    expect(parseStoredState(JSON.stringify(state))).toEqual(state);
    state.users = [];
    state.products = [];
    state.invoices = [];
    expect(parseStoredState(JSON.stringify(state))).toEqual(state);
  });
});

describe('Forma invoice amounts and historical snapshots', () => {
  it('totals decimal unit prices with quantities without floating-point residue', () => {
    const record = invoice({
      lines: [
        { productId: 'a', description: 'Small item', quantity: 3, price: 0.1 },
        { productId: 'b', description: 'Large item', quantity: 2, price: 19.99 },
        { productId: 'c', description: 'Complimentary item', quantity: 2, price: 0 },
      ],
    });
    expect(invoiceTotal(record)).toBe(40.28);
    expect(
      invoiceTotal(
        invoice({
          lines: [
            { productId: 'a', description: 'A', quantity: 1, price: 0.1 },
            { productId: 'b', description: 'B', quantity: 1, price: 0.2 },
          ],
        }),
      ),
    ).toBe(0.3);
  });

  it('preserves invoice price, description, and customer snapshots when their current records change', () => {
    const state = createInitialState(referenceDate);
    const original = structuredClone(state.invoices[0]);
    const originalTotal = invoiceTotal(original);
    const product = state.products.find((entry) => entry.id === original.lines[0].productId)!;
    const user = state.users.find((entry) => entry.id === original.userId)!;
    product.price = 5.5;
    product.name = 'Renamed product';
    user.name = 'Renamed customer';
    user.email = 'new@example.com';
    expect(state.invoices[0]).toEqual(original);
    expect(invoiceTotal(state.invoices[0])).toBe(originalTotal);
  });

  it('creates independent demo workspaces so reset cannot reuse mutated records', () => {
    const first = createInitialState(referenceDate);
    first.users[0].name = 'Changed';
    first.products[0].price = 0;
    first.invoices[0].lines[0].price = 0;
    first.settings.theme = 'light';
    const fresh = createInitialState(referenceDate);
    expect(fresh.users[0].name).not.toBe('Changed');
    expect(fresh.products[0].price).toBeGreaterThan(0);
    expect(fresh.invoices[0].lines[0].price).toBeGreaterThan(0);
    expect(fresh.settings.theme).toBe('dark');
  });
});

describe('Forma CSV export', () => {
  it('quotes commas, embedded quotes, and multiline content without losing record boundaries', () => {
    expect(csvText(['Name', 'Amount'], [['Jane "JJ", Doe\nTeam', 29]])).toBe(
      '"Name","Amount"\r\n"Jane ""JJ"", Doe\nTeam","29"',
    );
  });

  it.each(['=1+1', '+SUM(A1:A2)', '-1+2', '@SUM(A1)', '  =1+1', '\t=1+1', '\r\n+1+1'])(
    'neutralizes string formula input %j',
    (value) => expect(csvText(['Value'], [[value]])).toBe(`"Value"\r\n"'${value}"`),
  );

  it('also protects column headers and preserves numeric negatives and ordinary content', () => {
    expect(csvText(['=COLUMN()'], [[-12.5], ['user@example.com'], ['Normal text']])).toBe(
      '"\'=COLUMN()"\r\n"-12.5"\r\n"user@example.com"\r\n"Normal text"',
    );
  });
});

describe('Forma monthly revenue', () => {
  it('uses year-qualified chronological buckets, fills gaps, and excludes unpaid invoices', () => {
    const records = [
      invoice({ id: 'old-year', issued: '2025-12-10' }),
      invoice({ id: 'out-of-window', issued: '2026-09-30' }),
      invoice({ id: 'oct', issued: '2026-10-01' }),
      invoice({ id: 'dec', issued: '2026-12-31' }),
      invoice({ id: 'jan', issued: '2027-01-01' }),
      invoice({ id: 'pending', issued: '2027-01-02', status: 'Pending' }),
      invoice({ id: 'overdue', issued: '2026-12-01', status: 'Overdue' }),
      invoice({ id: 'draft', issued: '2026-11-01', status: 'Draft' }),
    ];
    expect(revenueByMonth(records, 4, new Date(2027, 0, 15, 12))).toEqual([
      { key: '2026-10', label: 'Oct', revenue: 10 },
      { key: '2026-11', label: 'Nov', revenue: 0 },
      { key: '2026-12', label: 'Dec', revenue: 10 },
      { key: '2027-01', label: 'Jan', revenue: 10 },
    ]);
  });

  it('keeps cents exact when aggregating separate paid invoices', () => {
    const records = [0.1, 0.2].map((price, index) =>
      invoice({
        id: `paid-${index}`,
        lines: [{ productId: 'a', description: 'Item', quantity: 1, price }],
      }),
    );
    expect(revenueByMonth(records, 1, referenceDate)[0].revenue).toBe(0.3);
  });

  it.each([new Date(2027, 0, 1, 12), new Date(2026, 9, 2, 12), new Date(2024, 1, 29, 12)])(
    'never seeds future paid invoice dates when initialized on %s',
    (now) => {
      const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const paid = createInitialState(now).invoices.filter((record) => record.status === 'Paid');
      expect(paid.length).toBeGreaterThan(0);
      expect(paid.every((record) => record.issued <= localToday)).toBe(true);
    },
  );
});
