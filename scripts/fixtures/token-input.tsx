import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { TokenInput } from '../../src/agentic/components/TokenInput';
import '../../src/styles/globals.css';

function Fixture() {
  const [values, setValues] = useState<string[]>([]);
  const [blurValues, setBlurValues] = useState<string[]>([]);
  const [delayedValues, setDelayedValues] = useState<string[]>([]);
  const [requested, setRequested] = useState<string[]>([]);
  const [requests, setRequests] = useState(0);
  return (
    <main>
      <h1>TokenInput behavioral fixture</h1>
      <TokenInput
        label="Validated emails"
        values={values}
        onValuesChange={setValues}
        validateValue={(value) =>
          /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value) ? undefined : 'Enter an email address.'
        }
      />
      <TokenInput
        label="Commit on blur"
        values={blurValues}
        onValuesChange={setBlurValues}
        commitOnBlur
        commitKeys={['Enter']}
      />
      <button type="button">Next control</button>
      <TokenInput label="Host rejects" values={[]} onValuesChange={() => false} />
      <TokenInput label="Host stays unchanged" values={[]} onValuesChange={() => {}} />
      <TokenInput
        label="Delayed acceptance"
        values={delayedValues}
        onValuesChange={(next) => {
          setRequested(next);
          setRequests((count) => count + 1);
        }}
      />
      <button type="button" onClick={() => setDelayedValues(requested)}>
        Accept pending request
      </button>
      <p>Requests: {requests}</p>
      <TokenInput
        label="Validator throws"
        values={[]}
        onValuesChange={() => false}
        validateValue={() => {
          throw new Error('Unavailable validator');
        }}
      />
      <TokenInput
        label="Disabled values"
        values={['locked']}
        onValuesChange={() => {
          throw new Error('Disabled input emitted a change');
        }}
        disabled
      />
    </main>
  );
}
createRoot(document.getElementById('root')!).render(<Fixture />);
