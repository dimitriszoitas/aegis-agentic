import { useEffect, useState, type ReactNode } from 'react';
import { Tabs } from '@base-ui/react/tabs';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CopyButton } from '@/components/copy-button';
import { DocumentationLink } from '../contracts/documentation-link';
import componentSource from '../../../skills/create-component/SKILL.md?raw';
import tokenSource from '../../../skills/create-token/SKILL.md?raw';
import layoutSource from '../../../skills/create-layout/SKILL.md?raw';
import buildUiSource from '../../../skills/build-ui/SKILL.md?raw';
import systemizeRepoSource from '../../../skills/systemize-repo/SKILL.md?raw';
import consolidationSource from '../../../skills/systemize-repo/references/consolidation.md?raw';
import systemizationRecordSource from '../../../skills/systemize-repo/references/systemization-record.md?raw';
import systemizationAccessibilitySource from '../../../skills/systemize-repo/references/accessibility.md?raw';
import systemizationStorybookSource from '../../../skills/systemize-repo/references/storybook.md?raw';
import systemizationUsageSource from '../../../skills/systemize-repo/references/usage.md?raw';
import systemizationStagesSource from '../../../skills/systemize-repo/references/stages.md?raw';
import composePatternSource from '../../../skills/compose-pattern/SKILL.md?raw';
import extendDesignLanguageSource from '../../../skills/extend-design-language/SKILL.md?raw';
import auditUiSource from '../../../skills/audit-ui/SKILL.md?raw';
import designContractSource from '../../../skills/references/design-contract.md?raw';
import agenticContractSource from '../../../skills/references/agentic-contract.md?raw';
import pageCompositionSource from '../../../skills/references/page-composition.md?raw';
import patternPolicySource from '../../../skills/references/pattern-policy.md?raw';
import './agentic-skill-page.css';

const designContract = {
  id: 'shared-design-contract',
  title: 'Shared design contract',
  path: 'skills/references/design-contract.md',
  source: designContractSource,
} as const;

const agenticContract = {
  id: 'shared-agentic-contract',
  title: 'Shared Agentic contract',
  path: 'skills/references/agentic-contract.md',
  source: agenticContractSource,
} as const;

const pageComposition = {
  id: 'page-composition',
  title: 'Constructing a page',
  path: 'skills/references/page-composition.md',
  source: pageCompositionSource,
} as const;

const patternPolicy = {
  id: 'project-pattern-policy',
  title: 'Project pattern policy',
  path: 'skills/references/pattern-policy.md',
  source: patternPolicySource,
} as const;

const consolidation = {
  id: 'systemization-consolidation',
  title: 'Consolidation decisions',
  path: 'skills/systemize-repo/references/consolidation.md',
  source: consolidationSource,
} as const;

const systemizationRecord = {
  id: 'systemization-record',
  title: 'Systemization record',
  path: 'skills/systemize-repo/references/systemization-record.md',
  source: systemizationRecordSource,
} as const;

const systemizationAccessibility = {
  id: 'systemization-accessibility',
  title: 'Accessibility target',
  path: 'skills/systemize-repo/references/accessibility.md',
  source: systemizationAccessibilitySource,
} as const;

const systemizationStorybook = {
  id: 'systemization-storybook',
  title: 'Canonical family documentation',
  path: 'skills/systemize-repo/references/storybook.md',
  source: systemizationStorybookSource,
} as const;

const systemizationUsage = {
  id: 'systemization-usage',
  title: 'Application usage evidence',
  path: 'skills/systemize-repo/references/usage.md',
  source: systemizationUsageSource,
} as const;

const systemizationStages = {
  id: 'systemization-stages',
  title: 'Stages and migration progress',
  path: 'skills/systemize-repo/references/stages.md',
  source: systemizationStagesSource,
} as const;

const skills = {
  component: {
    name: 'create-component',
    title: 'Component Creation',
    description:
      'Build or extend a reusable component with the right behavior, public API, tokens, and documentation.',
    useFor: 'A reusable component or an existing component that needs a new capability.',
    result: 'A typed component, focused stories, real anatomy, and verified interactions.',
    request: 'Build or extend a reusable component for the requested interaction.',
    source: componentSource,
    contracts: [designContract, agenticContract, patternPolicy],
  },
  token: {
    name: 'create-token',
    title: 'Token Creation',
    description:
      'Add or migrate design decisions through Primitive, Semantic, and Group tokens without hiding changes in the reference chain.',
    useFor: 'A new design role, an exact value that is missing, or a token naming migration.',
    result: 'A complete reference chain, four explicit mappings, and verified consumers.',
    request: 'Add or refine the requested token and migrate every affected reference.',
    source: tokenSource,
    contracts: [designContract],
  },
  layout: {
    name: 'create-layout',
    title: 'Layout Creation',
    description:
      'Compose application pages and reusable patterns from existing components while preserving hierarchy, state, and responsive behavior.',
    useFor: 'A page, workspace, or composed pattern with connected navigation and state.',
    result: 'A responsive composition with useful actions and consistent theme geometry.',
    request: 'Compose the requested responsive application layout from the existing system.',
    source: layoutSource,
    contracts: [designContract, agenticContract, pageComposition, patternPolicy],
  },
  'build-ui': {
    name: 'build-ui',
    title: 'Build UI',
    description:
      'Build a React interface from an installed Agentic kit using a locked profile, canonical contracts, and existing behavior primitives.',
    useFor: 'An application interface that should reuse a project’s approved design language.',
    result:
      'Application code with pinned inputs, validated composition, and explicit verification limits.',
    request: 'Build the requested interface using the installed kit and its canonical components.',
    source: buildUiSource,
    contracts: [agenticContract, designContract, pageComposition, patternPolicy],
  },
  'systemize-repo': {
    name: 'systemize-repo',
    title: 'Systemize Repo',
    description:
      'Organize an existing product into shared components, patterns, layouts, and tokens while preserving its design language and interaction decisions.',
    useFor:
      'An existing product or design system with overlapping families, incomplete variant documentation, scattered styling, or undocumented decisions.',
    result:
      'An evidence-backed design inventory and staged refactor with compatible reuse, preserved APIs and variants, and verified behavior.',
    request:
      'Systemize this repository. Infer and preserve its current design language, consolidate compatible implementations, and migrate tokens in verified slices.',
    source: systemizeRepoSource,
    contracts: [
      consolidation,
      systemizationRecord,
      systemizationAccessibility,
      systemizationStorybook,
      systemizationUsage,
      systemizationStages,
      agenticContract,
      designContract,
      pageComposition,
      patternPolicy,
    ],
  },
  'compose-pattern': {
    name: 'compose-pattern',
    title: 'Compose Pattern',
    description:
      'Select and configure a canonical pattern while preserving its structural and behavioral invariants.',
    useFor:
      'A supported pattern with explicit variants, state ownership, and a reusable specification.',
    result: 'A validated, versioned specification backed by the canonical implementation.',
    request:
      'Configure the requested pattern using approved variants and validate its specification.',
    source: composePatternSource,
    contracts: [agenticContract, designContract, pageComposition, patternPolicy],
  },
  'extend-design-language': {
    name: 'extend-design-language',
    title: 'Extend Design Language',
    description:
      'Propose missing capabilities and reconcile overlapping contributions through the shared registry.',
    useFor: 'A component or capability that approved entries do not cover.',
    result:
      'An experimental proposal, supporting evidence, and a consolidation plan for owner review.',
    request: 'Discover existing capabilities, then propose and reconcile the requested extension.',
    source: extendDesignLanguageSource,
    contracts: [agenticContract, designContract, patternPolicy],
  },
  'audit-ui': {
    name: 'audit-ui',
    title: 'Audit UI',
    description:
      'Audit an interface using reproducible evidence and distinguish bounded derived-file repair from changes requiring review.',
    useFor:
      'Observed drift, behavioral defects, missing capabilities, or uncertain interface findings.',
    result:
      'Verified findings, permitted repair evidence, and explicit review needs for other changes.',
    request: 'Audit the requested interface and remediate only within the kit’s repair authority.',
    source: auditUiSource,
    contracts: [agenticContract, designContract, pageComposition, patternPolicy],
  },
} as const;

type SkillId = keyof typeof skills;

function markdownBody(source: string) {
  return source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').replace(/^\s*# [^\n]+\n/, '');
}

function SkillDocumentationLink({ href, children }: { href?: string; children?: ReactNode }) {
  const references: Record<string, string> = {
    'design-contract.md': designContract.id,
    'agentic-contract.md': agenticContract.id,
    'page-composition.md': pageComposition.id,
    'pattern-policy.md': patternPolicy.id,
    'consolidation.md': consolidation.id,
    'systemization-record.md': systemizationRecord.id,
    'accessibility.md': systemizationAccessibility.id,
    'storybook.md': systemizationStorybook.id,
    'usage.md': systemizationUsage.id,
    'stages.md': systemizationStages.id,
  };
  const [path, fragment] = href?.split('#') ?? [];
  const skillName = path?.match(/^(?:\.\.?\/)*(?:skills\/)?([\w-]+)\/SKILL\.md$/)?.[1];
  const skillEntry = Object.entries(skills).find(([, skill]) => skill.name === skillName);
  if (skillEntry) {
    const url = new URL(navigationWindow().location.href);
    if (!url.searchParams.get('path')?.startsWith('/docs/agentic-skills-')) {
      url.searchParams.set('path', '/docs/agentic-skills-component-creation--docs');
    }
    url.searchParams.set('agenticSkill', skillEntry[0]);
    url.hash = fragment ?? '';
    return (
      <a href={url.href} target="_top">
        {children}
      </a>
    );
  }
  const file = path?.split('/').at(-1);
  const resolved =
    file && Object.hasOwn(references, file)
      ? `#${references[file]}${fragment ? `-${fragment}` : ''}`
      : href;
  return <DocumentationLink href={resolved}>{children}</DocumentationLink>;
}

function SkillContent({ skillId }: { skillId: SkillId }) {
  const skill = skills[skillId];
  const path = `skills/${skill.name}/SKILL.md`;
  const invocation = `Use $${skill.name} from ${path}. ${skill.request}`;
  const instructions = `${[skill.source, ...skill.contracts.map((contract) => contract.source)]
    .map((source) => source.trim())
    .join('\n\n')}\n`;
  return (
    <>
      <header className="agentic-skill-header agentic-skill-selected-header">
        <h2>{skill.title}</h2>
        <p>{skill.description}</p>
      </header>

      <dl className="agentic-skill-summary">
        <div>
          <dt>Use for</dt>
          <dd>{skill.useFor}</dd>
        </div>
        <div>
          <dt>Expected result</dt>
          <dd>{skill.result}</dd>
        </div>
      </dl>

      <section className="agentic-skill-invocation" aria-labelledby="use-this-skill">
        <div className="agentic-skill-copy-row">
          <h2 id="use-this-skill">Use this skill</h2>
          <div className="agentic-skill-copy-action">
            <span>Copy instructions</span>
            <CopyButton text={instructions} aria-label={`Copy ${skill.title} instructions`} />
          </div>
        </div>
        <p>
          Open <code>{path}</code> in the repository, or copy the instructions together with the
          applicable shared contracts below. Skill discovery depends on the agent environment; an
          explicit file path also works when repository skills are not listed automatically.
        </p>
        <pre>
          <code>{invocation}</code>
        </pre>
      </section>

      <div className="agentic-skill-prose">
        <Markdown
          remarkPlugins={[remarkGfm]}
          skipHtml
          components={{
            a: ({ href, children }) => (
              <SkillDocumentationLink href={href}>{children}</SkillDocumentationLink>
            ),
          }}
        >
          {markdownBody(skill.source)}
        </Markdown>
      </div>

      {skill.contracts.map((contract) => (
        <section
          key={contract.id}
          className="agentic-skill-contract agentic-skill-prose"
          id={contract.id}
          aria-labelledby={`${contract.id}-title`}
        >
          <h2 id={`${contract.id}-title`}>{contract.title}</h2>
          <p className="agentic-skill-source-path">
            Source: <code>{contract.path}</code>
          </p>
          <Markdown
            remarkPlugins={[remarkGfm]}
            skipHtml
            components={{
              h2: ({ children }) => (
                <h3
                  id={`${contract.id}-${String(children)
                    .toLowerCase()
                    .replace(/[^\w\s-]/g, '')
                    .replace(/\s+/g, '-')}`}
                >
                  {children}
                </h3>
              ),
              a: ({ href, children }) => (
                <SkillDocumentationLink href={href}>{children}</SkillDocumentationLink>
              ),
            }}
          >
            {markdownBody(contract.source)}
          </Markdown>
        </section>
      ))}
    </>
  );
}

function navigationWindow() {
  try {
    if (window.top?.location.origin === window.location.origin) return window.top;
  } catch {
    // Standalone previews can retain their own selected tab.
  }
  return window;
}

function readSkill(fallback: SkillId): SkillId {
  const value = new URLSearchParams(navigationWindow().location.search).get('agenticSkill');
  return value && Object.hasOwn(skills, value) ? (value as SkillId) : fallback;
}

/** The old section routes still initialize their corresponding tab. */
export function AgenticSkillPage({ skillId = 'component' }: { skillId?: SkillId }) {
  const [activeSkill, setActiveSkill] = useState(() => readSkill(skillId));
  useEffect(() => {
    const target = navigationWindow();
    const restore = () => setActiveSkill(readSkill(skillId));
    restore();
    target.addEventListener('popstate', restore);
    return () => target.removeEventListener('popstate', restore);
  }, [skillId]);

  return (
    <article className="agentic-skill-page">
      <header className="agentic-skill-header">
        <h1>Agentic Skills</h1>
        <p>
          Repository instructions for creating components, tokens, and layouts, plus building,
          systemizing, composing, extending, and auditing interfaces with the portable Agentic kit.
          Each tab renders the source skill and its applicable shared contracts, together with a
          copy action.
        </p>
      </header>
      <Tabs.Root
        value={activeSkill}
        onValueChange={(value) => {
          if (typeof value !== 'string' || !Object.hasOwn(skills, value)) return;
          setActiveSkill(value as SkillId);
          const target = navigationWindow();
          const url = new URL(target.location.href);
          url.searchParams.set('agenticSkill', value);
          target.history.replaceState(target.history.state, '', url);
        }}
      >
        <Tabs.List className="agentic-skill-navigation" aria-label="Agentic skills" activateOnFocus>
          {Object.entries(skills).map(([id, item]) => (
            <Tabs.Tab className="agentic-skill-tab" key={id} value={id}>
              {item.title}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        {Object.keys(skills).map((id) => (
          <Tabs.Panel key={id} value={id} className="agentic-skill-panel">
            {id === activeSkill && <SkillContent skillId={id as SkillId} />}
          </Tabs.Panel>
        ))}
      </Tabs.Root>
    </article>
  );
}
