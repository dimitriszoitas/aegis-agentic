import { useMemo, useState } from 'react';
import { Button } from '@/components/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/card';
import { Field } from '@/components/field';
import { Select } from '@/components/select';
import { TextInput } from '@/components/text-input';
import { Textarea } from '@/components/textarea';
import { Tag } from '@/components/tag';
import {
  normalizeProjectRecipes,
  resolveProjectRecipe,
  validateProjectRecipes,
} from './project-recipes';
import { discoverByBehavior } from './behavior-discovery';
import { downloadDesignJson } from './portability-panel';
import type { PageArchetype } from '../patterns/page-layout/recipes';

const example = normalizeProjectRecipes({
  schemaVersion: 1,
  project: 'my-product',
  revision: 1,
  recipes: {},
});

export function RecipePanel() {
  const [source, setSource] = useState(() => JSON.stringify(example, null, 2));
  const [archetype, setArchetype] = useState<PageArchetype>('collection');
  const [query, setQuery] = useState('push filters beside live results');
  const parsed = useMemo(() => {
    try {
      const input = JSON.parse(source);
      const validation = validateProjectRecipes(input);
      return validation.valid
        ? { config: normalizeProjectRecipes(input), error: '' }
        : { error: validation.issues.map((issue) => `${issue.path}: ${issue.message}`).join('\n') };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Invalid recipe JSON.' };
    }
  }, [source]);
  const resolved = useMemo(
    () => (parsed.config ? resolveProjectRecipe(parsed.config, archetype) : undefined),
    [parsed.config, archetype],
  );
  const discoveryState = useMemo(() => {
    try {
      return {
        result:
          query.trim() && parsed.config
            ? discoverByBehavior({ query, projectRecipes: parsed.config })
            : undefined,
        error: '',
      };
    } catch (error) {
      return {
        result: undefined,
        error: error instanceof Error ? error.message : 'Discovery input is invalid.',
      };
    }
  }, [query, parsed.config]);
  const discovery = discoveryState.result;
  return (
    <div className="aw-settings-group">
      <Card>
        <CardHeader>
          <CardTitle>One project, shared page rules</CardTitle>
          <CardDescription>
            Store a reviewed recipe with your product. Agents resolve the same permitted choices
            instead of deciding the header, filter behaviour and search width again on each page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="aw-settings-group">
            <Textarea
              label="Project recipe JSON"
              rows={12}
              value={source}
              onValueChange={setSource}
              spellCheck={false}
            />
            {parsed.error && <p role="alert">{parsed.error}</p>}
            <Button
              emphasis="secondary"
              disabled={!parsed.config}
              onClick={() =>
                parsed.config &&
                downloadDesignJson(`${parsed.config.project}.recipes.json`, parsed.config)
              }
            >
              Download project recipes
            </Button>
            <Field label="Page purpose">
              <Select
                aria-label="Page purpose"
                value={archetype}
                onValueChange={(value) => setArchetype(value as PageArchetype)}
                options={['collection', 'detail', 'settings', 'dashboard'].map((value) => ({
                  value,
                  label: value,
                }))}
              />
            </Field>
            {resolved && (
              <section aria-label="Resolved project recipe">
                <Tag>
                  {resolved.project} · revision {resolved.revision}
                </Tag>
                <h3>Shared components</h3>
                <ul>
                  {resolved.imports.map((item) => (
                    <li key={item.role}>
                      <strong>{item.role}</strong>: {item.exports.join(', ')} from{' '}
                      <code>{item.module}</code>
                    </li>
                  ))}
                </ul>
                <h3>State the application must own</h3>
                <ul>
                  {resolved.hostState.map((item) => (
                    <li key={item.id}>
                      <strong>{item.id}</strong>: {item.responsibility}
                    </li>
                  ))}
                </ul>
                <details>
                  <summary>Inspect bindings and acceptance requirements</summary>
                  <Textarea
                    aria-label="Resolved recipe JSON"
                    readOnly
                    rows={10}
                    value={JSON.stringify(resolved, null, 2)}
                  />
                </details>
                <p>
                  Resolution validates the configuration. Browser checks still need to verify the
                  implemented page.
                </p>
              </section>
            )}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Discover by behaviour</CardTitle>
          <CardDescription>
            Describe the job a component must do. A panel that pushes live results and a modal sheet
            have different contracts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="aw-settings-group">
            <TextInput
              label="What should the interface do?"
              value={query}
              maxLength={256}
              onValueChange={setQuery}
            />
            {discoveryState.error && <p role="alert">{discoveryState.error}</p>}
            <Tag>{discovery?.status ?? 'Enter a query and valid project recipes'}</Tag>
            {discovery?.clarification && <p>{discovery.clarification}</p>}
            <ul>
              {discovery?.candidates.map((item) => (
                <li key={item.intent}>
                  <strong>{item.intent}</strong>
                  <p>{item.purpose}</p>
                  <p>{item.obligation}</p>
                </li>
              ))}
            </ul>
            {discovery?.rejections.map((item) => (
              <p key={item.component}>
                {item.component}: {item.reason}
              </p>
            ))}
            <p>
              Discovery is deterministic, using curated capabilities and the saved recipe. It does
              not call a model or generate a page automatically.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
