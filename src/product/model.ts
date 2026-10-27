import type { FormaInvoice, FormaState, FormaUser } from './types';

export const STORAGE_KEY = 'forma-workspace-v1';
export function today() {
  const now = new Date();
  return localDate(now);
}
function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function uid(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}
export function money(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}
export function dateLabel(value: string) {
  if (!value) return 'Not yet';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value.length === 10 ? `${value}T12:00:00` : value));
}
export function invoiceTotal(invoice: FormaInvoice) {
  return (
    invoice.lines.reduce((total, line) => total + Math.round(line.price * 100) * line.quantity, 0) /
    100
  );
}
function download(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function csvText(headers: string[], rows: (string | number)[][]) {
  const cell = (value: string | number) => {
    const text = String(value);
    // Quoting alone does not prevent spreadsheet formula evaluation.
    const safe = typeof value === 'string' && /^[\s]*[=+@-]/.test(text) ? `'${text}` : text;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  return [headers, ...rows].map((row) => row.map(cell).join(',')).join('\r\n');
}
export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  download(filename, '\uFEFF' + csvText(headers, rows), 'text/csv;charset=utf-8');
}
export function downloadJson(filename: string, value: unknown) {
  download(filename, JSON.stringify(value, null, 2), 'application/json');
}

export function createInitialState(now = new Date()): FormaState {
  const names = [
    ['Olivia Rhye', 'Layers', 'San Francisco, US'],
    ['Phoenix Baker', 'Sisyphus', 'London, UK'],
    ['Lana Steiner', 'Catalog', 'Berlin, DE'],
    ['Demi Wilkinson', 'Circooles', 'Amsterdam, NL'],
    ['Drew Cano', 'Hourglass', 'New York, US'],
    ['Natali Craig', 'Command+R', 'Paris, FR'],
    ['Orlando Diggs', 'Quotient', 'Austin, US'],
    ['Andi Lane', 'Sisyphus', 'Lisbon, PT'],
    ['Kate Morrison', 'Layers', 'Copenhagen, DK'],
    ['Candice Wu', 'Catalog', 'Toronto, CA'],
    ['Ava Thompson', 'Northstar', 'Melbourne, AU'],
    ['Noah Williams', 'Circooles', 'Dublin, IE'],
    ['Mia Chen', 'Hourglass', 'Singapore, SG'],
    ['Liam Patel', 'Command+R', 'London, UK'],
    ['Sofia Garcia', 'Quotient', 'Barcelona, ES'],
    ['Ethan Kim', 'Northstar', 'Seoul, KR'],
    ['Isabella Rossi', 'Layers', 'Milan, IT'],
    ['Lucas Martin', 'Catalog', 'Paris, FR'],
    ['Amara Okafor', 'Sisyphus', 'Lagos, NG'],
    ['Oliver Smith', 'Circooles', 'Bristol, UK'],
    ['Ella Wilson', 'Hourglass', 'Seattle, US'],
    ['James Lee', 'Command+R', 'Vancouver, CA'],
    ['Freya Hansen', 'Northstar', 'Oslo, NO'],
    ['Theo Dubois', 'Quotient', 'Lyon, FR'],
    ['Elena Costa', 'Layers', 'Porto, PT'],
    ['Aiden Brown', 'Catalog', 'Boston, US'],
    ['Zara Ahmed', 'Sisyphus', 'Dubai, AE'],
    ['Max Fischer', 'Northstar', 'Munich, DE'],
  ];
  const at = (monthsAgo: number, day: number) =>
    localDate(new Date(now.getFullYear(), now.getMonth() - monthsAgo, day));
  const users: FormaUser[] = names.map(([name, company, location], i) => ({
    id: `usr-${i + 1}`,
    name,
    company,
    location,
    email: `${name.toLowerCase().replaceAll(' ', '.')}@example.com`,
    role: i % 7 === 0 ? 'Admin' : i % 4 === 0 ? 'Viewer' : 'Member',
    status: i % 11 === 10 ? 'Suspended' : i % 7 === 6 ? 'Invited' : 'Active',
    plan: i % 3 === 0 ? 'Business' : i % 3 === 1 ? 'Pro' : 'Starter',
    joined: at(1 + (i % 8), 1 + (i % 24)),
    lastActive: i % 7 === 6 ? '' : at(0, Math.max(1, now.getDate() - (i % 5))),
    notes: i < 4 ? 'Key workspace contact. Prefers product updates by email.' : '',
  }));
  const products: FormaState['products'] = [
    {
      id: 'prd-1',
      name: 'Forma Starter',
      description: 'A focused workspace for independent teams getting started.',
      category: 'Subscription',
      price: 79,
      status: 'Active',
      sku: 'FRM-STARTER',
    },
    {
      id: 'prd-2',
      name: 'Forma Pro',
      description: 'Advanced workflows and reporting for growing teams.',
      category: 'Subscription',
      price: 199,
      status: 'Active',
      sku: 'FRM-PRO',
    },
    {
      id: 'prd-3',
      name: 'Forma Business',
      description: 'Shared governance and collaboration across your organization.',
      category: 'Subscription',
      price: 499,
      status: 'Active',
      sku: 'FRM-BUSINESS',
    },
    {
      id: 'prd-4',
      name: 'Analytics Plus',
      description: 'Go deeper with custom reports and historical insights.',
      category: 'Add-on',
      price: 49,
      status: 'Active',
      sku: 'ADD-ANALYTICS',
    },
    {
      id: 'prd-5',
      name: 'Onboarding workshop',
      description: 'A guided setup session tailored to your team’s workflow.',
      category: 'Service',
      price: 1200,
      status: 'Active',
      sku: 'SVC-ONBOARDING',
    },
    {
      id: 'prd-6',
      name: 'Priority support',
      description: 'Dedicated help for your most important work.',
      category: 'Add-on',
      price: 149,
      status: 'Active',
      sku: 'ADD-SUPPORT',
    },
    {
      id: 'prd-7',
      name: 'Forma Enterprise',
      description: 'A tailored workspace for complex organizations. Coming soon.',
      category: 'Subscription',
      price: 999,
      status: 'Draft',
      sku: 'FRM-ENTERPRISE',
    },
    {
      id: 'prd-8',
      name: 'Legacy team plan',
      description: 'Previous generation team plan, retained for existing records.',
      category: 'Subscription',
      price: 59,
      status: 'Archived',
      sku: 'FRM-LEGACY',
    },
  ];
  const invoices: FormaInvoice[] = [];
  for (let month = 11; month >= 0; month--) {
    for (let i = 0; i < 5; i++) {
      const customer = users[(month * 3 + i) % users.length];
      const product = products[(i + month) % 5];
      const day = month ? 4 + i * 4 : Math.min(now.getDate(), 2 + i * 4);
      invoices.push({
        id: `inv-${month}-${i}`,
        number: `INV-${String(1040 + invoices.length)}`,
        userId: customer.id,
        customer: customer.name,
        email: customer.email,
        issued: at(month, day),
        due: at(month, day + 14),
        status: month === 0 && i > 2 ? 'Pending' : 'Paid',
        lines: [
          {
            productId: product.id,
            description: product.name,
            quantity: 2 + (11 - month) + i,
            price: product.price,
          },
        ],
      });
    }
  }
  const late = users[5];
  invoices.push({
    id: 'inv-overdue',
    number: 'INV-1100',
    userId: late.id,
    customer: late.name,
    email: late.email,
    issued: at(1, 15),
    due: at(0, 1),
    status: 'Overdue',
    lines: [{ productId: 'prd-3', description: 'Forma Business', quantity: 8, price: 499 }],
  });
  return {
    version: 1,
    users,
    products,
    invoices,
    settings: {
      workspace: 'Forma Studio',
      email: 'hello@example.com',
      theme: 'dark',
      density: 'comfortable',
      currency: 'USD',
    },
  };
}

// Local storage is untrusted input: reject incompatible or partial records before rendering.
export function parseStoredState(raw: string): FormaState | null {
  try {
    const data: unknown = JSON.parse(raw);
    const object = (v: unknown): v is Record<string, unknown> =>
      !!v && typeof v === 'object' && !Array.isArray(v);
    const strings = (v: Record<string, unknown>, keys: string[]) =>
      keys.every((key) => typeof v[key] === 'string');
    const oneOf = (v: unknown, values: string[]) => typeof v === 'string' && values.includes(v);
    const validDate = (v: unknown, optional = false) => {
      if (typeof v !== 'string') return false;
      if (optional && v === '') return true;
      if (!/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(v) || !Number.isFinite(Date.parse(v))) return false;
      const day = v.slice(0, 10);
      return new Date(`${day}T12:00:00Z`).toISOString().slice(0, 10) === day;
    };
    const unique = (rows: Record<string, unknown>[]) =>
      new Set(rows.map((row) => row.id)).size === rows.length;
    if (!object(data) || data.version !== 1 || !object(data.settings)) return null;
    const s = data.settings;
    if (
      !strings(s, ['workspace', 'email']) ||
      !oneOf(s.theme, ['dark', 'light']) ||
      !oneOf(s.density, ['compact', 'default', 'comfortable']) ||
      !oneOf(s.currency, ['USD', 'EUR', 'GBP'])
    )
      return null;
    if (
      !Array.isArray(data.users) ||
      !data.users.every(
        (u: unknown) =>
          object(u) &&
          strings(u, ['id', 'name', 'email', 'company', 'location', 'notes']) &&
          validDate(u.joined) &&
          validDate(u.lastActive, true) &&
          oneOf(u.role, ['Admin', 'Member', 'Viewer']) &&
          oneOf(u.status, ['Active', 'Invited', 'Suspended']) &&
          oneOf(u.plan, ['Starter', 'Pro', 'Business']),
      ) ||
      !unique(data.users)
    )
      return null;
    if (
      !Array.isArray(data.products) ||
      !data.products.every(
        (p: unknown) =>
          object(p) &&
          strings(p, ['id', 'name', 'description', 'sku']) &&
          typeof p.price === 'number' &&
          Number.isFinite(p.price) &&
          p.price >= 0 &&
          oneOf(p.status, ['Active', 'Draft', 'Archived']) &&
          oneOf(p.category, ['Subscription', 'Add-on', 'Service']),
      ) ||
      !unique(data.products)
    )
      return null;
    if (
      !Array.isArray(data.invoices) ||
      !data.invoices.every(
        (v: unknown) =>
          object(v) &&
          strings(v, ['id', 'number', 'userId', 'customer', 'email']) &&
          validDate(v.issued) &&
          validDate(v.due) &&
          oneOf(v.status, ['Paid', 'Pending', 'Overdue', 'Draft']) &&
          Array.isArray(v.lines) &&
          v.lines.length > 0 &&
          v.lines.every(
            (l: unknown) =>
              object(l) &&
              strings(l, ['productId', 'description']) &&
              typeof l.quantity === 'number' &&
              Number.isSafeInteger(l.quantity) &&
              l.quantity > 0 &&
              typeof l.price === 'number' &&
              Number.isFinite(l.price) &&
              l.price >= 0,
          ),
      ) ||
      !unique(data.invoices)
    )
      return null;
    return data as unknown as FormaState;
  } catch {
    return null;
  }
}

export function revenueByMonth(invoices: FormaInvoice[], count: number, now = new Date()) {
  return Array.from({ length: count }, (_, index) => {
    const d = new Date(now.getFullYear(), now.getMonth() - count + 1 + index, 1);
    const key = localDate(d).slice(0, 7);
    return {
      label: d.toLocaleDateString('en-US', { month: 'short' }),
      revenue:
        invoices
          .filter((i) => i.status === 'Paid' && i.issued.startsWith(key))
          .reduce((sum, i) => sum + Math.round(invoiceTotal(i) * 100), 0) / 100,
      key,
    };
  });
}
