import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { Tag } from '@/components/tag';
import { TextInput } from '@/components/text-input';
import './infrastructure-panel.css';

/** The console only consumes the local service's public JSON boundary. */
interface InfrastructureStatus {
  schemaVersion: 1;
  project: { id: string; name: string };
  release: { version: string; registryRevision: number };
  health: { status: string; issues: unknown[] };
  usage: Record<string, unknown>;
  capabilities: {
    components: number;
    configurableDimensions: number;
    constrainedProps: number;
    unconstrainedProps: number;
  };
  ai: { configured: boolean; provider: 'openai' | 'none'; model: string | null };
  recentRuns: { id: string; kind: string; createdAt: string; status: string; summary: string }[];
}
interface MaintenanceProposal {
  id: string;
  kind: 'coverage-gap' | 'configuration-gap' | 'usage-hotspot' | 'repair-review';
  componentId: string | null;
  rationale: string;
  evidenceIds: string[];
  suggestedAction: string;
}
interface ServicePlan {
  id: string;
  status: 'review-required' | 'no-action';
  createdAt: string;
  source: 'rules' | 'openai';
  summary: string;
  proposals: MaintenanceProposal[];
  deterministic: Record<string, unknown>;
  verification: 'proposal-only';
}

const apiBase = '/api/aegis';
const startCommand = 'npm run infrastructure -- serve --project .aegis-workspace --port 4177';
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const isText = (value: unknown): value is string => typeof value === 'string';

function parseStatus(value: unknown): InfrastructureStatus {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    !isRecord(value.project) ||
    !isText(value.project.id) ||
    !isText(value.project.name) ||
    !isRecord(value.release) ||
    !isText(value.release.version) ||
    !isCount(value.release.registryRevision) ||
    !isRecord(value.health) ||
    !isText(value.health.status) ||
    !Array.isArray(value.health.issues) ||
    !isRecord(value.usage) ||
    !isRecord(value.capabilities) ||
    !['components', 'configurableDimensions', 'constrainedProps', 'unconstrainedProps'].every(
      (key) => isCount(value.capabilities && (value.capabilities as Record<string, unknown>)[key]),
    ) ||
    !isRecord(value.ai) ||
    typeof value.ai.configured !== 'boolean' ||
    !['openai', 'none'].includes(String(value.ai.provider)) ||
    !(value.ai.model === null || isText(value.ai.model)) ||
    !Array.isArray(value.recentRuns) ||
    !value.recentRuns.every(
      (run) =>
        isRecord(run) &&
        ['id', 'kind', 'createdAt', 'status', 'summary'].every((key) => isText(run[key])),
    )
  )
    throw new Error(
      'The service returned an unsupported status response. Check that the console and service versions match.',
    );
  return value as unknown as InfrastructureStatus;
}

function parsePlan(value: unknown): ServicePlan {
  if (
    !isRecord(value) ||
    !isText(value.id) ||
    !isText(value.createdAt) ||
    !isText(value.summary) ||
    !['review-required', 'no-action'].includes(String(value.status)) ||
    !['rules', 'openai'].includes(String(value.source)) ||
    value.verification !== 'proposal-only' ||
    !isRecord(value.deterministic) ||
    !Array.isArray(value.proposals) ||
    !value.proposals.every(
      (proposal) =>
        isRecord(proposal) &&
        isText(proposal.id) &&
        ['coverage-gap', 'configuration-gap', 'usage-hotspot', 'repair-review'].includes(
          String(proposal.kind),
        ) &&
        (proposal.componentId === null || isText(proposal.componentId)) &&
        isText(proposal.rationale) &&
        isText(proposal.suggestedAction) &&
        Array.isArray(proposal.evidenceIds) &&
        proposal.evidenceIds.every(isText),
    )
  )
    throw new Error(
      'The service returned an unsupported maintenance plan. No changes were made by this console.',
    );
  return value as unknown as ServicePlan;
}

function parseInventory(value: unknown) {
  if (
    !isRecord(value) ||
    !['ready', 'blocked'].includes(String(value.status)) ||
    !Array.isArray(value.components) ||
    !value.components.every(
      (component) =>
        isRecord(component) &&
        isText(component.componentId) &&
        isText(component.name) &&
        Array.isArray(component.dimensions),
    )
  ) {
    throw new Error('Unsupported configuration inventory response.');
  }
  return value;
}

async function request(path: string, signal: AbortSignal, body?: unknown): Promise<unknown> {
  const response = await fetch(`${apiBase}${path}`, {
    signal,
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json', 'X-Aegis-Client': 'console' } : {}),
    },
    ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}),
  });
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error(
      'No JSON response from the local infrastructure service. Start the service and refresh.',
    );
  }
  const data: unknown = await response.json();
  if (!response.ok) {
    throw new Error(
      isRecord(data) && isText(data.error)
        ? data.error
        : `The local service returned HTTP ${response.status}.`,
    );
  }
  return data;
}

function readable(value: string) {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ');
}
function displayValue(value: unknown) {
  if (value === null || value === undefined) return 'Not reported';
  if (typeof value === 'boolean') return value ? 'Enabled' : 'Disabled';
  if (typeof value === 'number') return value.toLocaleString();
  return String(value);
}
function StructuredDetails({ label, value }: { label: string; value: unknown }) {
  return (
    <details className="aip-details">
      <summary>{label}</summary>
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </details>
  );
}

function ConfigurationInventory({ value }: { value: unknown }) {
  const [query, setQuery] = useState('');
  const components =
    isRecord(value) && Array.isArray(value.components)
      ? value.components.filter(
          (component): component is Record<string, unknown> =>
            isRecord(component) && isText(component.componentId) && isText(component.name),
        )
      : [];
  const matched = components.filter((component) =>
    `${component.name} ${component.componentId}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <section className="aip-card" aria-labelledby="aip-inventory-title">
      <div className="aip-heading">
        <h2 id="aip-inventory-title">Component configuration inventory</h2>
        <Tag>
          {isRecord(value) && isText(value.status) ? readable(value.status) : 'Service response'}
        </Tag>
      </div>
      <p>
        Allowed choices come from extracted component contracts. Possible combinations are finite
        estimates; verified configurations require explicit evidence records.
      </p>
      <TextInput
        aria-label="Search configuration inventory"
        placeholder="Search components…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <p role="status">
        {matched.length} of {components.length} components
      </p>
      <div className="aip-inventory-list">
        {matched.map((component) => {
          const dimensions = Array.isArray(component.dimensions)
            ? component.dimensions.filter(isRecord)
            : [];
          const coverage = isRecord(component.coverage) ? component.coverage : {};
          const estimate = isRecord(component.estimate) ? component.estimate : {};
          return (
            <details className="aip-component" key={String(component.componentId)}>
              <summary>
                <strong>{String(component.name)}</strong>
                <span>
                  {dimensions.length} dimensions · {displayValue(coverage.verifiedConfigurations)}{' '}
                  verified configurations
                </span>
              </summary>
              <p>
                Possible combinations: {displayValue(estimate.combinations)}
                {estimate.capped === true ? ' (capped)' : ''}. Estimate only; conditional
                combinations have not been verified.
              </p>
              <dl className="aip-dimensions">
                {dimensions.map((dimension, index) => (
                  <div key={isText(dimension.id) ? dimension.id : index}>
                    <dt>{displayValue(dimension.id ?? dimension.name)}</dt>
                    <dd>
                      {Array.isArray(dimension.allowedValues)
                        ? dimension.allowedValues.map(displayValue).join(' · ')
                        : 'Unconstrained by the extracted contract'}
                      <small>
                        Default:{' '}
                        {dimension.defaultKnown === true
                          ? displayValue(dimension.defaultValue)
                          : 'Not known'}
                      </small>
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          );
        })}
      </div>
      <StructuredDetails label="Inspect configuration inventory" value={value} />
    </section>
  );
}

export function InfrastructurePanel() {
  const [status, setStatus] = useState<InfrastructureStatus | null>(null);
  const [inventory, setInventory] = useState<unknown>(null);
  const [connectionError, setConnectionError] = useState('');
  const [inventoryError, setInventoryError] = useState('');
  const [loading, setLoading] = useState(true);
  const [observedAt, setObservedAt] = useState<string | null>(null);
  const [useAI, setUseAI] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [plan, setPlan] = useState<ServicePlan | null>(null);
  const [planError, setPlanError] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionResult, setActionResult] = useState<unknown>(null);
  const statusRequest = useRef<AbortController | null>(null);
  const planRequest = useRef<AbortController | null>(null);
  const actionRequest = useRef<AbortController | null>(null);

  async function refresh() {
    statusRequest.current?.abort();
    const controller = new AbortController();
    statusRequest.current = controller;
    const timeout = window.setTimeout(() => controller.abort('timeout'), 10000);
    setLoading(true);
    setConnectionError('');
    const [statusResult, inventoryResult] = await Promise.allSettled([
      request('/status', controller.signal).then(parseStatus),
      request('/configurability', controller.signal).then(parseInventory),
    ]);
    window.clearTimeout(timeout);
    if (statusRequest.current !== controller) return;
    if (controller.signal.aborted && controller.signal.reason !== 'timeout') return;
    if (statusResult.status === 'fulfilled') {
      setStatus(statusResult.value);
      setObservedAt(new Date().toLocaleTimeString());
      if (!statusResult.value.ai.configured) setUseAI(false);
    } else {
      setConnectionError(
        controller.signal.aborted
          ? 'The local service did not respond within 10 seconds.'
          : statusResult.reason instanceof Error
            ? statusResult.reason.message
            : 'Cannot reach the local infrastructure service.',
      );
    }
    if (inventoryResult.status === 'fulfilled') {
      setInventory(inventoryResult.value);
      setInventoryError('');
    } else {
      setInventory(null);
      setInventoryError(
        'The configuration inventory is unavailable. Refresh after checking the service.',
      );
    }
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
    return () => {
      statusRequest.current?.abort();
      statusRequest.current = null;
      planRequest.current?.abort();
      planRequest.current = null;
      actionRequest.current?.abort();
      actionRequest.current = null;
    };
  }, []);

  async function createPlan() {
    if (!status || connectionError || loading || planRequest.current || actionRequest.current)
      return;
    const controller = new AbortController();
    planRequest.current = controller;
    const timeout = window.setTimeout(() => controller.abort('timeout'), 60000);
    setPlanning(true);
    setPlanError('');
    setPlan(null);
    try {
      const next = parsePlan(
        await request('/plan', controller.signal, { useAI: useAI && status.ai.configured }),
      );
      if (planRequest.current === controller) setPlan(next);
    } catch (error) {
      if (planRequest.current === controller) {
        setPlanError(
          controller.signal.aborted
            ? 'The request timed out. Check recent service runs before trying again.'
            : error instanceof Error
              ? error.message
              : 'The plan could not be created.',
        );
      }
    } finally {
      window.clearTimeout(timeout);
      if (planRequest.current === controller) {
        planRequest.current = null;
        setPlanning(false);
      }
    }
  }

  async function serviceAction(path: '/usage/settings' | '/reconcile', body: unknown) {
    if (!status || connectionError || loading || planRequest.current || actionRequest.current)
      return;
    const controller = new AbortController();
    actionRequest.current = controller;
    const timeout = window.setTimeout(() => controller.abort('timeout'), 60000);
    setActionBusy(true);
    setActionError('');
    setActionResult(null);
    try {
      const result = await request(path, controller.signal, body);
      if (actionRequest.current !== controller) return;
      setActionResult(result);
      await refresh();
    } catch (error) {
      if (actionRequest.current === controller)
        setActionError(
          controller.signal.aborted
            ? 'The request timed out. Refresh service status before retrying.'
            : error instanceof Error
              ? error.message
              : 'The service action failed.',
        );
    } finally {
      window.clearTimeout(timeout);
      if (actionRequest.current === controller) {
        actionRequest.current = null;
        setActionBusy(false);
      }
    }
  }

  const connected = status !== null && !connectionError;
  const usageFields = status
    ? [
        ['Event count', status.usage.eventCount],
        ['Rejected events', status.usage.rejectedEvents],
        ['Retention window (days)', status.usage.retentionDays],
        ['Event buffer limit', status.usage.maximumEvents],
      ].filter(([, value]) => value !== undefined)
    : [];
  const observedComponents =
    status && isRecord(status.usage.byComponent)
      ? Object.entries(status.usage.byComponent)
          .filter((entry): entry is [string, number] => isCount(entry[1]))
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
      : [];
  return (
    <div className="aip" data-testid="infrastructure-panel">
      <header className="aw-section-intro">
        <span className="aw-eyebrow">06 / INFRASTRUCTURE</span>
        <h1>Operate your design system.</h1>
        <p>
          Inspect the installed system, understand its use, and prepare evidence-backed maintenance
          proposals from a local service.
        </p>
      </header>
      <section className="aip-connection" aria-label="Infrastructure connection">
        <div>
          <strong>
            {loading
              ? 'Connecting to local service…'
              : connected
                ? status.project.name
                : status
                  ? 'Connection lost · last snapshot retained'
                  : 'Local service is disconnected'}
          </strong>
          <p>
            {observedAt
              ? `Snapshot read at ${observedAt}. Refresh to read current data.`
              : 'This console reads your project service. No sample usage is displayed.'}
          </p>
        </div>
        <Button
          emphasis="secondary"
          onClick={() => void refresh()}
          disabled={loading || planning || actionBusy}
        >
          {loading ? 'Refreshing…' : 'Refresh service'}
        </Button>
      </section>
      {connectionError && (
        <div className="aip-error" role="alert">
          <strong>{status ? 'Snapshot may be out of date.' : 'Service unavailable.'}</strong>{' '}
          {connectionError}
        </div>
      )}
      {actionError && (
        <p className="aip-error" role="alert">
          {actionError}
        </p>
      )}
      {actionBusy && (
        <p role="status">Waiting for the local service to confirm the requested change…</p>
      )}
      {actionResult !== null && (
        <div className="aip-card">
          <p role="status">Service action completed. Inspect the returned result below.</p>
          <StructuredDetails label="Inspect service action result" value={actionResult} />
        </div>
      )}
      {!status && !loading && (
        <section className="aip-card aip-start" aria-labelledby="aip-start-title">
          <span className="aw-eyebrow">CONNECT YOUR WORKSPACE</span>
          <h2 id="aip-start-title">Start the local infrastructure service</h2>
          <p>
            Run this command from the experiment folder with an initialized workspace, then refresh
            this console.
          </p>
          <code>{startCommand}</code>
          <p>
            Usage stays empty until a project sends permitted events. AI remains off until the
            service is configured and you explicitly request it.
          </p>
        </section>
      )}
      {status && (
        <>
          <div className="aip-metrics" aria-label="Installed system summary">
            <div>
              <span>System health</span>
              <strong>{readable(status.health.status)}</strong>
              <small>{status.health.issues.length} reported issues</small>
            </div>
            <div>
              <span>Installed release</span>
              <strong>{status.release.version}</strong>
              <small>Registry revision {status.release.registryRevision}</small>
            </div>
            <div>
              <span>Components inventoried</span>
              <strong>{status.capabilities.components.toLocaleString()}</strong>
              <small>{status.capabilities.configurableDimensions} configurable dimensions</small>
            </div>
            <div>
              <span>AI adapter</span>
              <strong>{status.ai.configured ? status.ai.provider : 'Not configured'}</strong>
              <small>{status.ai.model ?? 'Local rules are available'}</small>
            </div>
          </div>
          <div className="aip-columns">
            <section className="aip-card" aria-labelledby="aip-usage-title">
              <div className="aip-heading">
                <h2 id="aip-usage-title">Usage evidence</h2>
                <Tag>Service data</Tag>
              </div>
              <p>
                Reported activity describes the instrumented surfaces only. Missing events do not
                prove that a component is unused.
              </p>
              <Checkbox
                label="Accept permitted usage events"
                description="Opt in to local collection from instrumented consumers. Turning this off stops collection and clears retained events. Console interactions are not product usage."
                checked={status.usage.telemetryEnabled === true}
                disabled={
                  typeof status.usage.telemetryEnabled !== 'boolean' ||
                  !connected ||
                  loading ||
                  planning ||
                  actionBusy
                }
                onCheckedChange={(checked) =>
                  void serviceAction('/usage/settings', { enabled: checked === true })
                }
              />
              {usageFields.length > 0 ? (
                <dl className="aip-facts">
                  {usageFields.map(([key, value]) => (
                    <div key={String(key)}>
                      <dt>{String(key)}</dt>
                      <dd>{displayValue(value)}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p>No usage totals were reported. Inspect the service response below.</p>
              )}
              {observedComponents.length > 0 ? (
                <div className="aip-observed">
                  <h3>Most observed components</h3>
                  <dl className="aip-facts">
                    {observedComponents.map(([id, count]) => (
                      <div key={id}>
                        <dt>{id}</dt>
                        <dd>{count.toLocaleString()} events</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : (
                <p>No component activity is recorded in this snapshot.</p>
              )}
              <StructuredDetails label="Inspect usage report" value={status.usage} />
            </section>
            <section className="aip-card" aria-labelledby="aip-config-title">
              <div className="aip-heading">
                <h2 id="aip-config-title">Configurability</h2>
                <Tag>Inventory</Tag>
              </div>
              <p>
                Separate choices already bounded by component contracts from props that still need a
                configuration policy.
              </p>
              <dl className="aip-facts">
                <div>
                  <dt>Configurable dimensions</dt>
                  <dd>{status.capabilities.configurableDimensions}</dd>
                </div>
                <div>
                  <dt>Constrained props</dt>
                  <dd>{status.capabilities.constrainedProps}</dd>
                </div>
                <div>
                  <dt>Unconstrained props</dt>
                  <dd>{status.capabilities.unconstrainedProps}</dd>
                </div>
              </dl>
              {inventoryError ? (
                <p className="aip-error" role="status">
                  {inventoryError}
                </p>
              ) : (
                <p>Inspect component dimensions and evidence in the inventory below.</p>
              )}
            </section>
          </div>
          {inventory !== null && <ConfigurationInventory value={inventory} />}
          {status.health.issues.length > 0 && (
            <section className="aip-card" aria-labelledby="aip-health-title">
              <h2 id="aip-health-title">Health findings</h2>
              <StructuredDetails
                label={`${status.health.issues.length} findings reported by the service`}
                value={status.health.issues}
              />
              {status.health.status === 'drift' && (
                <>
                  <p>
                    Regenerate derived output only when the service verifies that source inputs are
                    unchanged. Other changes remain review-required.
                  </p>
                  <div className="aip-action-row">
                    <Button
                      emphasis="secondary"
                      disabled={!connected || loading || planning || actionBusy}
                      onClick={() => void serviceAction('/reconcile', {})}
                    >
                      Repair derived drift
                    </Button>
                  </div>
                </>
              )}
            </section>
          )}
          <section className="aip-card" aria-labelledby="aip-maintenance-title">
            <div className="aip-heading">
              <div>
                <span className="aw-eyebrow">REVIEW BEFORE CHANGE</span>
                <h2 id="aip-maintenance-title">Plan maintenance</h2>
              </div>
              <Tag>Proposals only</Tag>
            </div>
            <p>
              Ask the service to turn health, configuration, and usage evidence into proposed
              actions. A plan does not apply updates or approve component changes.
            </p>
            <Checkbox
              label="Include AI analysis"
              description={
                status.ai.configured
                  ? `Send the system report to the configured ${status.ai.provider} adapter (${status.ai.model ?? 'service-selected model'}). This request can incur provider costs.`
                  : 'Configure an AI provider in the local service to enable this option.'
              }
              checked={useAI && status.ai.configured}
              onCheckedChange={(checked) => setUseAI(checked === true)}
              disabled={!status.ai.configured || !connected || loading || planning || actionBusy}
            />
            <div className="aip-action-row">
              <Button
                onClick={() => void createPlan()}
                disabled={!connected || loading || planning || actionBusy}
              >
                {planning ? 'Preparing proposal…' : 'Plan maintenance'}
              </Button>
              <span>
                {useAI && status.ai.configured
                  ? 'Rules + configured AI adapter'
                  : 'Local deterministic rules'}
              </span>
            </div>
            {planError && (
              <p className="aip-error" role="alert">
                {planError}
              </p>
            )}
            {planning && (
              <p role="status">
                The service is preparing a plan. No change is being applied by this console.
              </p>
            )}
            {plan && (
              <div className="aip-plan" data-testid="infrastructure-plan">
                <div className="aip-heading">
                  <h3>
                    {plan.status === 'no-action' ? 'No action proposed' : 'Ready for owner review'}
                  </h3>
                  <Tag>{plan.source === 'openai' ? 'AI-assisted' : 'Rules-based'}</Tag>
                </div>
                <p role="status">{plan.summary}</p>
                <p className="aip-meta">
                  Plan {plan.id} · {plan.createdAt} · Proposal only
                </p>
                {plan.proposals.map((proposal) => (
                  <article className="aip-proposal" key={proposal.id}>
                    <div className="aip-heading">
                      <h4>{readable(proposal.kind)}</h4>
                      {proposal.componentId && <Tag>{proposal.componentId}</Tag>}
                    </div>
                    <p>{proposal.rationale}</p>
                    <p>
                      <strong>Suggested action:</strong> {proposal.suggestedAction}
                    </p>
                    <small>
                      Evidence:{' '}
                      {proposal.evidenceIds.length
                        ? proposal.evidenceIds.join(', ')
                        : 'No evidence identifiers supplied'}
                    </small>
                  </article>
                ))}
                <StructuredDetails label="Inspect complete maintenance plan" value={plan} />
              </div>
            )}
          </section>
          <section className="aip-card" aria-labelledby="aip-runs-title">
            <h2 id="aip-runs-title">Recent service runs</h2>
            {status.recentRuns.length === 0 ? (
              <p>No runs have been reported in this snapshot.</p>
            ) : (
              <ol className="aip-runs">
                {status.recentRuns.map((run) => (
                  <li key={run.id}>
                    <div className="aip-heading">
                      <strong>{readable(run.kind)}</strong>
                      <Tag>{readable(run.status)}</Tag>
                    </div>
                    <p>{run.summary}</p>
                    <small>
                      {run.createdAt} · {run.id}
                    </small>
                  </li>
                ))}
              </ol>
            )}
            <p className="aip-meta">Refresh the service snapshot to see new runs.</p>
          </section>
        </>
      )}
    </div>
  );
}
