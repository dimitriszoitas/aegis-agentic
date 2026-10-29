/** A scenario covers its stated assertion, never every sentence of a linked requirement. */
export const caseCatalog = [
  {
    id: 'push-filter-layout',
    title: 'Filter panel reserves space and leaves results interactive',
    oracle: 'assertPushFilterLayout',
    requirementRefs: [
      'filter-panel#panel-lifecycle',
      'project-recipes#push-resizes-results',
      'project-recipes#push-keeps-results-interactive',
      'project-recipes#narrow-panel-order',
    ],
    scope:
      'Nonmodal push geometry, narrow stacking, no backdrop/inert results, pointer and keyboard access. Does not test every facet or query rule.',
    contexts: [
      {
        id: 'storybook-filter-panel',
        surface: 'storybook',
        route: 'patterns-filterpanel--synchronized',
        requirementRefs: ['filter-panel#panel-lifecycle'],
      },
      ...['users', 'products', 'invoices'].map((collection) => ({
        id: `forma-${collection}`,
        surface: 'forma',
        route: collection,
        requirementRefs: [
          'project-recipes#push-resizes-results',
          'project-recipes#push-keeps-results-interactive',
          'project-recipes#narrow-panel-order',
        ],
      })),
    ],
  },
  {
    id: 'density-changes-rows',
    title: 'Each density choice changes both selected state and rendered rows',
    oracle: 'assertDensityChanges',
    requirementRefs: ['data-grid#density-state-and-geometry'],
    scope:
      'Compact/default/comfortable selected state and strictly increasing measured row heights. Does not certify all token ownership or grid behavior.',
    contexts: [
      {
        id: 'storybook-data-grid',
        surface: 'storybook',
        route: 'components-data-datagrid--default',
      },
      { id: 'forma-users', surface: 'forma', route: 'users' },
      { id: 'forma-invoices', surface: 'forma', route: 'invoices' },
    ],
  },
  {
    id: 'modal-keyboard-dismissal',
    title: 'Keyboard opening and Escape dismissal restore focus to the opener',
    oracle: 'assertKeyboardDismissal',
    requirementRefs: ['dialog#dismissal-policy', 'dialog#focus-return-boundary'],
    scope:
      'Normal surviving opener with Enter, initial focus, Escape and focus return. Does not certify pointer dismissal or removed opener recovery.',
    contexts: [
      { id: 'storybook-modal', surface: 'storybook', route: 'components-overlays-modal--default' },
      { id: 'forma-add-user', surface: 'forma', route: 'users' },
    ],
  },
];

export const acceptanceMatrix = {
  widths: [1440, 390],
  themes: ['light', 'dark'],
  presentations: ['fundamental', 'fundamental-floating'],
};

export function plannedExecutions(cases = caseCatalog, matrix = acceptanceMatrix) {
  return cases.flatMap((scenario) =>
    scenario.contexts.flatMap((context) =>
      matrix.widths.flatMap((width) =>
        matrix.themes.flatMap((theme) =>
          matrix.presentations.map((presentation) => ({
            id: `${scenario.id}:${context.id}:${width}:${presentation}:${theme}`,
            caseId: scenario.id,
            context,
            width,
            theme,
            presentation,
            requirementRefs: context.requirementRefs ?? scenario.requirementRefs,
          })),
        ),
      ),
    ),
  );
}

export function buildRequirementInventory(contracts, records = [], cases = caseCatalog) {
  return contracts.flatMap((contract) =>
    (contract.requirements ?? []).map((requirement) => {
      const ref = `${contract.id}#${requirement.id}`;
      const linked = cases.filter((scenario) => scenario.requirementRefs.includes(ref));
      const plans = plannedExecutions(linked).filter((plan) => plan.requirementRefs.includes(ref));
      const evidence = records.filter((record) => plans.some((plan) => plan.id === record.id));
      const missing = plans.filter(
        (planned) => !evidence.some((record) => record.id === planned.id),
      );
      const status = evidence.some((record) => record.status === 'failed')
        ? 'failed'
        : !linked.length
          ? 'unsupported'
          : missing.length || evidence.some((record) => record.status === 'not-run')
            ? 'not-run'
            : evidence.length && evidence.every((record) => record.status === 'passed')
              ? 'passed'
              : 'unsupported';
      return {
        requirementRef: ref,
        contractId: contract.id,
        requirementId: requirement.id,
        owner: requirement.kind,
        status,
        coverage: linked.length ? 'partial-scenario' : 'no-executable-scenario',
        caseIds: linked.map((scenario) => scenario.id),
        evidenceIds: evidence.map((record) => record.id),
        planned: plans.length,
        executed: evidence.filter((record) => ['passed', 'failed'].includes(record.status)).length,
        reason: linked.length
          ? 'Status applies only to the linked finite scenarios; the full authored requirement remains subject to review.'
          : 'This finite runner has no executable scenario for this authored requirement.',
      };
    }),
  );
}
