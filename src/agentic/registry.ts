import registryData from '../../registry/canonical.json';
import proposalData from '../../registry/proposals.json';

export type Issue = { path: string; code: string; message: string };
export type Validation = { valid: boolean; issues: Issue[] };
export type TokenInputBehavior = {
  freeText: true;
  commitKeys: string[];
  duplicatePolicy: 'reject' | 'ignore';
  commitOnBlur: boolean;
};
export type RegistryEntry = {
  id: string;
  name: string;
  kind: 'component' | 'pattern';
  version: number;
  aliases: string[];
  capabilities: string[];
  contract: string;
  importPath: string;
  provenance: {
    origin: 'existing-aegis' | 'experimental-composition' | 'owner-reviewed-proposal';
    source: string;
    reviewedBy: string | null;
  };
  behavior?: TokenInputBehavior;
};
export type Registry = { schemaVersion: 1; revision: number; entries: RegistryEntry[] };
export type Proposal = {
  schemaVersion: 1;
  id: string;
  proposedId: string;
  name: string;
  baseRegistryRevision: number;
  evidence: 'illustrative-fixture' | 'independent-agent-proposal';
  author: string;
  capabilities: string[];
  aliases: string[];
  behavior: TokenInputBehavior;
  anatomy: string[];
  requiredStates: string[];
  tokenGroup: 'input';
  implementation: string;
};
export const registry = registryData as Registry;
export const proposals = proposalData as Proposal[];
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const strings = (value: unknown): value is string[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every((item) => typeof item === 'string' && item.trim().length > 0) &&
  new Set(value).size === value.length;
const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Validate an imported/shared registry before resolution or mutation. */
export function validateRegistry(input: unknown): Validation {
  const issues: Issue[] = [];
  const add = (path: string, code: string, message: string) => issues.push({ path, code, message });
  if (!object(input))
    return {
      valid: false,
      issues: [{ path: '$', code: 'type', message: 'Registry must be an object.' }],
    };
  for (const key of Object.keys(input))
    if (!['schemaVersion', 'revision', 'entries'].includes(key))
      add(key, 'unknown-property', 'Unknown registry property.');
  if (input.schemaVersion !== 1)
    add('schemaVersion', 'version', 'Only registry schema 1 is supported.');
  if (!Number.isSafeInteger(input.revision) || Number(input.revision) < 1)
    add('revision', 'revision', 'Registry revision must be a positive integer.');
  if (!Array.isArray(input.entries) || !input.entries.length)
    add('entries', 'required', 'Registry entries must be a nonempty array.');
  else {
    const ids = new Set<string>();
    input.entries.forEach((entry: unknown, index: number) => {
      const path = `entries.${index}`;
      if (!object(entry)) {
        add(path, 'type', 'Each registry entry must be an object.');
        return;
      }
      const allowed = [
        'id',
        'name',
        'kind',
        'version',
        'aliases',
        'capabilities',
        'contract',
        'importPath',
        'provenance',
        'behavior',
      ];
      for (const key of Object.keys(entry))
        if (!allowed.includes(key))
          add(`${path}.${key}`, 'unknown-property', 'Unknown entry property.');
      if (typeof entry.id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(entry.id))
        add(`${path}.id`, 'identifier', 'Entry ID must be a lowercase hyphenated identifier.');
      else {
        if (ids.has(entry.id)) add(`${path}.id`, 'duplicate-id', 'Canonical IDs must be unique.');
        ids.add(entry.id);
      }
      for (const key of ['name', 'contract', 'importPath'])
        if (typeof entry[key] !== 'string' || !(entry[key] as string).trim())
          add(`${path}.${key}`, 'required', `${key} is required.`);
      if (!['component', 'pattern'].includes(String(entry.kind)))
        add(`${path}.kind`, 'enum', 'Entry kind must be component or pattern.');
      if (!Number.isSafeInteger(entry.version) || Number(entry.version) < 1)
        add(`${path}.version`, 'version', 'Canonical entry version must be positive.');
      for (const key of ['aliases', 'capabilities'])
        if (!strings(entry[key]))
          add(`${path}.${key}`, 'strings', `${key} requires unique nonempty strings.`);
      if (!object(entry.provenance))
        add(`${path}.provenance`, 'required', 'Source provenance is required.');
      else {
        const provenance = entry.provenance;
        for (const key of Object.keys(provenance))
          if (!['origin', 'source', 'reviewedBy'].includes(key))
            add(`${path}.provenance.${key}`, 'unknown-property', 'Unknown provenance property.');
        if (
          !['existing-aegis', 'experimental-composition', 'owner-reviewed-proposal'].includes(
            String(provenance.origin),
          )
        )
          add(`${path}.provenance.origin`, 'enum', 'Unknown provenance origin.');
        if (typeof provenance.source !== 'string' || !provenance.source.trim())
          add(`${path}.provenance.source`, 'required', 'Source evidence is required.');
        if (!(provenance.reviewedBy === null || typeof provenance.reviewedBy === 'string'))
          add(
            `${path}.provenance.reviewedBy`,
            'type',
            'Reviewer must be named or explicitly null.',
          );
        if (
          provenance.origin === 'owner-reviewed-proposal' &&
          (typeof provenance.reviewedBy !== 'string' || !provenance.reviewedBy.trim())
        )
          add(
            `${path}.provenance.reviewedBy`,
            'approval',
            'Promoted entries require a named owner reviewer.',
          );
      }
      if (entry.behavior !== undefined) {
        const candidate = {
          ...proposals[0],
          baseRegistryRevision: input.revision,
          behavior: entry.behavior,
        };
        const behaviorIssues = validateProposal(candidate, {
          schemaVersion: 1,
          revision: Number(input.revision),
          entries: [],
        }).issues.filter((issue) => issue.path.startsWith('behavior'));
        for (const issue of behaviorIssues) add(`${path}.${issue.path}`, issue.code, issue.message);
      }
    });
  }
  return { valid: !issues.length, issues };
}

/** Discovery ranks capability matches, aliases, names and IDs; it never invents an export. */
export function discoverRegistry(query: string, source: Registry = registry): RegistryEntry[] {
  const words = normalize(query).split(' ').filter(Boolean);
  return source.entries
    .map((entry) => {
      const fields = [entry.id, entry.name, ...entry.aliases, ...entry.capabilities].map(normalize);
      const score = words.reduce(
        (sum, word) => sum + fields.filter((field) => field.includes(word)).length,
        0,
      );
      return { entry, score };
    })
    .filter((row) => !words.length || row.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id))
    .map((row) => row.entry);
}

export function validateProposal(input: unknown, source: Registry = registry): Validation {
  const issues: Issue[] = [];
  const add = (path: string, code: string, message: string) => issues.push({ path, code, message });
  if (!object(input))
    return {
      valid: false,
      issues: [{ path: '$', code: 'type', message: 'A proposal must be an object.' }],
    };
  const allowed = [
    'schemaVersion',
    'id',
    'proposedId',
    'name',
    'baseRegistryRevision',
    'evidence',
    'author',
    'capabilities',
    'aliases',
    'behavior',
    'anatomy',
    'requiredStates',
    'tokenGroup',
    'implementation',
  ];
  for (const key of Object.keys(input))
    if (!allowed.includes(key)) add(key, 'unknown-property', `Unknown proposal property ${key}.`);
  if (input.schemaVersion !== 1)
    add('schemaVersion', 'version', 'Only schema version 1 is supported.');
  for (const key of ['id', 'proposedId', 'name', 'author', 'implementation'])
    if (typeof input[key] !== 'string' || !(input[key] as string).trim())
      add(key, 'required', `${key} must be a nonempty string.`);
  for (const key of ['id', 'proposedId'])
    if (typeof input[key] === 'string' && !/^[a-z][a-z0-9-]*$/.test(input[key] as string))
      add(key, 'identifier', 'Use a lowercase hyphenated identifier.');
  if (input.baseRegistryRevision !== source.revision)
    add(
      'baseRegistryRevision',
      'stale-revision',
      `Proposal targets registry revision ${String(input.baseRegistryRevision)}; current revision is ${source.revision}. Rebase before review.`,
    );
  if (!['illustrative-fixture', 'independent-agent-proposal'].includes(String(input.evidence)))
    add(
      'evidence',
      'enum',
      'Record whether this is an illustrative fixture or an independent proposal.',
    );
  for (const key of ['capabilities', 'aliases', 'anatomy', 'requiredStates'])
    if (!strings(input[key])) add(key, 'strings', `${key} must contain unique, nonempty strings.`);
  if (input.tokenGroup !== 'input')
    add(
      'tokenGroup',
      'ownership',
      'TokenInput owns the input category; nested children retain their own tokens.',
    );
  if (
    strings(input.capabilities) &&
    !['multi-value-entry', 'free-text-entry', 'value-validation'].every((item) =>
      (input.capabilities as string[]).includes(item),
    )
  )
    add(
      'capabilities',
      'capability',
      'TokenInput requires multi-value-entry, free-text-entry and value-validation capabilities.',
    );
  if (
    strings(input.anatomy) &&
    !['label', 'input', 'tokens', 'error'].every((item) =>
      (input.anatomy as string[]).includes(item),
    )
  )
    add('anatomy', 'required-anatomy', 'TokenInput requires label, input, tokens and error parts.');
  if (
    strings(input.requiredStates) &&
    !['empty', 'populated', 'invalid', 'disabled', 'focus-visible'].every((item) =>
      (input.requiredStates as string[]).includes(item),
    )
  )
    add(
      'requiredStates',
      'required-states',
      'The component must cover empty, populated, invalid, disabled and focus-visible states.',
    );
  if (!object(input.behavior)) add('behavior', 'required', 'A behavioral contract is required.');
  else {
    const behavior = input.behavior;
    for (const key of Object.keys(behavior))
      if (!['freeText', 'commitKeys', 'duplicatePolicy', 'commitOnBlur'].includes(key))
        add(`behavior.${key}`, 'unknown-property', 'Unknown behavior property.');
    if (behavior.freeText !== true)
      add(
        'behavior.freeText',
        'semantic-conflict',
        'TokenInput accepts newly entered values; fixed-option selection belongs to another contract.',
      );
    if (
      !strings(behavior.commitKeys) ||
      !(behavior.commitKeys as string[]).includes('Enter') ||
      !(behavior.commitKeys as string[]).every((key) => ['Enter', ','].includes(key))
    )
      add(
        'behavior.commitKeys',
        'commit-keys',
        'Supported commit keys are Enter and optional comma; Enter is required.',
      );
    if (!['reject', 'ignore'].includes(String(behavior.duplicatePolicy)))
      add('behavior.duplicatePolicy', 'enum', 'Duplicate policy must be reject or ignore.');
    if (typeof behavior.commitOnBlur !== 'boolean')
      add('behavior.commitOnBlur', 'type', 'Commit-on-blur must be explicit.');
  }
  return { valid: issues.length === 0, issues };
}

export type ProposalComparison = {
  duplicate: boolean;
  conflicts: { field: string; left: unknown; right: unknown }[];
  recommendation: 'consolidate-after-owner-review' | 'review-separate-components';
};
export function compareProposals(
  left: Proposal,
  right: Proposal,
  source: Registry = registry,
): ProposalComparison {
  for (const proposal of [left, right]) {
    const result = validateProposal(proposal, source);
    if (!result.valid) throw new Error(result.issues.map((issue) => issue.message).join(' '));
  }
  const samePurpose =
    left.proposedId === right.proposedId ||
    ['multi-value-entry', 'free-text-entry', 'value-validation'].every(
      (capability) =>
        left.capabilities.includes(capability) && right.capabilities.includes(capability),
    );
  const conflicts = (['duplicatePolicy', 'commitKeys', 'commitOnBlur'] as const)
    .filter(
      (field) => JSON.stringify(left.behavior[field]) !== JSON.stringify(right.behavior[field]),
    )
    .map((field) => ({
      field: `behavior.${field}`,
      left: left.behavior[field],
      right: right.behavior[field],
    }));
  return {
    duplicate: samePurpose,
    conflicts,
    recommendation: samePurpose ? 'consolidate-after-owner-review' : 'review-separate-components',
  };
}

export type ConsolidationPlan = {
  kind: 'consolidate-proposals';
  expectedRevision: number;
  nextRevision: number;
  targetId: string;
  proposalIds: string[];
  candidate: Proposal;
  conflicts: ProposalComparison['conflicts'];
  requiresOwnerReview: true;
  actions: string[];
};
export function planConsolidation(
  ids: string[],
  options: { expectedRevision: number },
  source: Registry = registry,
  candidates: Proposal[] = proposals,
): ConsolidationPlan {
  if (options.expectedRevision !== source.revision)
    throw new Error(
      'Stale registry revision. Refresh and rebase the proposal; do not overwrite concurrent work.',
    );
  if (ids.length < 2 || new Set(ids).size !== ids.length)
    throw new Error('Select at least two distinct proposals.');
  const selected = ids.map((id) => {
    const proposal = candidates.find((item) => item.id === id);
    if (!proposal) throw new Error(`Unknown proposal ${id}.`);
    return proposal;
  });
  const comparison = selected
    .slice(1)
    .map((proposal) => compareProposals(selected[0], proposal, source));
  if (comparison.some((item) => !item.duplicate))
    throw new Error(
      'Different capabilities require separate owner review, not automatic consolidation.',
    );
  if (source.entries.some((entry) => entry.id === selected[0].proposedId))
    throw new Error(
      'This capability already has a canonical entry. Propose an explicit versioned extension instead.',
    );
  return {
    kind: 'consolidate-proposals',
    expectedRevision: source.revision,
    nextRevision: source.revision + 1,
    targetId: selected[0].proposedId,
    proposalIds: [...ids],
    candidate: structuredClone(selected[0]),
    conflicts: comparison.flatMap((item) => item.conflicts),
    requiresOwnerReview: true,
    actions: [
      'Owner selects the behavioral policy and records its rationale.',
      'Implement and verify the chosen behavior against unchanged acceptance tests.',
      'Add one canonical entry, preserve proposal provenance, then regenerate derived discovery files.',
    ],
  };
}

export type OwnerApproval = {
  decision: 'approve';
  reviewedBy: string;
  rationale: string;
  acceptedBehavior: TokenInputBehavior;
  verification: { testsPassed: true; visualReviewed: true; evidencePath: string };
};
/** Returns an in-memory revision. The caller must persist it with an atomic Git/revision check. */
export function applyConsolidation(
  source: Registry,
  plan: ConsolidationPlan,
  approval: OwnerApproval,
  candidates: Proposal[] = proposals,
): Registry {
  const sourceValidation = validateRegistry(source);
  if (!sourceValidation.valid)
    throw new Error(
      'Invalid canonical registry. Validate imported source before applying changes.',
    );
  if (source.revision !== plan.expectedRevision || plan.nextRevision !== source.revision + 1)
    throw new Error('Stale registry revision; consolidation was not applied.');
  if (
    !approval ||
    approval.decision !== 'approve' ||
    !approval.reviewedBy?.trim() ||
    !approval.rationale?.trim() ||
    approval.verification?.testsPassed !== true ||
    approval.verification?.visualReviewed !== true ||
    !approval.verification?.evidencePath?.trim()
  )
    throw new Error('Explicit owner approval, rationale and verification evidence are required.');
  const expectedPlan = planConsolidation(
    plan.proposalIds,
    { expectedRevision: source.revision },
    source,
    candidates,
  );
  const normalized = (value: unknown): string =>
    Array.isArray(value)
      ? `[${value.map(normalized).join(',')}]`
      : object(value)
        ? `{${Object.keys(value)
            .sort()
            .map((key) => `${JSON.stringify(key)}:${normalized(value[key])}`)
            .join(',')}}`
        : JSON.stringify(value);
  if (normalized(expectedPlan) !== normalized(plan))
    throw new Error(
      'Consolidation plan differs from current proposals. Regenerate and review the plan.',
    );
  // Promotion records the reviewed implementation; changing metadata does not
  // implement a different policy or merge the candidates' source code.
  if (normalized(approval.acceptedBehavior) !== normalized(plan.candidate.behavior))
    throw new Error(
      'Accepted behavior differs from the reviewed implementation candidate. Submit a revised implementation proposal and regenerate the reviewed plan before promotion.',
    );
  const candidate = plan.candidate;
  const validation = validateProposal(candidate, source);
  if (!validation.valid) throw new Error(validation.issues.map((issue) => issue.message).join(' '));
  if (
    plan.targetId !== candidate.proposedId ||
    source.entries.some((entry) => entry.id === plan.targetId)
  )
    throw new Error('Canonical identity conflict; review an extension instead.');
  return {
    ...source,
    revision: source.revision + 1,
    entries: [
      ...source.entries,
      {
        id: candidate.proposedId,
        name: candidate.name,
        kind: 'component',
        version: 1,
        aliases: [...new Set(candidate.aliases)],
        capabilities: [...new Set(candidate.capabilities)],
        contract: `contracts/agentic/${candidate.proposedId}.json`,
        importPath: candidate.implementation,
        behavior: structuredClone(candidate.behavior),
        provenance: {
          origin: 'owner-reviewed-proposal',
          source: `${plan.proposalIds.join(', ')}; ${approval.rationale}; evidence: ${approval.verification.evidencePath}`,
          reviewedBy: approval.reviewedBy,
        },
      },
    ],
  };
}
