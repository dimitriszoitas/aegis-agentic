import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArrowRight, ArrowUpRight } from '@/components/icon';
import './welcome.css';

const sections = [
  {
    label: 'Foundations',
    description: 'Understand the visual language before choosing a component.',
    links: [
      ['Design principles', 'foundations-principles--docs'],
      ['Colors and semantic roles', 'foundations-colors--docs'],
      ['Typography', 'foundations-type-and-motion--docs'],
      ['Themes and modes', 'foundations-theme--docs'],
    ],
  },
  {
    label: 'Components & patterns',
    description: 'Find the right building block, then inspect its anatomy and behavior.',
    links: [
      ['Component directory', 'foundations-component-directory--docs'],
      ['Buttons and actions', 'components-triggers-button-overview--docs'],
      ['Data grids', 'components-data-display-datagrid-overview--docs'],
      ['AI interaction guidelines', 'foundations-ai-guidelines--docs'],
    ],
  },
  {
    label: 'Build with an agent',
    description: 'Give your coding agent the same conventions used by the system.',
    links: [
      ['Create a component', 'agentic-skills-component-creation--docs'],
      ['Create a token', 'agentic-skills-component-creation--docs&agenticSkill=token'],
      ['Compose a layout', 'agentic-skills-component-creation--docs&agenticSkill=layout'],
    ],
  },
];

function Welcome() {
  return (
    <main className="aegis-welcome">
      <header className="aegis-welcome-hero">
        <h1>A clear system for complex applications.</h1>
        <p className="aegis-welcome-intro">
          Reusable React components, patterns, and design tokens for applications, dashboards, and
          developer tools. Start with the foundations, explore a component, or see everything
          working together.
        </p>
        <div className="aegis-welcome-actions">
          <a
            className="aegis-welcome-primary"
            href="./?path=/docs/foundations-component-directory--docs"
            target="_top"
          >
            Browse components <ArrowRight size={18} aria-hidden />
          </a>
          <a
            className="aegis-welcome-secondary"
            href="./?path=/story/console-application-demo--demo"
            target="_top"
          >
            Open application demo <ArrowUpRight size={18} aria-hidden />
          </a>
        </div>
        <ul className="aegis-welcome-meta" aria-label="System capabilities">
          <li>React + TypeScript</li>
          <li>Light and dark</li>
          <li>Fundamental + Fundamental Floating</li>
        </ul>
      </header>

      <nav className="aegis-welcome-directory" aria-label="Explore the design system">
        {sections.map((section) => (
          <section className="aegis-welcome-section" key={section.label}>
            <h2>{section.label}</h2>
            <p>{section.description}</p>
            <ul>
              {section.links.map(([label, id]) => (
                <li key={id}>
                  <a href={`./?path=/docs/${id}`} target="_top">
                    <span>{label}</span>
                    <ArrowRight size={16} aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </nav>

      <aside className="aegis-welcome-example" aria-labelledby="welcome-example-title">
        <div>
          <p className="aegis-welcome-eyebrow">A connected example</p>
          <h2 id="welcome-example-title">From individual components to a working application.</h2>
          <p>
            Explore projects, customers, invoices, and team profiles in one workspace. Try filters,
            record details, forms, and Aegis AI with local sample data.
          </p>
        </div>
        <a href="./?path=/story/console-application-demo--demo" target="_top">
          Explore the example <ArrowUpRight size={18} aria-hidden />
        </a>
      </aside>
    </main>
  );
}

export default {
  id: 'foundations-welcome',
  title: 'Welcome',
  component: Welcome,
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    docs: { page: Welcome },
  },
} satisfies Meta<typeof Welcome>;

export const Overview: StoryObj<typeof Welcome> = {};
