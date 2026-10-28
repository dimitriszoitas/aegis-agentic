import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  TokenInput,
  type TokenInputAcknowledgment,
  type TokenInputRequest,
} from '../../src/agentic/components/TokenInput';
import '../../src/styles/globals.css';

function AsyncFixture() {
  const [values, setValues] = useState<string[]>([]);
  const [acknowledgment, setAcknowledgment] = useState<TokenInputAcknowledgment>();
  const requests = useRef<{ values: string[]; request: TokenInputRequest }[]>([]);
  const [count, setCount] = useState(0);
  function respond(index: number, status: 'accepted' | 'rejected') {
    const entry = requests.current[index];
    if (!entry) return;
    // A cancelled async request must not update committed host values.
    if (status === 'accepted' && !entry.request.signal.aborted) setValues(entry.values);
    setAcknowledgment({ requestId: entry.request.requestId, status });
  }
  return (
    <section>
      <TokenInput
        label="Async labels"
        values={values}
        confirmationMode="request"
        acknowledgment={acknowledgment}
        onValuesChange={(next, request) => {
          requests.current.push({ values: next, request });
          setCount(requests.current.length);
        }}
      />
      <p>Async requests: {count}</p>
      <button onClick={() => respond(requests.current.length - 1, 'accepted')}>
        Accept latest
      </button>
      <button onClick={() => respond(requests.current.length - 1, 'rejected')}>
        Reject latest
      </button>
      <button onClick={() => respond(0, 'accepted')}>Accept first stale</button>
      <button onClick={() => respond(0, 'rejected')}>Reject first stale</button>
      <button onClick={() => setValues(requests.current.at(-1)?.values ?? [])}>
        Echo without acknowledgment
      </button>
    </section>
  );
}
function Fixture() {
  const [values, setValues] = useState<string[]>(['Existing']);
  const [ignored, setIgnored] = useState<string[]>(['Alpha']);
  const [disabled, setDisabled] = useState(false);
  const [mode, setMode] = useState('dark');
  const [theme, setTheme] = useState('fundamental');
  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    document.documentElement.dataset.layoutTheme = theme;
    document.documentElement.classList.toggle('dark', mode === 'dark');
    document.documentElement.style.colorScheme = mode;
  }, [mode, theme]);
  return (
    <main>
      <h1>Consolidated TokenInput acceptance</h1>
      <button onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}>Toggle mode</button>
      <button
        onClick={() => setTheme(theme === 'fundamental' ? 'fundamental-floating' : 'fundamental')}
      >
        Toggle presentation
      </button>
      <button onClick={() => setDisabled(!disabled)}>Toggle disabled</button>
      <TokenInput
        label="Project labels"
        values={values}
        onValuesChange={setValues}
        disabled={disabled}
        suggestions={['Suggested', 'Other choice']}
        validateValue={(value) => (value === 'invalid' ? 'Invalid label.' : null)}
      />
      <TokenInput
        label="Ignore duplicates"
        values={ignored}
        onValuesChange={setIgnored}
        duplicatePolicy="ignore"
      />
      <AsyncFixture />
      <button>Outside control</button>
    </main>
  );
}
createRoot(document.getElementById('root')!).render(<Fixture />);
