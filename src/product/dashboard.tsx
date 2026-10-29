import { ContentGrid } from '@/patterns/page-layout';
import { formaRecipes } from './recipes';
import { PageHeader } from '@/patterns/page-header';
import { useState } from 'react';
import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/card';
import { AreaChart, DonutChart } from '@/components/charts';
import {
  ArrowRight,
  ArrowUpRight,
  Download,
  Layers,
  UserRound,
  FileChartColumn,
  Activity,
} from '@/components/icon';
import { SegmentedControl } from '@/components/segmented-control';
import { Sparkline } from '@/components/sparkline';
import { Tag } from '@/components/tag';
import { componentToken, useComponentTokenNumbers } from '@/lib/component-design-tokens';
import { dateLabel, downloadCsv, invoiceTotal, money, revenueByMonth } from './model';
import type { FormaStore } from './types';

export function DashboardPage({ state, navigate, notice }: FormaStore) {
  const [range, setRange] = useState('6');
  const series = revenueByMonth(state.invoices, Number(range));
  const recent = [...state.invoices].sort((a, b) => b.issued.localeCompare(a.issued)).slice(0, 5);
  const chart = useComponentTokenNumbers(['business-chart-height']);
  const currency = (amount: number) => money(amount, state.settings.currency);
  const revenue = series.reduce((sum, row) => sum + row.revenue, 0);
  const active = state.users.filter((u) => u.status === 'Active').length;
  const pending = state.invoices.filter((i) => i.status === 'Pending' || i.status === 'Overdue');
  const activeProducts = state.products.filter((p) => p.status === 'Active').length;
  const planData = [
    {
      name: 'Business',
      value: state.users.filter((u) => u.plan === 'Business').length,
      color: 'chart-1' as const,
    },
    {
      name: 'Pro',
      value: state.users.filter((u) => u.plan === 'Pro').length,
      color: 'chart-2' as const,
    },
    {
      name: 'Starter',
      value: state.users.filter((u) => u.plan === 'Starter').length,
      color: 'chart-3' as const,
    },
  ];
  const metrics = [
    {
      label: 'Collected revenue',
      value: currency(revenue),
      detail: `Over the last ${range} months`,
      icon: Activity,
      sparkline: series.map((s) => s.revenue),
    },
    {
      label: 'Active users',
      value: String(active),
      detail: `${state.users.length} people in your workspace`,
      icon: UserRound,
    },
    {
      label: 'Active products',
      value: String(activeProducts),
      detail: `${state.products.filter((p) => p.status === 'Draft').length} draft ready for your next launch`,
      icon: Layers,
    },
    {
      label: 'Outstanding',
      value: currency(pending.reduce((sum, i) => sum + invoiceTotal(i), 0)),
      detail: `${pending.length} invoices awaiting payment`,
      icon: FileChartColumn,
    },
  ];
  return (
    <section className="forma-page" aria-label="Dashboard overview">
      <PageHeader
        title="Dashboard"
        description="Your business, at a glance. A clear view of people, products, and progress."
        actions={
          <>
            <Button
              emphasis="secondary"
              leadingIcon={<Download size={componentToken('application.icon-md')} />}
              onClick={() => {
                downloadCsv(
                  'forma-revenue.csv',
                  ['Month', `Collected revenue (${state.settings.currency})`],
                  series.map((r) => [r.key, r.revenue]),
                );
                notice('Revenue report downloaded.');
              }}
            >
              Export report
            </Button>
          </>
        }
      />
      <ContentGrid
        className="forma-metrics"
        maxColumns={formaRecipes.dashboard.maxColumns}
        minItemWidth={formaRecipes.dashboard.minItemWidth}
      >
        {metrics.map(({ label, value, detail, icon: Icon, sparkline }) => (
          <Card key={label} className="forma-metric" aria-label={label}>
            <div className="forma-metric-label">
              <span>{label}</span>
              <Icon size={componentToken('application.icon-navigation')} />
            </div>
            <div className="forma-metric-value-row">
              <strong className="forma-metric-value">{value}</strong>
              {sparkline && (
                <Sparkline data={sparkline} label="Monthly collected revenue" intent="function" />
              )}
            </div>
            <p className="forma-metric-detail">{detail}</p>
          </Card>
        ))}
      </ContentGrid>
      <section className="forma-chart-grid" aria-labelledby="forma-analytics-title">
        <h2 id="forma-analytics-title" className="sr-only">
          Workspace analytics
        </h2>
        <AreaChart
          title="Revenue overview"
          description="Collected invoice revenue, grouped by issue month."
          data={series}
          series={[{ key: 'revenue', label: 'Collected revenue', color: 'chart-2' }]}
          height={chart['business-chart-height']}
          valueFormatter={(amount) =>
            new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: state.settings.currency,
              notation: 'compact',
              maximumFractionDigits: 1,
            }).format(amount)
          }
          showDataTable
          showLegend={false}
          action={
            <SegmentedControl
              size="sm"
              label="Revenue period"
              value={range}
              onValueChange={setRange}
              options={[
                { value: '6', label: '6 months' },
                { value: '12', label: '12 months' },
              ]}
            />
          }
        />
        <DonutChart
          title="Users by plan"
          description="The shape of your customer base."
          data={planData}
          totalLabel="users"
          height={chart['business-chart-height']}
          showDataTable
        />
      </section>
      <div className="forma-dashboard-bottom">
        <Card>
          <CardHeader className="forma-card-heading">
            <div>
              <CardTitle aria-level={2}>Recent invoices</CardTitle>
              <p className="forma-muted">The latest activity across your accounts.</p>
            </div>
            <Button
              emphasis="ghost"
              size="sm"
              trailingIcon={<ArrowRight size={componentToken('application.icon-sm')} />}
              onClick={() => navigate('invoices')}
            >
              View all
            </Button>
          </CardHeader>
          <div
            className="forma-table-scroll"
            role="region"
            aria-label="Recent invoices table"
            tabIndex={0}
          >
            <table className="forma-recent-table">
              <caption className="sr-only">Five most recently issued invoices</caption>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Issued</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <div className="forma-inline">
                        <Avatar name={i.customer} size="sm" />
                        <div className="forma-cell-person">
                          <span className="forma-strong">{i.customer}</span>
                          <span className="forma-muted">{i.number}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Tag
                        variant="status"
                        intent={
                          i.status === 'Paid'
                            ? 'success'
                            : i.status === 'Overdue'
                              ? 'destroy'
                              : 'warning'
                        }
                      >
                        {i.status}
                      </Tag>
                    </td>
                    <td className="forma-strong">{currency(invoiceTotal(i))}</td>
                    <td className="forma-muted">{dateLabel(i.issued)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!recent.length && <p className="forma-empty">Your first invoice will appear here.</p>}
          </div>
        </Card>
        <Card className="forma-workspace-card">
          <CardHeader>
            <div className="forma-eyebrow">A LITTLE LESS ADMIN</div>
            <CardTitle aria-level={2}>Room for your next big idea.</CardTitle>
            <p className="forma-muted">
              Keep the everyday work moving. Everything you need is right here.
            </p>
          </CardHeader>
          <CardContent>
            <div className="forma-stack">
              <button className="forma-quick-action" onClick={() => navigate('users')}>
                <span className="forma-inline">
                  <UserRound size={componentToken('application.icon-navigation')} />
                  <span>
                    Manage your people<small>{state.users.length} workspace members</small>
                  </span>
                </span>
                <ArrowUpRight size={componentToken('application.icon-md')} />
              </button>
              <button className="forma-quick-action" onClick={() => navigate('products')}>
                <span className="forma-inline">
                  <Layers size={componentToken('application.icon-navigation')} />
                  <span>
                    Explore your catalogue<small>{activeProducts} active products</small>
                  </span>
                </span>
                <ArrowUpRight size={componentToken('application.icon-md')} />
              </button>
              <button className="forma-quick-action" onClick={() => navigate('invoices')}>
                <span className="forma-inline">
                  <FileChartColumn size={componentToken('application.icon-navigation')} />
                  <span>
                    Keep billing on track<small>{pending.length} outstanding invoices</small>
                  </span>
                </span>
                <ArrowUpRight size={componentToken('application.icon-md')} />
              </button>
            </div>
          </CardContent>
          <div className="forma-workspace-card-foot">Built with Aegis. Made yours.</div>
        </Card>
      </div>
    </section>
  );
}
