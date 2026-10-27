export type Page = 'dashboard' | 'users' | 'products' | 'invoices' | 'settings';
export type UserRole = 'Admin' | 'Member' | 'Viewer';
export type UserStatus = 'Active' | 'Invited' | 'Suspended';
export interface FormaUser {
  id: string;
  name: string;
  email: string;
  company: string;
  role: UserRole;
  status: UserStatus;
  plan: 'Starter' | 'Pro' | 'Business';
  joined: string;
  lastActive: string;
  location: string;
  notes: string;
}
export interface FormaProduct {
  id: string;
  name: string;
  description: string;
  category: 'Subscription' | 'Add-on' | 'Service';
  price: number;
  status: 'Active' | 'Draft' | 'Archived';
  sku: string;
}
export interface InvoiceLine {
  productId: string;
  description: string;
  quantity: number;
  price: number;
}
export interface FormaInvoice {
  id: string;
  number: string;
  userId: string;
  customer: string;
  email: string;
  issued: string;
  due: string;
  status: 'Paid' | 'Pending' | 'Overdue' | 'Draft';
  lines: InvoiceLine[];
}
export interface FormaSettings {
  workspace: string;
  email: string;
  theme: 'dark' | 'light';
  density: 'compact' | 'default' | 'comfortable';
  currency: 'USD' | 'EUR' | 'GBP';
}
export interface FormaState {
  version: 1;
  users: FormaUser[];
  products: FormaProduct[];
  invoices: FormaInvoice[];
  settings: FormaSettings;
}
export interface FormaStore {
  state: FormaState;
  update: (change: (current: FormaState) => FormaState) => void;
  notice: (message: string) => void;
  navigate: (page: Page) => void;
}
