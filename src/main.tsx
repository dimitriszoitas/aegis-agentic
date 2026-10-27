import { StrictMode, Suspense, lazy, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { MarketingSite } from '@/marketing/marketing-site';
import { useTheme } from '@/lib/theme';
import { useLayoutTheme } from '@/lib/layout-theme';
import { useAutoHideScrollbars } from '@/lib/scrollbars';
import './styles/globals.css';
const BusinessApp = lazy(() =>
  import('@/patterns/business-app').then((module) => ({ default: module.BusinessApp })),
);
const ComponentsPage = lazy(() =>
  import('@/marketing/components-page').then((module) => ({ default: module.ComponentsPage })),
);

function ConsoleApp() {
  useEffect(() => {
    document.title = 'Aegis · application example';
  }, []);
  const { theme, setTheme } = useTheme();
  const { layoutTheme, setLayoutTheme } = useLayoutTheme();
  return (
    <BusinessApp
      theme={theme}
      onThemeChange={setTheme}
      layoutTheme={layoutTheme}
      onLayoutThemeChange={setLayoutTheme}
    />
  );
}
function App() {
  useAutoHideScrollbars();
  const view = new URLSearchParams(window.location.search).get('view');
  return view === 'console' || view === 'components' ? (
    <Suspense
      fallback={
        <div className="app-loading" role="status">
          {view === 'console' ? 'Opening your workspace…' : 'Opening the component library…'}
        </div>
      }
    >
      {view === 'console' ? (
        <ConsoleApp />
      ) : (
        <ComponentsPage />
      )}
    </Suspense>
  ) : (
    <MarketingSite />
  );
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
