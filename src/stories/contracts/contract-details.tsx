import { useEffect, useId, useState } from 'react';
import { Button } from '@/components/button';
import { CopyButton } from '@/components/copy-button';
import { DescriptionList } from '@/components/description-list';
import { Link } from '@/components/link';
import { Tag } from '@/components/tag';
import { getContractEntry, type ContractEntry } from '@/agentic/contracts';
import './contracts.css';

const words = (name: string) => name.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('-', ' ');
const descriptiveKeys = new Set([
  'schemaVersion',
  'id',
  'name',
  'version',
  'status',
  'verification',
  'purpose',
  'evidence',
  'migration',
  'recipeSource',
  'portableRecipes',
  'guidance',
]);

/** Render canonical JSON as text and semantic lists. Contract content is never executed. */
function ContractValue({ value }: { value: unknown }) {
  if (Array.isArray(value))
    return (
      <ul>
        {value.map((item, index) => (
          <li key={index}>
            <ContractValue value={item} />
          </li>
        ))}
      </ul>
    );
  if (value !== null && typeof value === 'object')
    return (
      <dl className="contract-values">
        {Object.entries(value).map(([key, item]) => (
          <div key={key}>
            <dt>{words(key)}</dt>
            <dd>
              <ContractValue value={item} />
            </dd>
          </div>
        ))}
      </dl>
    );
  return <span>{value === null ? 'null' : String(value)}</span>;
}

function SourceReference({ path, sha256 }: { path: string; sha256: string }) {
  return (
    <span className="contract-source">
      <code>{path}</code>
      <span>
        SHA-256 <code title={sha256}>{sha256.slice(0, 16)}…</code>
      </span>
    </span>
  );
}

function ApiReference({ entry }: { entry: ContractEntry }) {
  const [raw, setRaw] = useState<string>();
  const [error, setError] = useState(false);
  const [request, setRequest] = useState(0);
  useEffect(() => {
    if (!request || !entry.api) return;
    let active = true;
    fetch(entry.api.url)
      .then((response) => {
        if (!response.ok) throw new Error('API reference unavailable');
        return response.text();
      })
      .then((value) => {
        if (active) setRaw(value);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [entry.api, request]);
  if (!entry.api) return <p>No generated API family is linked to this entry.</p>;
  return (
    <div className="contract-stack">
      <p>
        Source-extracted API facts describe available props and imports. They do not certify
        behavior.
      </p>
      <SourceReference {...entry.api.source} />
      <div className="contract-actions">
        <Link href={entry.api.url} external>
          Open API reference
        </Link>
        <Link href={entry.api.url} download={`${entry.id}-api.json`}>
          Download API JSON
        </Link>
        {raw ? (
          <CopyButton text={raw} aria-label="Copy API JSON" />
        ) : (
          <Button
            emphasis="secondary"
            size="sm"
            disabled={request > 0 && !error}
            onClick={() => {
              setError(false);
              setRequest((value) => value + 1);
            }}
          >
            {error
              ? 'Retry loading API JSON'
              : request
                ? 'Loading API JSON…'
                : 'Load API JSON to copy'}
          </Button>
        )}
      </div>
      {error && (
        <p role="alert">The API JSON could not be loaded. Use its source reference or retry.</p>
      )}
    </div>
  );
}

export function ContractDetails({ entry }: { entry: ContractEntry }) {
  const heading = useId();
  const authored = entry.contract;
  const protocol = entry.kind === 'protocol';
  return (
    <section className="contract-details" aria-label={`${entry.name} contract details`}>
      <header className="contract-detail-heading">
        <h2 id={heading}>{entry.name}</h2>
        <p>{entry.summary}</p>
        <div className="contract-actions">
          <Tag>
            {protocol ? 'System protocol' : authored ? 'Authored behavior' : 'API reference only'}
          </Tag>
          {authored && <Tag>{authored.status}</Tag>}
        </div>
      </header>
      <DescriptionList
        columns={2}
        items={[
          {
            id: 'version',
            label: 'Authored contract version',
            value: authored?.version ?? 'Not declared',
          },
          {
            id: 'registry',
            label: 'Registry entry',
            value: entry.registryId ?? 'No registry entry linked',
          },
          { id: 'api', label: 'API family', value: entry.apiFamilyId ?? 'No generated API family' },
          {
            id: 'imports',
            label: 'Public imports',
            value: entry.importPaths.length
              ? entry.importPaths.map((path) => (
                  <div key={path}>
                    <code>{path}</code>
                  </div>
                ))
              : 'No component import declared',
          },
        ]}
      />
      <section className="contract-section" aria-labelledby={`${heading}-requirements`}>
        <h3 id={`${heading}-requirements`}>Declared requirements</h3>
        {authored ? (
          <>
            <p>
              These statements come from the authored {protocol ? 'protocol' : 'behavioral'}{' '}
              contract. Their presence is a requirement record, not a passing test result.
            </p>
            <SourceReference {...authored.source} />
            {Object.entries(authored.document)
              .filter(([key]) => !descriptiveKeys.has(key))
              .map(([key, value]) => (
                <details className="contract-requirement" key={key} open={key === 'invariants'}>
                  <summary>{words(key)}</summary>
                  <ContractValue value={value} />
                </details>
              ))}
          </>
        ) : (
          <div className="contract-missing">
            <h4>No authored behavioral contract</h4>
            <p>
              This family has an API reference, but no authored behavior contract is linked. The
              catalogue does not infer interaction requirements or passing verification from source
              extraction.
            </p>
          </div>
        )}
      </section>
      <section className="contract-section" aria-labelledby={`${heading}-verification`}>
        <h3 id={`${heading}-verification`}>Verification and evidence</h3>
        <p>
          Linked checks are check sources. Evidence files report results within their stated scope.
          Neither a link nor a reported result certifies this component for every use.
        </p>
        {authored?.document.verification !== undefined && (
          <p>
            <strong>Declared verification scope: </strong>
            <ContractValue value={authored.document.verification} />
          </p>
        )}
        <h4>Check sources</h4>
        {entry.checks.length ? (
          <ul className="contract-references">
            {entry.checks.map((check) => (
              <li key={check.path}>
                <strong>{check.label}</strong>
                <p>{check.scope}</p>
                <SourceReference {...check} />
              </li>
            ))}
          </ul>
        ) : (
          <p>No check sources are linked in this catalogue.</p>
        )}
        <h4>Evidence references</h4>
        {entry.evidence.length ? (
          <ul className="contract-references">
            {entry.evidence.map((evidence) => (
              <li key={evidence.path}>
                <strong>{evidence.label}</strong>
                <p>{evidence.scope}</p>
                <p>Reported status: {evidence.reportedStatus ?? 'No status reported'}</p>
                <p>
                  Source comparison:{' '}
                  {evidence.sourceMatch === 'mismatch'
                    ? 'Mismatch — this report does not match the declared current source.'
                    : evidence.sourceMatch === 'matches-declared-source-hashes'
                      ? 'Matches declared source hashes; checks were not rerun.'
                      : 'Not assessed.'}
                </p>
                <SourceReference {...evidence} />
              </li>
            ))}
          </ul>
        ) : (
          <p>No evidence reports are linked in this catalogue.</p>
        )}
        {!!entry.limitations.length && (
          <ul>
            {entry.limitations.map((limit) => (
              <li key={limit}>{limit}</li>
            ))}
          </ul>
        )}
      </section>
      <section className="contract-section" aria-labelledby={`${heading}-api`}>
        <h3 id={`${heading}-api`}>API reference</h3>
        <ApiReference key={entry.id} entry={entry} />
      </section>
      {authored && (
        <section className="contract-section" aria-labelledby={`${heading}-raw`}>
          <div className="contract-section-heading">
            <h3 id={`${heading}-raw`}>Canonical source JSON</h3>
            <div className="contract-actions">
              <CopyButton text={authored.raw} aria-label="Copy contract JSON" />
              <Link
                href={`data:application/json;charset=utf-8,${encodeURIComponent(authored.raw)}`}
                download={`${authored.id}-contract.json`}
              >
                Download contract JSON
              </Link>
            </div>
          </div>
          <details>
            <summary>Read raw contract</summary>
            <pre className="contract-raw">
              <code>{authored.raw}</code>
            </pre>
          </details>
        </section>
      )}
    </section>
  );
}

export function ComponentContract({ componentId }: { componentId: string }) {
  const entry = getContractEntry(componentId);
  if (!entry)
    return (
      <p role="alert">
        This component is missing from the generated contract catalogue. Regenerate the catalogue to
        reconcile its API reference.
      </p>
    );
  return (
    <div className="contract-family">
      <p>
        <Link
          href={`./?path=/docs/aegis-contract-catalogue--docs&contract=${encodeURIComponent(entry.id)}`}
          target="_top"
        >
          Browse the contract catalogue
        </Link>
      </p>
      <ContractDetails entry={entry} />
    </div>
  );
}
