import { createRoot } from 'react-dom/client';
import { Button } from '@/components/button';
import '@/styles/globals.css';
document.documentElement.dataset.layoutTheme = 'fundamental';
createRoot(document.getElementById('root')!).render(
  <main>
    <h1>Primary Button contrast reproduction</h1>
    <Button>Primary action</Button>
  </main>,
);
