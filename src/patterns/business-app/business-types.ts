import type { AiContextItem } from '@/lib/ai';
export type BusinessPage =
  'overview' | 'projects' | 'customers' | 'invoices' | 'team' | 'activity' | 'settings';
export type RecordPage = 'projects' | 'customers' | 'team';
export interface BusinessRoute {
  page: BusinessPage;
  recordId?: string;
}
export interface TeamMember {
  id: string;
  name: string;
  initials: string;
  email: string;
  role: 'Admin' | 'Manager' | 'Member';
  title: string;
  department: string;
  location: string;
  status: 'Active' | 'Invited' | 'Away';
  bio: string;
  joinedAt: string;
}
export interface ProjectTask {
  id: string;
  title: string;
  done: boolean;
  assigneeId: string;
}
export interface ProjectNote {
  id: string;
  authorId: string;
  text: string;
  createdAt: string;
}
export interface BusinessProject {
  id: string;
  name: string;
  customerId: string;
  ownerId: string;
  memberIds: string[];
  status: 'Planned' | 'Active' | 'On hold' | 'Completed';
  priority: 'Low' | 'Medium' | 'High';
  description: string;
  budget: number;
  spent: number;
  progress: number;
  dueDate: string;
  updatedAt: string;
  tasks: ProjectTask[];
  notes: ProjectNote[];
}
export interface BusinessCustomer {
  id: string;
  name: string;
  industry: string;
  contact: string;
  email: string;
  location: string;
  status: 'Active' | 'Prospect' | 'Paused';
  plan: 'Standard' | 'Business' | 'Enterprise';
  ownerId: string;
  joinedAt: string;
}
export interface BusinessInvoice {
  id: string;
  customerId: string;
  projectId: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Overdue';
  issuedAt: string;
  dueDate: string;
}
export interface BusinessActivity {
  id: string;
  actorId: string;
  text: string;
  date: string;
  page?: RecordPage;
  recordId?: string;
}
export interface BusinessData {
  projects: BusinessProject[];
  customers: BusinessCustomer[];
  invoices: BusinessInvoice[];
  team: TeamMember[];
  activity: BusinessActivity[];
}
export interface BusinessViewProps {
  data: BusinessData;
  onNavigate: (route: BusinessRoute) => void;
  onChange: (change: Partial<BusinessData>, message: string) => void;
  onAskAi: (prompt: string, route?: BusinessRoute, context?: AiContextItem[]) => void;
}
export const businessReferenceDate = '2026-10-24T10:00:00.000Z';
export const currentMemberId = 'usr-1';
export const formatMoney = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
export const formatBusinessDate = (value: string) =>
  new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value));
