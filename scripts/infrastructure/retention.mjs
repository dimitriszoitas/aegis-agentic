const DAY = 24 * 60 * 60 * 1000;
export const retentionLimits = Object.freeze({
  usageMaxEvents: 10000,
  planMaxCount: 100,
  maxAgeMs: 30 * DAY,
  receiptMaxCount: 1000,
});
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const keys = (value, allowed) => Object.keys(value).every((key) => allowed.includes(key));
const uuid = (value) =>
  typeof value === 'string' &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
const validTime = (value) => Number.isSafeInteger(value) && value >= 0;
const issue = (code, path, message) => ({ code, path, message });

/** Pure preflight. Invalid data is preserved rather than silently filtered as retention. */
export function planRetention({ usage, plans, policy, registryRevision, core, now }) {
  const issues = [];
  if (!validTime(now))
    issues.push(issue('retention-clock', '', 'Retention requires a valid current time.'));
  if (!core.validateUsagePolicy(policy).valid)
    issues.push(
      issue(
        'retention-policy',
        'usage-policy.json',
        'The usage policy needs review before retention.',
      ),
    );
  const envelopeValid =
    record(usage) &&
    usage.version === 1 &&
    keys(usage, ['version', 'events', 'receipts']) &&
    Array.isArray(usage.events) &&
    Array.isArray(usage.receipts ?? []);
  if (!envelopeValid)
    issues.push(issue('retention-usage', 'usage.json', 'The stored usage envelope needs review.'));
  const receipts = envelopeValid ? (usage.receipts ?? []) : [];
  if (
    receipts.length > retentionLimits.receiptMaxCount ||
    receipts.some(
      (receipt) =>
        !record(receipt) ||
        !keys(receipt, ['id', 'sha256']) ||
        typeof receipt.id !== 'string' ||
        !/^[a-zA-Z0-9-]{1,64}$/.test(receipt.id) ||
        typeof receipt.sha256 !== 'string' ||
        !/^[a-f0-9]{64}$/.test(receipt.sha256),
    ) ||
    new Set(receipts.map((receipt) => receipt?.id)).size !== receipts.length
  ) {
    issues.push(issue('retention-receipts', 'usage.json', 'Stored batch receipts need review.'));
  }
  if (
    !issues.length &&
    usage.events.some(
      (event) =>
        !core.validateUsageEvent(event, policy).valid ||
        event.registryRevision !== registryRevision ||
        event.timestamp > now,
    )
  ) {
    issues.push(
      issue(
        'retention-event',
        'usage.json',
        'At least one stored event is invalid. No content was removed.',
      ),
    );
  }
  if (!Array.isArray(plans))
    issues.push(issue('retention-plans', 'plans', 'The proposal directory needs review.'));
  else
    for (const entry of plans) {
      const plan = entry?.value;
      const timestamp =
        record(plan) && typeof plan.createdAt === 'string' ? Date.parse(plan.createdAt) : NaN;
      const allowed = [
        'id',
        'status',
        'createdAt',
        'source',
        'summary',
        'proposals',
        'deterministic',
        'verification',
        'modelUsage',
      ];
      const proposalValid = (proposal) =>
        record(proposal) &&
        keys(proposal, [
          'id',
          'kind',
          'componentId',
          'rationale',
          'evidenceIds',
          'suggestedAction',
        ]) &&
        typeof proposal.id === 'string' &&
        /^[a-z][a-z0-9-]{0,63}$/.test(proposal.id) &&
        ['coverage-gap', 'configuration-gap', 'usage-hotspot', 'repair-review'].includes(
          proposal.kind,
        ) &&
        (proposal.componentId === null || typeof proposal.componentId === 'string') &&
        typeof proposal.rationale === 'string' &&
        proposal.rationale.trim().length > 0 &&
        typeof proposal.suggestedAction === 'string' &&
        proposal.suggestedAction.trim().length > 0 &&
        Array.isArray(proposal.evidenceIds) &&
        proposal.evidenceIds.length > 0 &&
        proposal.evidenceIds.every((id) => typeof id === 'string');
      if (
        !record(plan) ||
        !keys(plan, allowed) ||
        !uuid(plan.id) ||
        entry.name !== `${plan.id}.json` ||
        !validTime(timestamp) ||
        timestamp > now ||
        new Date(timestamp).toISOString() !== plan.createdAt ||
        !['review-required', 'no-action'].includes(plan.status) ||
        !['rules', 'openai'].includes(plan.source) ||
        plan.verification !== 'proposal-only' ||
        typeof plan.summary !== 'string' ||
        !plan.summary.trim() ||
        !Array.isArray(plan.proposals) ||
        plan.proposals.length > 8 ||
        (plan.proposals.length === 0) !== (plan.status === 'no-action') ||
        !plan.proposals.every(proposalValid) ||
        !record(plan.deterministic) ||
        (plan.modelUsage !== undefined && !record(plan.modelUsage))
      ) {
        issues.push(
          issue(
            'retention-plan',
            'plans',
            'At least one proposal has invalid identity or metadata. No proposals were removed.',
          ),
        );
        break;
      }
    }
  if (issues.length) return { status: 'review-required', issues };
  const cutoff = now - retentionLimits.maxAgeMs;
  const unexpired = usage.events.filter((event) => event.timestamp >= cutoff);
  // Preserve arrival ordering, matching the service's ingestion buffer policy.
  const events = unexpired.slice(-retentionLimits.usageMaxEvents);
  const unexpiredPlans = plans.filter((entry) => Date.parse(entry.value.createdAt) >= cutoff);
  const orderedPlans = [...unexpiredPlans].sort(
    (a, b) =>
      Date.parse(b.value.createdAt) - Date.parse(a.value.createdAt) ||
      (a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
  );
  const keep = new Set(
    orderedPlans.slice(0, retentionLimits.planMaxCount).map((entry) => entry.name),
  );
  const removePlans = plans
    .filter((entry) => !keep.has(entry.name))
    .map((entry) => entry.name)
    .sort();
  const counts = {
    usage: {
      before: usage.events.length,
      retained: events.length,
      expired: usage.events.length - unexpired.length,
      overflow: unexpired.length - events.length,
    },
    plans: {
      before: plans.length,
      retained: keep.size,
      expired: plans.length - unexpiredPlans.length,
      overflow: unexpiredPlans.length - keep.size,
    },
  };
  return {
    status: removePlans.length || events.length !== usage.events.length ? 'maintained' : 'no-op',
    issues: [],
    counts,
    usage: { version: 1, events, receipts },
    removePlans,
  };
}

/** Opt-in process-local scheduler. Retention continues after the repair circuit opens. */
export function createMaintenanceLoop({
  service,
  intervalMs,
  failureLimit = 3,
  clock = () => Date.now(),
  setIntervalImpl = setInterval,
  clearIntervalImpl = clearInterval,
}) {
  if (
    !Number.isSafeInteger(intervalMs) ||
    intervalMs < 1 ||
    !Number.isSafeInteger(failureLimit) ||
    failureLimit < 1
  )
    throw new Error('Maintenance interval and failure limit must be positive integers.');
  if (
    !service ||
    ['maintainRetention', 'health', 'reconcile'].some(
      (method) => typeof service[method] !== 'function',
    )
  )
    throw new Error('Maintenance requires retention, health, and reconciliation operations.');
  let running = false,
    stopped = false,
    repairPaused = false,
    consecutiveFailures = 0,
    lastCycle = null;
  const status = () =>
    structuredClone({
      running,
      stopped,
      repairPaused,
      consecutiveFailures,
      failureLimit,
      lastCycle,
    });
  const timestamp = () => {
    const value = clock();
    if (!validTime(value)) throw new Error('Invalid maintenance clock.');
    return value;
  };
  async function tick() {
    if (stopped) return { status: 'stopped' };
    if (running) return { status: 'skipped', reason: 'cycle-running' };
    running = true;
    let phase = 'clock';
    const cycle = {
      startedAt: null,
      finishedAt: null,
      status: 'completed',
      retentionStatus: null,
      healthStatus: null,
      repairStatus: null,
      failurePhase: null,
    };
    try {
      cycle.startedAt = timestamp();
      phase = 'retention';
      const retained = await service.maintainRetention();
      cycle.retentionStatus = retained?.status ?? null;
      if (!['maintained', 'no-op'].includes(retained?.status))
        throw new Error('Retention requires review.');
      if (stopped) cycle.status = 'stopped';
      else {
        phase = 'health';
        const health = await service.health();
        cycle.healthStatus = health?.status ?? null;
        if (!['healthy', 'drift'].includes(health?.status))
          throw new Error('Health requires review.');
        if (stopped) cycle.status = 'stopped';
        else {
          if (health.status === 'drift') {
            if (repairPaused) cycle.status = 'paused';
            else {
              phase = 'repair';
              const repaired = await service.reconcile();
              cycle.repairStatus = repaired?.status ?? null;
              if (repaired?.status !== 'verified' || repaired?.health?.status !== 'healthy')
                throw new Error('Repair did not independently verify.');
            }
          }
          if (!repairPaused) consecutiveFailures = 0;
        }
      }
    } catch {
      cycle.status = 'failed';
      cycle.failurePhase = phase;
      consecutiveFailures = Math.min(failureLimit, consecutiveFailures + 1);
      if (consecutiveFailures >= failureLimit) repairPaused = true;
    } finally {
      try {
        cycle.finishedAt = timestamp();
      } catch {
        /* Invalid clocks remain reviewable without hiding an earlier failure. */
      }
      lastCycle = cycle;
      running = false;
    }
    return structuredClone(cycle);
  }
  const timer = setIntervalImpl(() => {
    void tick();
  }, intervalMs);
  return {
    tick,
    status,
    resume() {
      if (running || stopped) throw new Error('Resume requires an idle, active maintenance loop.');
      repairPaused = false;
      consecutiveFailures = 0;
      return status();
    },
    stop() {
      if (!stopped) {
        stopped = true;
        clearIntervalImpl(timer);
      }
      return status();
    },
  };
}
