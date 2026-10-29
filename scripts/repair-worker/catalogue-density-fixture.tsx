import { useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { DataGrid, type GridDensity } from '@/components/data-grid';
import type { ColumnDef } from '@tanstack/react-table';
import '@/styles/globals.css';

// Trusted fixed acceptance content. This is not a new component default.
const records = ['Ada', 'Grace', 'Linus', 'Margaret', 'Alan', 'Radia'].map((name, index) => ({
  id: `record-${index + 1}`,
  name,
  status: index % 2 ? 'Invited' : 'Active',
}));
type RecordRow = (typeof records)[number];
const columns: ColumnDef<RecordRow>[] = [
  { accessorKey: 'name', header: 'Name', size: 160, minSize: 120 },
  { accessorKey: 'status', header: 'Status', size: 160, minSize: 120 },
];
const params = new URLSearchParams(location.search);
const mode = params.get('mode') === 'dark' ? 'dark' : 'light';
const layout =
  params.get('layout') === 'fundamental-floating' ? 'fundamental-floating' : 'fundamental';
document.documentElement.classList.toggle('dark', mode === 'dark');
document.documentElement.dataset.theme = mode;
document.documentElement.dataset.layoutTheme = layout;
function DensityFixture() {
  const [density, setDensity] = useState<GridDensity>('default');
  const [opened, setOpened] = useState('none');
  const controlled = params.get('host') === 'controlled';
  return (
    <main style={{ padding: 16 }}>
      <h1>Data grid density acceptance</h1>
      <p role="status" aria-label="Opened record">
        {opened}
      </p>
      <DataGrid
        data={records}
        columns={columns}
        getRowId={(row) => row.id}
        rowLabel={(row) => `${row.id}: ${row.name}`}
        label="Density acceptance records"
        enableSelection={false}
        pagination={false}
        onRowClick={(row) => setOpened(row.id)}
        {...(controlled ? { density, onDensityChange: setDensity } : {})}
      />
    </main>
  );
}
const fixtureWindow = window as Window & { __aegisDensityRoot?: Root };
fixtureWindow.__aegisDensityRoot ??= createRoot(document.getElementById('root')!);
fixtureWindow.__aegisDensityRoot.render(<DensityFixture />);
