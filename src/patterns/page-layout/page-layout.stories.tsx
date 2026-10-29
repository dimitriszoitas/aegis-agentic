import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Button } from '@/components/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/card';
import { Field } from '@/components/field';
import { SearchInput } from '@/components/search-input';
import { TextInput } from '@/components/text-input';
import { PageLayout, ReadingColumn, ContentGrid } from './page-layout';
import type {
  PageArchetype,
  ReadingMeasure,
  ContentGridColumns,
  ContentGridMinimum,
} from './recipes';

type PlaygroundArgs = {
  archetype: PageArchetype;
  title: string;
  description: string;
  showActions: boolean;
  showFilters: boolean;
  showAside: boolean;
  showFooter: boolean;
  measure: ReadingMeasure;
  maxColumns: ContentGridColumns;
  minItemWidth: ContentGridMinimum;
};

function SampleCard({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle aria-level={2}>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        Local illustrative content. This nested Card retains its own surface and text styling.
      </CardContent>
    </Card>
  );
}

function Playground(args: PlaygroundArgs) {
  const [draft, setDraft] = useState('Support workspace');
  const [query, setQuery] = useState('');
  const [saved, setSaved] = useState(false);
  const shared = {
    title: args.title,
    description: args.description,
    actions: args.showActions ? (
      <Button onClick={() => setSaved(true)}>Save changes</Button>
    ) : undefined,
    footer: args.showFooter ? (
      <p role="status">
        {saved ? 'Changes saved locally.' : 'Illustrative page recipe. No backend is connected.'}
      </p>
    ) : undefined,
  };
  const input = (
    <Field label="Workspace name">
      <TextInput
        value={draft}
        onValueChange={(value) => {
          setDraft(value);
          setSaved(false);
        }}
      />
    </Field>
  );
  if (args.archetype === 'collection')
    return (
      <PageLayout
        {...shared}
        archetype="collection"
        filters={
          args.showFilters ? (
            <SearchInput aria-label="Search records" value={query} onValueChange={setQuery} />
          ) : undefined
        }
      >
        <SampleCard
          title={
            query
              ? `Results matching “${query}”`
              : 'Collection content occupies the available width'
          }
        />
      </PageLayout>
    );
  if (args.archetype === 'detail')
    return args.showAside ? (
      <PageLayout
        {...shared}
        archetype="detail"
        aside={<SampleCard title="Record context" />}
        asideLabel="Record context"
      >
        <ReadingColumn measure={args.measure}>{input}</ReadingColumn>
      </PageLayout>
    ) : (
      <PageLayout {...shared} archetype="detail">
        <ReadingColumn measure={args.measure}>{input}</ReadingColumn>
      </PageLayout>
    );
  if (args.archetype === 'settings')
    return (
      <PageLayout {...shared} archetype="settings" measure={args.measure}>
        {input}
      </PageLayout>
    );
  return (
    <PageLayout
      {...shared}
      archetype="dashboard"
      maxColumns={args.maxColumns}
      minItemWidth={args.minItemWidth}
    >
      {['Open requests', 'First response', 'Resolved today', 'Customer feedback'].map((title) => (
        <SampleCard key={title} title={title} />
      ))}
    </PageLayout>
  );
}

const meta = {
  id: 'patterns-pagelayout',
  title: 'Patterns/Page Structure/PageLayout',
  component: PageLayout,
  subcomponents: { ReadingColumn: ReadingColumn, ContentGrid: ContentGrid },
  render: Playground,
  tags: ['autodocs'],
  args: {
    archetype: 'settings',
    title: 'Workspace settings',
    description: 'A shared page structure with explicit regions and a deliberate content measure.',
    showActions: true,
    showFilters: true,
    showAside: true,
    showFooter: true,
    measure: 'comfortable',
    maxColumns: 4,
    minItemWidth: 'regular',
  },
  argTypes: {
    archetype: {
      control: 'inline-radio',
      options: ['collection', 'detail', 'settings', 'dashboard'],
    },
    measure: {
      control: 'inline-radio',
      options: ['compact', 'comfortable', 'wide'],
      if: { arg: 'archetype', eq: 'settings' },
    },
    maxColumns: {
      control: 'inline-radio',
      options: [1, 2, 3, 4],
      if: { arg: 'archetype', eq: 'dashboard' },
    },
    minItemWidth: {
      control: 'inline-radio',
      options: ['small', 'regular', 'large'],
      if: { arg: 'archetype', eq: 'dashboard' },
    },
    showFilters: { if: { arg: 'archetype', eq: 'collection' } },
    showAside: { if: { arg: 'archetype', eq: 'detail' } },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Initial library choices for collection, detail, settings, and dashboard pages. PageHeader owns the heading and actions. PageLayout adds transparent region wrappers without page padding or child styling. ReadingColumn provides 55ch/65ch/75ch starting measures. ContentGrid uses a container-responsive maximum of one to four columns. Products can propose additional recipes through review.',
      },
    },
  },
} satisfies Omit<Meta<PlaygroundArgs>, 'component'> & { component: typeof PageLayout };
export default meta;
// Demo controls belong to this renderer; generated API metadata comes from the public components.
type Story = StoryObj<PlaygroundArgs>;

export const Overview: Story = {};
export const Collection: Story = {
  args: {
    archetype: 'collection',
    title: 'Requests',
    description: 'Browse local records with filters above the collection.',
  },
};
export const Detail: Story = { args: { archetype: 'detail', title: 'Customer workspace' } };
export const Dashboard: Story = { args: { archetype: 'dashboard', title: 'Support overview' } };
export const Anatomy: Story = {
  render: () => (
    <PageLayout
      archetype="detail"
      title="Header slot"
      description="PageHeader renders the actual title and actions."
      actions={<Button>Action slot</Button>}
      aside={<p>Aside slot — supplementary context</p>}
      asideLabel="Supplementary context"
      footer={<p>Footer slot — local status or supporting actions</p>}
    >
      <ReadingColumn>
        <p>Main slot — a deliberate reading column inside the detail region.</p>
      </ReadingColumn>
    </PageLayout>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Inspect [data-page-slot="header"], [data-page-slot="main"], [data-page-slot="aside"], and [data-page-slot="footer"]. Collection additionally exposes [data-page-slot="filters"]. These are real slot wrappers; child component boundaries remain intact.',
      },
    },
  },
};
export const ReadingAndGrid: Story = {
  render: () => (
    <ContentGrid maxColumns={2} minItemWidth="small">
      <ReadingColumn measure="compact">
        <SampleCard title="Compact reading column" />
      </ReadingColumn>
      <ReadingColumn measure="wide">
        <SampleCard title="Wide reading column" />
      </ReadingColumn>
    </ContentGrid>
  ),
};
export const EditAndSave: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox', { name: 'Workspace name' });
    await userEvent.clear(input);
    await userEvent.type(input, 'Draft workspace');
    await expect(input).toHaveValue('Draft workspace');
    await userEvent.click(canvas.getByRole('button', { name: 'Save changes' }));
    await expect(canvas.getByRole('status')).toHaveTextContent('Changes saved locally.');
    await expect(canvas.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  },
};
