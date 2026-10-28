import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@/package/reset.css';
import '@/package/styles.css';
import { Button } from '@/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/card';
import { DataGrid, type DataGridProps } from '@/components/data-grid';
import { Field } from '@/components/field';
import { SearchInput } from '@/components/search-input';
import { TextInput } from '@/components/text-input';
import { PageLayout, ReadingColumn } from './page-layout';
import type { ContentGridColumns, ReadingMeasure } from './recipes';

const options = new URLSearchParams(window.location.search);
const record = {
  id: 'local-1',
  title: 'A long local support request title for checking collection overflow',
  customer: 'Customer workspace',
  status: 'Open',
  priority: 'Normal',
};
const columns: DataGridProps<typeof record>['columns'] = [
  'title',
  'customer',
  'status',
  'priority',
].map((key) => ({ accessorKey: key, header: key }));

function BrowserFixture() {
  const [draft, setDraft] = useState('Local draft');
  const field = (
    <Field label="Persistent draft">
      <TextInput id="draft-input" value={draft} onValueChange={setDraft} />
    </Field>
  );
  const type = options.get('case') ?? 'settings';
  const shared = {
    title: 'A readable page with a clear primary task',
    description: 'Local layout verification fixture.',
    actions: <Button>Primary action</Button>,
    footer: <p>Supporting page information.</p>,
  };
  let content;
  if (type === 'collection')
    content = (
      <PageLayout
        {...shared}
        archetype="collection"
        filters={<SearchInput aria-label="Find records" />}
      >
        <DataGrid
          data={[record]}
          columns={columns}
          getRowId={(row) => row.id}
          label="Local records"
          enableSelection={false}
        />
      </PageLayout>
    );
  else if (type === 'detail')
    content = (
      <PageLayout
        {...shared}
        archetype="detail"
        aside={
          <Card>
            <CardHeader>
              <CardTitle>Related context</CardTitle>
            </CardHeader>
            <CardContent>One secondary region after the main content.</CardContent>
          </Card>
        }
        asideLabel="Related context"
      >
        <ReadingColumn>
          {field}
          <p>
            The main region contains the primary task. Resize the container to stack the related
            context below it.
          </p>
        </ReadingColumn>
      </PageLayout>
    );
  else if (type === 'dashboard')
    content = (
      <PageLayout
        {...shared}
        archetype="dashboard"
        maxColumns={Number(options.get('columns') ?? 4) as ContentGridColumns}
      >
        {['Requests', 'Customers', 'Response time', 'Feedback', 'Activity', 'Follow-ups'].map(
          (title, index) => (
            <Card key={title}>
              <CardHeader>
                <CardTitle>{title}</CardTitle>
              </CardHeader>
              <CardContent>{index === 0 ? field : 'Local illustrative information.'}</CardContent>
            </Card>
          ),
        )}
      </PageLayout>
    );
  else
    content = (
      <PageLayout
        {...shared}
        archetype="settings"
        measure={(options.get('measure') ?? 'comfortable') as ReadingMeasure}
      >
        <form>
          {field}
          <p>
            Settings remain in one main reading column. Theme and container changes preserve the
            form draft.
          </p>
        </form>
      </PageLayout>
    );
  return <main id="fixture-container">{content}</main>;
}

createRoot(document.getElementById('root')!).render(<BrowserFixture />);
