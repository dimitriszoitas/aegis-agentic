import { PageHeader } from '@/patterns/page-header';
import { Tag } from '@/components/tag';
import { acceptanceInventory } from '@/agentic/acceptance';
import '../contracts/contracts.css';

export function AcceptanceReference() {
  return (
    <article className="contract-stack">
      <PageHeader
        title="Acceptance coverage"
        description="See which written requirements have reusable browser scenarios. Coverage registration and executed results are separate."
      />
      <p>
        This inventory describes the shared acceptance runner. Other component tests still exist in
        the repository. An unsupported requirement here means this runner has no scenario for it,
        not that the component has never been tested.
      </p>
      <p>
        Publication includes registered coverage. To produce current execution evidence, run the
        acceptance command against the corresponding Storybook and product builds. Reports bind the
        local source and oracle hashes, context, theme, width and observations.
      </p>
      <ul>
        {Object.entries(acceptanceInventory.summary).map(([status, count]) => (
          <li key={status}>
            <Tag>{status}</Tag> {count} requirements
          </li>
        ))}
      </ul>
      {acceptanceInventory.cases.map((scenario) => (
        <section key={scenario.id}>
          <h2>{scenario.title}</h2>
          <p>{scenario.scope}</p>
          <p>
            Shared check: <code>{scenario.oracle}</code>
          </p>
          <ul>
            {scenario.contexts.map((context) => (
              <li key={context.id}>
                {context.surface}: <code>{context.route}</code>
              </li>
            ))}
          </ul>
          <details>
            <summary>Requirement references</summary>
            <ul>
              {scenario.requirementRefs.map((reference) => (
                <li key={reference}>
                  <code>{reference}</code>
                </li>
              ))}
            </ul>
          </details>
        </section>
      ))}
      <h2>Run and inspect</h2>
      <pre>
        <code>
          {
            'npm run acceptance:browser -- --storybook http://127.0.0.1:6006 --forma http://127.0.0.1:4175 --out artifacts/acceptance/report.json\nnode agent-kit/bin/aegis.mjs acceptance coverage'
          }
        </code>
      </pre>
      <p>
        Each mapped requirement has partial scenario coverage. The report does not certify complete
        accessibility, every state, visual approval, or autonomous repair eligibility.
      </p>
    </article>
  );
}
