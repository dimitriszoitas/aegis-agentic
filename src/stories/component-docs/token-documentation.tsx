import { Fragment, useEffect, useMemo, useState } from 'react';
import manifestSource from '../../../tokens/design-tokens.json?raw';
import { tokenModes } from './inspect-tokens';
import { buildTokenInventory, tokenCategories, type TokenEntry } from './token-inventory';
import { resolveTokenValues, type ResolvedTokenValues } from './resolve-token-values';
import type { ComponentMetadata } from './types';
import {
  buildTokenMappings,
  mappingConfigurations,
  type MappingManifest,
  type MappingNode,
  type TokenMapping,
} from './token-mapping';
import './token-mapping.css';

const mappingManifest = JSON.parse(manifestSource) as MappingManifest;

function MappingNodes({ nodes }: { nodes: MappingNode[] }) {
  return nodes.length ? (
    nodes.map((node) => (
      <div className="component-docs-mapping-node" key={node.name}>
        <code>{node.name}</code>
        {node.expression && (
          <small>
            <code>{node.expression}</code>
          </small>
        )}
        {node.note && <small>{node.note}</small>}
      </div>
    ))
  ) : (
    <span className="component-docs-note">No mapping at this tier</span>
  );
}

function MappingValue({
  token,
  mapping,
  values,
}: {
  token: string;
  mapping: TokenMapping;
  values: ResolvedTokenValues;
}) {
  const matching = values[token]?.filter(
    (value) =>
      value.context === mapping.context ||
      (!mapping.expression &&
        ['No static default', 'Runtime or inherited value'].includes(value.value)),
  );
  return matching?.length ? (
    matching.map((value, index) => (
      <div key={index} className="component-docs-token-value">
        <code>{value.value}</code>
        {!mapping.expression && value.context && <small>{value.context}</small>}
      </div>
    ))
  ) : (
    <>
      <code>{mapping.expanded ?? 'No static default'}</code>
      <small>
        {mapping.expanded
          ? 'Source expression; depends on the stated context.'
          : 'No static value was found in this configuration and component scope.'}
      </small>
    </>
  );
}

function TokenTable({
  label,
  entries,
  values,
  anchor,
  mappings,
}: {
  label: string;
  entries: TokenEntry[];
  values: ResolvedTokenValues;
  anchor: string;
  mappings: Record<string, TokenMapping[]>;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? entries : entries.slice(0, 30);
  return (
    <section className="component-docs-token-group" id={anchor}>
      <h3>
        {label} <span className="component-docs-note">({entries.length})</span>
      </h3>
      <div
        className="component-docs-table-scroll"
        role="region"
        aria-label={`${entries[0].component} ${label} tokens`}
        tabIndex={0}
      >
        <table className="component-docs-mapping-table">
          <thead>
            <tr>
              <th scope="col">Property</th>
              <th scope="col">Group token</th>
              <th scope="col">Semantic mapping</th>
              <th scope="col">Primitive operands</th>
              <th scope="col">Resolved value</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((entry) => (
              <Fragment key={entry.id}>
                {mappings[entry.id].map((mapping, mappingIndex) => (
                  <tr key={`${entry.id}:${mappingIndex}`} data-token-binding={entry.token}>
                    {mappingIndex === 0 && (
                      <th scope="row" rowSpan={mappings[entry.id].length}>
                        <code>{entry.property}</code>
                        <details>
                          <summary>Where it is used ({entry.usages.length})</summary>
                          {entry.usages.map((usage, index) => (
                            <small key={index}>
                              <code>{usage.selector}</code>
                              <br />
                              <code>{usage.value}</code>
                              <br />
                              {[usage.file, ...usage.conditions].join(' · ')}
                            </small>
                          ))}
                        </details>
                      </th>
                    )}
                    <td>
                      <code>{entry.token}</code>
                      {mappingManifest.tokens[entry.token]?.tier !== 'group' && (
                        <small>
                          {mappingManifest.tokens[entry.token]?.tier
                            ? `${mappingManifest.tokens[entry.token].tier} token used directly`
                            : 'Runtime or inherited binding'}
                        </small>
                      )}
                      {mapping.context !== 'Theme default' && (
                        <small className="component-docs-mapping-context">{mapping.context}</small>
                      )}
                      {mapping.note && <small>{mapping.note}</small>}
                      {mapping.expression && (
                        <details>
                          <summary>Source expression</summary>
                          <code>{mapping.expression}</code>
                        </details>
                      )}
                      {mapping.nodes.some(
                        (node) => node.tier === 'group' || node.tier === 'runtime',
                      ) && (
                        <details>
                          <summary>Intermediate or runtime references</summary>
                          <MappingNodes
                            nodes={mapping.nodes.filter(
                              (node) => node.tier === 'group' || node.tier === 'runtime',
                            )}
                          />
                        </details>
                      )}
                      {entry.ownershipMismatch && (
                        <small className="component-docs-note">
                          Ownership mismatch: {entry.component} must use{' '}
                          <code>{`--group-${entry.group}-*`}</code> for its own styling.
                        </small>
                      )}
                    </td>
                    <td>
                      <MappingNodes
                        nodes={mapping.nodes.filter((node) => node.tier === 'semantic')}
                      />
                    </td>
                    <td>
                      <MappingNodes
                        nodes={mapping.nodes.filter((node) => node.tier === 'primitive')}
                      />
                    </td>
                    <td>
                      <MappingValue token={entry.token} mapping={mapping} values={values} />
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {entries.length > 30 && (
        <button
          className="component-docs-text-action"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Show fewer' : `Show all ${entries.length} ${label.toLowerCase()} bindings`}
        </button>
      )}
    </section>
  );
}

export function TokenDocumentation({ meta }: { meta: ComponentMetadata }) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState(0);
  const [values, setValues] = useState<ResolvedTokenValues>({});
  const inventory = useMemo(() => buildTokenInventory(meta), [meta]);
  const mappings = useMemo(
    () =>
      Object.fromEntries(
        inventory.map((entry) => [
          entry.id,
          buildTokenMappings(entry, meta, mappingManifest, mappingConfigurations[mode]),
        ]),
      ),
    [inventory, meta, mode],
  );
  useEffect(() => {
    setValues(resolveTokenValues(meta, mode, document));
  }, [meta, mode]);
  const matches = inventory.filter((entry) =>
    `${entry.property} ${entry.token} ${entry.category} ${entry.usages.map((usage) => `${usage.selector} ${usage.file}`).join(' ')} ${values[entry.token]?.map((value) => value.value).join(' ')} ${mappings[entry.id].map((mapping) => `${mapping.expression} ${mapping.nodes.map((node) => `${node.name} ${node.expression}`).join(' ')}`).join(' ')}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const ownershipGroups = [...new Set(matches.map((entry) => `${entry.scope}:${entry.component}`))]
    .map((key) => {
      const [scope, ...parts] = key.split(':');
      const component = parts.join(':');
      return {
        key,
        scope,
        component,
        entries: matches.filter((entry) => entry.scope === scope && entry.component === component),
      };
    })
    .sort(
      (a, b) =>
        Number(a.scope === 'nested') - Number(b.scope === 'nested') ||
        a.component.localeCompare(b.component),
    );
  const groups = tokenCategories
    .map((category) => ({
      category,
      entries: matches.filter((entry) => entry.category === category),
    }))
    .filter((group) => group.entries.length);
  return (
    <div className="component-docs-token-reference">
      <p>
        These bindings come from this component’s own property declarations and real nested
        components. Nested components keep their own category tokens and are listed separately.
        Shared token registries and inherited page defaults are not component property bindings.
        Follow each group token through its semantic mappings and every primitive operand to the
        resolved value. Choose a theme and mode; selector labels identify local variant and state
        assignments. Composite expressions retain their branches rather than implying a single
        primitive value.
      </p>
      <div className="component-docs-controls">
        <label>
          Find a property, token, or value
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="height, spacing, --color…"
          />
        </label>
        <label>
          Theme and mode
          <select value={mode} onChange={(event) => setMode(Number(event.target.value))}>
            {tokenModes.map((item, index) => (
              <option key={item} value={index}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="component-docs-note" role="status">
        {matches.length} property bindings · {new Set(matches.map((entry) => entry.token)).size}{' '}
        tokens · {groups.length} categories
      </p>
      <nav aria-label="Token categories" className="component-docs-token-nav">
        {groups.map(({ category }) => (
          <a
            href={`#${
              matches.some((entry) => entry.scope === 'owned' && entry.category === category)
                ? 'tokens-'
                : `tokens-nested-${matches
                    .find((entry) => entry.category === category)!
                    .component.toLowerCase()
                    .replace(/[^a-z]+/g, '-')}-`
            }${category.toLowerCase().replace(/[^a-z]+/g, '-')}`}
            key={category}
          >
            {category}
          </a>
        ))}
      </nav>
      {ownershipGroups.map((owner) => (
        <section
          key={owner.key}
          aria-label={`${owner.component} ${owner.scope === 'nested' ? 'nested component' : 'owned'} bindings`}
        >
          <h2>
            {owner.component}
            {owner.scope === 'nested' ? ' · Nested component' : ' properties'}
          </h2>
          {tokenCategories.map((category) => {
            const entries = owner.entries.filter((entry) => entry.category === category);
            if (!entries.length) return null;
            const categorySlug = category.toLowerCase().replace(/[^a-z]+/g, '-');
            const anchor =
              owner.scope === 'owned'
                ? `tokens-${categorySlug}`
                : `tokens-nested-${owner.component.toLowerCase().replace(/[^a-z]+/g, '-')}-${categorySlug}`;
            return (
              <TokenTable
                key={`${meta.id}:${owner.key}:${category}:${query}`}
                label={category}
                entries={entries}
                values={values}
                anchor={anchor}
                mappings={mappings}
              />
            );
          })}
        </section>
      ))}
      {!groups.length && <p>No matching tokens. Try another property or token name.</p>}
    </div>
  );
}
