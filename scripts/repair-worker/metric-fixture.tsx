import { createRoot } from 'react-dom/client';
import { MetricCard } from '@/components/metric-card';
import '@/styles/globals.css';

// Trusted acceptance fixture. Dimensions and stress values are test inputs,
// never a new component default or a generated business metric.
const params = new URLSearchParams(location.search);
const mode = params.get('mode') === 'dark' ? 'dark' : 'light';
const layout =
  params.get('layout') === 'fundamental-floating' ? 'fundamental-floating' : 'fundamental';
document.documentElement.classList.toggle('dark', mode === 'dark');
document.documentElement.dataset.theme = mode;
document.documentElement.dataset.layoutTheme = layout;
createRoot(document.getElementById('root')!).render(
  <main style={{ padding: 16 }}>
    <h1>Metric containment acceptance</h1>
    <div style={{ width: 'min(100%, 400px)' }}>
      <MetricCard
        label="Collected revenue"
        value={params.get('content') === 'long-currency' ? 'CHF 123,456,789.00' : '$132,858.00'}
        sparkline={[14, 12, 19, 21, 27, 32]}
        sparklineLabel="Revenue over six months"
        delta={8.2}
      />
    </div>
  </main>,
);
