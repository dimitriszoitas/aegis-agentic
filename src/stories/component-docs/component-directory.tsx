import { useId, useMemo, useState } from 'react';
import { componentMetadata } from './generated';
import './component-directory.css';

type DirectoryKind = 'component' | 'pattern' | 'foundation';
interface DirectoryMetadata {
  name: string;
  title: string;
  category?: string;
  description?: string;
  aliases?: readonly string[];
  kind?: DirectoryKind;
}
interface DirectoryEntry extends DirectoryMetadata {
  id: string;
  category: string;
  kind: DirectoryKind;
}
const groups = {
  Triggers: 'Start an action, follow a link, or expose related commands.',
  'Inputs & Selection': 'Enter information, choose values, and guide form completion.',
  Navigation: 'Move between destinations, views, steps, and pages of results.',
  Surfaces: 'Contain content or bring focused information into an overlay.',
  Layout: 'Arrange, separate, resize, and scroll application regions.',
  'Data Display': 'Present records, identities, attributes, and structured information.',
  'Data Visualization': 'Compare values, follow trends, and understand progress over time.',
  Code: 'Read, edit, and compare structured text and configuration.',
  Feedback: 'Explain results, progress, loading, and empty states.',
  AI: 'Identify assistant content, communicate generation, and support review.',
  Filtering: 'Narrow a collection and keep applied criteria visible.',
  'Page Structure': 'Organize page titles, navigation, metadata, and actions.',
  Workflows: 'Guide a sequence of work and handle pending changes.',
  Communication: 'Keep people informed about updates and next steps.',
  'AI Assistance': 'Compose prompts, maintain context, and review suggested changes.',
} as const;
const groupOrder = Object.keys(groups);
const metadata: Record<string, DirectoryMetadata> = componentMetadata;
const entries: DirectoryEntry[] = Object.entries(metadata).map(([id, entry]) => {
  const [section, category] = entry.title.split('/');
  return {
    ...entry,
    id,
    category:
      entry.category
        ?.split('/')
        .filter(Boolean)
        .at(entry.category.includes('/') ? 1 : 0) || category,
    kind:
      entry.kind ??
      (section === 'Patterns' ? 'pattern' : section === 'Components' ? 'component' : 'foundation'),
  };
});
const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });
const categories = [
  ...new Set(entries.filter((entry) => entry.kind !== 'foundation').map((entry) => entry.category)),
].sort((a, b) => {
  const left = groupOrder.indexOf(a),
    right = groupOrder.indexOf(b);
  return (
    (left < 0 ? groupOrder.length : left) - (right < 0 ? groupOrder.length : right) ||
    collator.compare(a, b)
  );
});
function overviewUrl(title: string) {
  const slug = `${title}/Overview`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `./?path=/docs/${slug}--docs`;
}
function searchText(value: string) {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
}
function DirectoryCard({ entry, prefix }: { entry: DirectoryEntry; prefix: string }) {
  const titleId = `${prefix}-${entry.id}`;
  return (
    <li>
      <a
        className="component-directory-card"
        href={overviewUrl(entry.title)}
        target="_top"
        aria-labelledby={titleId}
      >
        <h4 id={titleId}>{entry.name}</h4>
        <p>
          {entry.description?.match(/^.*?[.!?](?:\s|$)/s)?.[0].trim() ||
            entry.description ||
            `Explore the ${entry.name} overview, anatomy, tokens, and API.`}
        </p>
        <span className="component-directory-card-link">
          View overview <span aria-hidden="true">↗</span>
        </span>
      </a>
    </li>
  );
}
/** A lightweight catalogue of documented component families and reusable patterns. */
export function ComponentDirectory() {
  const prefix = useId();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const families = entries.filter((entry) => entry.kind !== 'foundation');
  const resources = entries.filter((entry) => entry.kind === 'foundation');
  const matches = useMemo(() => {
    const words = query.trim().split(/\s+/).map(searchText).filter(Boolean);
    return entries.filter(
      (entry) =>
        entry.kind !== 'foundation' &&
        (category === 'all' || entry.category === category) &&
        words.every((word) =>
          searchText(
            [entry.name, entry.title, entry.description, ...(entry.aliases ?? [])].join(' '),
          ).includes(word),
        ),
    );
  }, [query, category]);
  return (
    <main className="component-directory">
      <header className="component-directory-intro">
        <p className="component-directory-eyebrow">Foundations / Find a component</p>
        <h1>Directory</h1>
        <p>
          Browse by what you need to build. Find a trigger, input, surface, or coordinated workflow,
          then open its overview for anatomy, tokens, usage guidance, and API details.
        </p>
        <dl className="component-directory-summary">
          <div>
            <dt>Components</dt>
            <dd>{families.filter((entry) => entry.kind === 'component').length}</dd>
          </div>
          <div>
            <dt>Patterns</dt>
            <dd>{families.filter((entry) => entry.kind === 'pattern').length}</dd>
          </div>
          <div>
            <dt>Purpose groups</dt>
            <dd>{categories.length}</dd>
          </div>
        </dl>
      </header>
      <div className="component-directory-controls" role="search" aria-label="Component directory">
        <label className="component-directory-search" htmlFor={`${prefix}-search`}>
          Find a component or pattern
          <input
            id={`${prefix}-search`}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search names, purpose, or aliases…"
            autoComplete="off"
          />
        </label>
        <label htmlFor={`${prefix}-group`}>
          Purpose group
          <select
            id={`${prefix}-group`}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="all">All groups</option>
            {categories.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="component-directory-results">
        <p role="status" aria-live="polite">
          {matches.length} of {families.length} component and pattern families
          {query.trim() ? ` matching “${query.trim()}”` : ''}
          {category !== 'all' ? ` in ${category}` : ''}
        </p>
        {(query || category !== 'all') && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setCategory('all');
              document.getElementById(`${prefix}-search`)?.focus();
            }}
          >
            Clear filters
          </button>
        )}
      </div>
      {(['component', 'pattern'] as const).map((kind) => {
        const sectionEntries = matches.filter((entry) => entry.kind === kind);
        if (!sectionEntries.length) return null;
        return (
          <section
            key={kind}
            className="component-directory-section"
            aria-labelledby={`${prefix}-${kind}`}
          >
            <header>
              <h2 id={`${prefix}-${kind}`}>
                {kind === 'component' ? 'Components' : 'Patterns'}{' '}
                <span>({sectionEntries.length})</span>
              </h2>
              <p>
                {kind === 'component'
                  ? 'Individual controls and presentation elements, grouped by their role in an interface.'
                  : 'Compositions that coordinate several components around a task.'}
              </p>
            </header>
            {categories.map((group) => {
              const items = sectionEntries
                .filter((entry) => entry.category === group)
                .sort((a, b) => collator.compare(a.name, b.name));
              if (!items.length) return null;
              return (
                <section
                  key={group}
                  className="component-directory-group"
                  aria-labelledby={`${prefix}-${kind}-${group.replace(/[^a-z0-9]+/gi, '-')}`}
                >
                  <header>
                    <h3 id={`${prefix}-${kind}-${group.replace(/[^a-z0-9]+/gi, '-')}`}>{group}</h3>
                    {group in groups && <p>{groups[group as keyof typeof groups]}</p>}
                  </header>
                  <ul className="component-directory-grid">
                    {items.map((entry) => (
                      <DirectoryCard key={entry.id} entry={entry} prefix={prefix} />
                    ))}
                  </ul>
                </section>
              );
            })}
          </section>
        );
      })}
      {!matches.length && (
        <section className="component-directory-empty">
          <h2>No matching components</h2>
          <p>
            Try another name or alias, or clear the group filter. For example: chips, textfield,
            drawer, or toast.
          </p>
        </section>
      )}
      {!!resources.length && (
        <aside className="component-directory-resources" aria-label="Related foundations">
          <h2>Related foundations</h2>
          <p>Shared resources used across components and patterns.</p>
          <ul>
            {resources.map((entry) => (
              <li key={entry.id}>
                <a href={overviewUrl(entry.title)} target="_top">
                  {entry.name} overview
                </a>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </main>
  );
}
