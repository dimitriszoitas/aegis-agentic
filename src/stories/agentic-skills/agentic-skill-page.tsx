import { useEffect, useState } from 'react';
import { Tabs } from '@base-ui/react/tabs';
import Markdown from 'react-markdown';
import { CopyButton } from '@/components/copy-button';
import componentSource from '../../../skills/create-component/SKILL.md?raw';
import tokenSource from '../../../skills/create-token/SKILL.md?raw';
import layoutSource from '../../../skills/create-layout/SKILL.md?raw';
import contractSource from '../../../skills/references/design-contract.md?raw';
import './agentic-skill-page.css';

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
  },
} as const;

type SkillId = keyof typeof skills;

function markdownBody(source: string) {
  return source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').replace(/^\s*# [^\n]+\n/, '');
}

function skillLink(href?: string) {
  if (href === '../references/design-contract.md') return '#shared-design-contract';
  return href;
}

function SkillContent({ skillId }: { skillId: SkillId }) {
  const skill = skills[skillId];
  const path = `skills/${skill.name}/SKILL.md`;
  const invocation = `Use $${skill.name} from ${path}. ${skill.request}`;
  const instructions = `${skill.source.trim()}\n\n${contractSource.trim()}\n`;
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
          shared design contract below. Skill discovery depends on the agent environment; an
          explicit file path also works when repository skills are not listed automatically.
        </p>
        <pre>
          <code>{invocation}</code>
        </pre>
      </section>

      <div className="agentic-skill-prose">
        <Markdown
          skipHtml
          components={{
            a: ({ href, children }) => <a href={skillLink(href)}>{children}</a>,
          }}
        >
          {markdownBody(skill.source)}
        </Markdown>
      </div>

      <section
        className="agentic-skill-contract agentic-skill-prose"
        id="shared-design-contract"
        aria-labelledby="shared-design-contract-title"
      >
        <h2 id="shared-design-contract-title">Shared design contract</h2>
        <p className="agentic-skill-source-path">
          Source: <code>skills/references/design-contract.md</code>
        </p>
        <Markdown skipHtml components={{ h2: ({ children }) => <h3>{children}</h3> }}>
          {markdownBody(contractSource)}
        </Markdown>
      </section>
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
          Repository instructions for creating components, tokens, and layouts. Each skill includes
          the shared design contract and can be copied with its complete instructions.
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
