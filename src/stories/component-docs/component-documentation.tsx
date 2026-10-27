import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { Tabs } from '@base-ui/react/tabs';
import { Markdown } from '@storybook/addon-docs/blocks';
import { SegmentedControl } from '@/components/segmented-control';
import { loadComponentMetadata } from './generated';
import { AnatomyDocumentation } from './anatomy/anatomy-documentation';
import { authoredGuidance } from './authored-guidance';
import { TokenDocumentation } from './token-documentation';
import { PlaygroundControls } from './playground-controls';
import { ExamplePicker } from './example-picker';
import { playgroundControls } from './playground-controls-model';
import { useSpecimenArgs } from './use-specimen-args';
import { hubNavigationMessage } from './hub-navigation';
import type { SpecimenPresentation } from './specimen-args-protocol';
import type { ComponentMetadata, DocumentationSection } from './types';
import './component-documentation.css';

const sections: { id: DocumentationSection; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'anatomy', label: 'Anatomy' },
  { id: 'types', label: 'Types' },
  { id: 'variants', label: 'Variants' },
  { id: 'intent', label: 'Intent & Emphasis' },
  { id: 'states', label: 'States' },
  { id: 'sizes', label: 'Sizes' },
  { id: 'usage', label: 'Usage & Content' },
  { id: 'accessibility', label: 'Accessibility' },
  { id: 'api', label: 'API & Props' },
  { id: 'context', label: 'Use cases/In Context' },
];
function storyUrl(id: string) {
  return `./?path=/story/${id}`;
}
function docsId(title: string) {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '--docs'
  );
}
type HubTab = 'overview' | 'guidelines' | 'tokens' | 'examples';
type GuidelineSection = Exclude<DocumentationSection, 'overview' | 'tokens'>;
const hubTabs: { id: HubTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'guidelines', label: 'Component Guidelines' },
  { id: 'tokens', label: 'Tokens Used' },
  { id: 'examples', label: 'Examples' },
];
const guidelineSections = sections.filter(
  (item): item is { id: GuidelineSection; label: string } =>
    item.id !== 'overview' && item.id !== 'tokens',
);
function sectionUrl(meta: ComponentMetadata, section: DocumentationSection) {
  const params = new URLSearchParams({
    path: `/docs/${docsId(`${meta.id === 'foundations-icons' ? 'Foundations/Icons' : meta.title}/Overview`)}`,
  });
  if (section !== 'overview') params.set('docsTab', section === 'tokens' ? 'tokens' : 'guidelines');
  if (section !== 'overview' && section !== 'tokens') params.set('docsSection', section);
  return `./?${params}`;
}
function navigationWindow() {
  try {
    if (window.top?.location.origin === window.location.origin) return window.top;
  } catch {
    // A separately hosted preview can still keep its own document state.
  }
  return window;
}
function readHubState(section: DocumentationSection, meta: ComponentMetadata) {
  const params = new URLSearchParams(navigationWindow().location.search);
  const requestedTab = params.get('docsTab');
  const tab = hubTabs.some((item) => item.id === requestedTab)
    ? (requestedTab as HubTab)
    : section === 'tokens'
      ? 'tokens'
      : section === 'overview'
        ? 'overview'
        : 'guidelines';
  const requestedSection = params.get('docsSection');
  const anchor = guidelineSections.some((item) => item.id === requestedSection)
    ? (requestedSection as GuidelineSection)
    : section !== 'overview' && section !== 'tokens'
      ? section
      : 'anatomy';
  const requestedExample = params.get('docsExample');
  const example = meta.stories.some((story) => story.id === requestedExample)
    ? requestedExample!
    : (preferredExample(meta)?.id ?? '');
  return { tab, anchor, example };
}
function preferredExample(meta: ComponentMetadata) {
  return (
    meta.stories.find((story) => story.exportName === 'Playground') ??
    meta.stories.find((story) => story.supportsArgs) ??
    meta.stories[0]
  );
}
function updateHubUrl(tab: HubTab, anchor: GuidelineSection, example: string) {
  const target = navigationWindow();
  const url = new URL(target.location.href);
  url.searchParams.set('docsTab', tab);
  if (tab === 'guidelines') url.searchParams.set('docsSection', anchor);
  else url.searchParams.delete('docsSection');
  if (example) url.searchParams.set('docsExample', example);
  else url.searchParams.delete('docsExample');
  target.history.replaceState(target.history.state, '', url);
  // Globals updates rebuild the URL from the manager's query store. Keep that
  // store aligned without navigating or reloading the current docs preview.
  if (target !== window) target.postMessage(hubNavigationMessage(url), url.origin);
}
function isPlainClick(event: MouseEvent<HTMLAnchorElement>) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}
function guidanceFor(meta: ComponentMetadata) {
  return (
    authoredGuidance[meta.name] ??
    authoredGuidance[meta.title] ??
    meta.exportNames?.map((name) => authoredGuidance[name]).find(Boolean)
  );
}
function introductionFor(meta: ComponentMetadata) {
  return guidanceFor(meta)?.overview || meta.purpose || meta.description.split(/\n\s*\n/)[0];
}
function DocumentationTable({ children, ...props }: ComponentProps<'table'>) {
  return (
    <div
      className="component-docs-table-scroll"
      role="region"
      aria-label="Implementation reference table"
      tabIndex={0}
    >
      <table {...props}>{children}</table>
    </div>
  );
}
function Table({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div
      className="component-docs-table-scroll"
      role="region"
      aria-label={`${headers[0]} reference table`}
      tabIndex={0}
    >
      <table>
        <thead>
          <tr>
            {headers.map((header) => (
              <th scope="col" key={header}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
function Specimen({
  meta,
  onInspect,
  onLoading,
  story: requestedStory,
  onStoryChange,
  showSelector = true,
  playground = false,
  examples = false,
}: {
  meta: ComponentMetadata;
  story: string;
  onStoryChange: (story: string) => void;
  showSelector?: boolean;
  playground?: boolean;
  examples?: boolean;
  onInspect?: (document: Document) => void;
  onLoading?: () => void;
}) {
  const interactiveStories = meta.stories.filter(
    (item) => item.supportsArgs || item.exportName === 'Playground',
  );
  const story =
    playground && !interactiveStories.some((item) => item.id === requestedStory)
      ? (preferredExample(meta)?.id ?? requestedStory)
      : requestedStory;
  const exampleOptions =
    playground && interactiveStories.length ? interactiveStories : meta.stories;
  const interactive = playground || examples;
  const selectedExample = meta.stories.find((item) => item.id === story);
  const customizationExample = preferredExample(meta);
  const editable = Boolean(selectedExample?.supportsArgs);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const frame = useRef<HTMLIFrameElement>(null);
  const specimen = useSpecimenArgs(frame, story, interactive);
  const callback = useRef(onInspect);
  callback.current = onInspect;
  const loadingCallback = useRef(onLoading);
  loadingCallback.current = onLoading;
  const [presentation, setPresentation] = useState<SpecimenPresentation>(() => ({
    theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
    layoutTheme:
      document.documentElement.getAttribute('data-layout-theme') === 'fundamental-floating'
        ? 'fundamental-floating'
        : 'fundamental',
  }));
  const initialPresentation = useRef(presentation);
  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      const next: SpecimenPresentation = {
        theme: root.classList.contains('dark') ? 'dark' : 'light',
        layoutTheme:
          root.getAttribute('data-layout-theme') === 'fundamental-floating'
            ? 'fundamental-floating'
            : 'fundamental',
      };
      setPresentation((previous) =>
        previous.theme === next.theme && previous.layoutTheme === next.layoutTheme
          ? previous
          : next,
      );
    });
    observer.observe(root, { attributes: true, attributeFilter: ['class', 'data-layout-theme'] });
    return () => observer.disconnect();
  }, []);
  const { updatePresentation } = specimen;
  useEffect(() => {
    if (interactive) updatePresentation(presentation);
  }, [interactive, presentation, story, updatePresentation]);
  const framePresentation = interactive ? initialPresentation.current : presentation;
  const source = `iframe.html?id=${story}&viewMode=story&globals=theme:${framePresentation.theme};layoutTheme:${framePresentation.layoutTheme}${interactive ? '&aegisPlayground=1&embed=true' : ''}`;
  useEffect(() => {
    let active = true;
    setReady(false);
    setError('');
    loadingCallback.current?.();
    let count = 0;
    const timer = setInterval(() => {
      const doc = frame.current?.contentDocument;
      if (!doc) return;
      if (
        new URLSearchParams(doc.defaultView?.location.search).get('id') === story &&
        (doc.querySelector('#storybook-root')?.children.length ||
          doc.querySelector('[role="dialog"], [role="menu"], [role="listbox"]') ||
          (
            doc.defaultView as
              | (Window & {
                  __STORYBOOK_PREVIEW__?: { currentRender?: { phase?: string } };
                })
              | null
          )?.__STORYBOOK_PREVIEW__?.currentRender?.phase === 'finished')
      ) {
        clearInterval(timer);
        setReady(true);
        setError('');
        void doc.fonts.ready.then(() => {
          if (active) callback.current?.(doc);
        });
      } else if (++count > 80) {
        clearInterval(timer);
        setError(
          'The example is taking longer to load. Open it in the canvas or reload this page.',
        );
      }
    }, 250);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [source, story]);
  if (!story) return <p>No standalone specimen is registered for this family.</p>;
  return (
    <section
      className="component-docs-specimen"
      data-playground={interactive || undefined}
      aria-label={`${meta.name} live example`}
    >
      <div className="component-docs-specimen-toolbar">
        {examples ? (
          <span className="component-docs-example-title">{selectedExample?.name}</span>
        ) : showSelector && exampleOptions.length <= 4 ? (
          <SegmentedControl
            label="Component example"
            size="sm"
            wrap
            options={exampleOptions.map((item) => ({ value: item.id, label: item.name }))}
            value={story}
            onValueChange={(value) => {
              setReady(false);
              onStoryChange(value);
            }}
          />
        ) : showSelector ? (
          <label>
            Example{' '}
            <select
              aria-label="Component example"
              value={story}
              onChange={(event) => {
                setReady(false);
                onStoryChange(event.target.value);
              }}
            >
              {exampleOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <span>Live example</span>
        )}
        <a href={storyUrl(story)} target="_top">
          Open canvas
        </a>
        {onInspect && (
          <button
            type="button"
            disabled={!ready}
            onClick={() => {
              const doc = frame.current?.contentDocument;
              if (doc) onInspect(doc);
            }}
          >
            Refresh values
          </button>
        )}
      </div>
      <div className={interactive ? 'component-docs-playground-layout' : undefined}>
        <div className="component-docs-specimen-stage">
          <iframe
            ref={frame}
            title={`${meta.name} example`}
            src={source}
            loading="eager"
            className="component-docs-frame"
            data-ready={ready || undefined}
            tabIndex={ready ? 0 : -1}
            aria-hidden={!ready || undefined}
          />
          {!ready && (
            <p className="component-docs-specimen-loading" role="status">
              {error || 'Loading example…'}
            </p>
          )}
        </div>
        {interactive && (
          <aside className="component-docs-playground-sidebar" aria-label="Example options">
            {examples && (
              <ExamplePicker
                examples={exampleOptions}
                value={story}
                onChange={(value) => {
                  setReady(false);
                  onStoryChange(value);
                }}
              />
            )}
            {editable ? (
              <PlaygroundControls
                key={story}
                controls={playgroundControls(meta, specimen.argTypes, specimen.args)}
                args={specimen.args}
                onArgsChange={specimen.updateArgs}
                onReset={() => specimen.resetArgs()}
                loading={specimen.status === 'loading'}
                disabled={specimen.status !== 'ready'}
                error={specimen.error}
              />
            ) : (
              <div className="component-docs-preset-options">
                <p>
                  This example demonstrates preset states. Try them in the preview or customize the
                  component in Playground.
                </p>
                {customizationExample && customizationExample.id !== story && (
                  <button
                    type="button"
                    onClick={(event) => {
                      const choice = event.currentTarget
                        .closest('aside')
                        ?.querySelector<HTMLInputElement>(
                          `input[type="radio"][value="${customizationExample.id}"]`,
                        );
                      setReady(false);
                      onStoryChange(customizationExample.id);
                      choice?.focus();
                    }}
                  >
                    Customize component
                  </button>
                )}
              </div>
            )}
          </aside>
        )}
      </div>
    </section>
  );
}
const enumProps = (meta: ComponentMetadata) =>
  meta.props.filter((prop) => /"[^"]+"\s*\||'[^']+'\s*\|/.test(prop.type) && !prop.inherited);
function VariantTable({
  meta,
  filter = () => true,
}: {
  meta: ComponentMetadata;
  filter?: (name: string) => boolean;
}) {
  const props = enumProps(meta).filter((prop) => filter(prop.name));
  const variants = meta.variants.filter(
    (variant) => filter(variant.name) && !props.some((prop) => prop.name === variant.name),
  );
  return props.length || variants.length ? (
    <Table headers={['Property', 'Supported values', 'Default']}>
      {props.map((prop) => (
        <tr key={`${prop.component}-${prop.name}`}>
          <th scope="row">
            {prop.name}
            <small>{prop.component}</small>
          </th>
          <td>
            <code>{prop.type}</code>
            {prop.description && <small>{prop.description}</small>}
          </td>
          <td>
            <code>{prop.defaultValue ?? 'Caller supplied / not declared'}</code>
          </td>
        </tr>
      ))}
      {variants.map((variant) => (
        <tr key={variant.name}>
          <th scope="row">{variant.name}</th>
          <td>{variant.values.join(' · ')}</td>
          <td>{variant.default ?? 'Not declared'}</td>
        </tr>
      ))}
    </Table>
  ) : (
    <p>
      This component has no dedicated property in this category. Use its documented content and
      composition API; nested components keep their own variants.
    </p>
  );
}
function Guidelines({
  meta,
  section,
  example,
  onExampleChange,
  onNavigate,
}: {
  meta: ComponentMetadata;
  section: DocumentationSection;
  example: string;
  onExampleChange: (story: string) => void;
  onNavigate: (tab: HubTab, anchor?: GuidelineSection) => void;
}) {
  const guidance = guidanceFor(meta);
  const notes = (items?: string[]) =>
    items?.length ? (
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    ) : null;
  const uniqueProps = [...new Map(meta.props.map((prop) => [prop.name, prop])).values()];
  const sourceStates = [
    ...new Set(
      meta.css
        .map((row) => row.selector)
        .filter((selector) =>
          /:(hover|focus|active|disabled|checked)|\[.*(?:state|disabled|invalid|selected|loading|expanded|checked|open)/.test(
            selector,
          ),
        ),
    ),
  ];
  const facts = meta.accessibility;
  switch (section) {
    case 'overview':
      return (
        <>
          <Specimen meta={meta} story={example} onStoryChange={onExampleChange} playground />
          <h2>When to use it</h2>
          {notes(guidance?.usage)}
          <p>
            {meta.usage ||
              `Use ${meta.name} when the interaction in the live example matches the task. Keep data and application decisions in the host.`}
          </p>
          <h2>Composition</h2>
          <p>
            {meta.relatedComponents?.length
              ? `This family composes ${meta.relatedComponents.join(', ')}. Their own pages describe their tokens and behavior.`
              : 'This family provides the structure shown in the examples. Use its public properties to configure it.'}
          </p>
          <h2>Explore the family</h2>
          <div className="component-docs-link-grid">
            {sections.slice(1).map((item) => (
              <a
                key={item.id}
                href={sectionUrl(meta, item.id)}
                target="_top"
                onClick={(event) => {
                  if (!isPlainClick(event)) return;
                  event.preventDefault();
                  onNavigate('guidelines', item.id as GuidelineSection);
                }}
              >
                {item.label}
              </a>
            ))}
            <a
              href={sectionUrl(meta, 'tokens')}
              target="_top"
              onClick={(event) => {
                if (!isPlainClick(event)) return;
                event.preventDefault();
                onNavigate('tokens');
              }}
            >
              Tokens Used
            </a>
          </div>
        </>
      );
    case 'anatomy':
      return <AnatomyDocumentation meta={meta} />;
    case 'types':
      return (
        <>
          <p>
            Types are the exported pieces of this family. Variants and states are documented
            separately.
          </p>
          <Table headers={['Export', 'Role / source']}>
            {(meta.exportNames ?? [meta.name]).map((name) => (
              <tr key={name}>
                <th scope="row">
                  <code>{name}</code>
                </th>
                <td>
                  {name.endsWith('Props')
                    ? 'Public component properties'
                    : name.endsWith('Context')
                      ? 'Context type'
                      : 'Exported family API'}
                  <small>{meta.sourceFiles.find((file) => !file.endsWith('.css'))}</small>
                </td>
              </tr>
            ))}
          </Table>
          <h3>Related building blocks</h3>
          <p>
            {meta.relatedComponents?.join(', ') ||
              'No nested design-system component import is declared in this family.'}
          </p>
        </>
      );
    case 'variants':
      return (
        <>
          <p>
            Configure supported visual and behavioral options with these properties. The list comes
            from the public type definitions and curated component catalogue.
          </p>
          <VariantTable meta={meta} />
        </>
      );
    case 'intent':
      return (
        <>
          <p>
            Intent communicates meaning; emphasis controls visual weight. Use only the options this
            component exposes. Keep destructive actions explicit, and avoid assigning meaning
            through color alone.
          </p>
          <VariantTable
            meta={meta}
            filter={(name) => /intent|emphasis|tone|variant|color/i.test(name)}
          />
          {notes(guidance?.intent)}
          <h3>Composed controls</h3>
          <p>
            {meta.relatedComponents?.length
              ? `When composing ${meta.relatedComponents.join(', ')}, configure each child through its own properties. The parent does not add an undocumented intent or emphasis.`
              : 'If this family has no intent or emphasis property, use its default hierarchy. Do not create extra color meanings by overriding internal classes.'}
          </p>
        </>
      );
    case 'states':
      return (
        <>
          <p>
            State is driven by interaction, controlled properties, and data. The inventory below
            preserves the selectors used by the implementation.
          </p>
          <h3>State properties</h3>
          <Table headers={['Property', 'Type', 'Meaning / default']}>
            {uniqueProps
              .filter((prop) =>
                /disabled|loading|invalid|open|checked|selected|expanded|error|busy|readOnly|generating/.test(
                  prop.name,
                ),
              )
              .map((prop) => (
                <tr key={prop.name}>
                  <th scope="row">{prop.name}</th>
                  <td>
                    <code>{prop.type}</code>
                  </td>
                  <td>
                    {prop.description ||
                      'Supplied by the host or maintained by the component when uncontrolled.'}
                    <small>
                      {prop.defaultValue === undefined
                        ? 'No explicit default in the component signature'
                        : `Default: ${prop.defaultValue}`}
                    </small>
                  </td>
                </tr>
              ))}
          </Table>
          <h3>Styled states</h3>
          {sourceStates.length ? (
            <ul
              className="component-docs-selector-list"
              tabIndex={0}
              aria-label="Styled state selectors"
            >
              {sourceStates.map((selector) => (
                <li key={selector}>
                  <code>{selector}</code>
                </li>
              ))}
            </ul>
          ) : (
            <p>
              No separate state selector is declared for this family. Nested controls retain their
              own states.
            </p>
          )}
        </>
      );
    case 'sizes': {
      const geometry = meta.css.filter((row) =>
        /^(?:min-|max-)?(?:width|height)$|padding|gap|font-size|border-radius/.test(row.property),
      );
      return (
        <>
          <p>
            Choose the documented size or density before changing layout. Use the source geometry
            below together with Tokens Used for current resolved values.
          </p>
          <VariantTable
            meta={meta}
            filter={(name) => /size|density|width|height|orientation|columns|placement/.test(name)}
          />
          <Table headers={['Property', 'Value', 'Condition / selector']}>
            {geometry.map((row, index) => (
              <tr key={index}>
                <th scope="row">
                  <code>{row.property}</code>
                </th>
                <td>
                  <code>{row.value}</code>
                </td>
                <td>
                  <code>{row.selector}</code>
                  <small>{row.conditions.join(' · ')}</small>
                </td>
              </tr>
            ))}
          </Table>
        </>
      );
    }
    case 'usage':
      return (
        <>
          <p className="component-docs-lead">{meta.usage || introductionFor(meta)}</p>
          {notes(guidance?.usage)}
          <h3>Content contract</h3>
          <Table headers={['Content property', 'Purpose', 'Value shape']}>
            {uniqueProps
              .filter((prop) =>
                /^(children|label|title|description|placeholder|helperText|helpText|emptyMessage|items|data|options|message|name|value|text|tasks)$/.test(
                  prop.name,
                ),
              )
              .map((prop) => (
                <tr key={prop.name}>
                  <th scope="row">{prop.name}</th>
                  <td>
                    {prop.description ||
                      `Provide ${prop.name} appropriate to the user’s current task.`}
                  </td>
                  <td>
                    <code>{prop.type}</code>
                  </td>
                </tr>
              ))}
          </Table>
          <h3>Writing and layout</h3>
          <ul>
            <li>
              Use familiar business terms and concrete labels. Match related labels across the page.
            </li>
            <li>
              Keep essential meaning in visible text. Icons, color, and placeholder text supplement
              the label.
            </li>
            <li>Keep identifiers and complete values available when visual text is truncated.</li>
            <li>
              Show a useful empty or error message when the supplied data cannot produce the normal
              view.
            </li>
          </ul>
        </>
      );
    case 'accessibility':
      return (
        <>
          {notes(guidance?.accessibility)}
          <p>
            These facts are extracted from the implementation. Review the live interaction in the
            context where you compose it; host-provided labels and content remain part of the
            accessibility contract.
          </p>
          <Table headers={['Implementation evidence', 'Declared values']}>
            <tr>
              <th scope="row">Native elements</th>
              <td>
                {facts?.nativeElements.join(', ') || 'See composed component implementations.'}
              </td>
            </tr>
            <tr>
              <th scope="row">Explicit roles</th>
              <td>{facts?.roles.join(', ') || 'Uses native semantics or composed primitives.'}</td>
            </tr>
            <tr>
              <th scope="row">ARIA attributes</th>
              <td>
                {facts?.ariaAttributes.join(', ') ||
                  'No direct ARIA attribute found in the family source.'}
              </td>
            </tr>
            <tr>
              <th scope="row">Explicit key handling</th>
              <td>
                {facts?.keyboardKeys.join(', ') ||
                  'No component-owned key handler declared; native or composed controls provide their behavior.'}
              </td>
            </tr>
            <tr>
              <th scope="row">Behavior dependencies</th>
              <td>
                {facts?.dependencies.join(', ') || 'No external interaction primitive imported.'}
              </td>
            </tr>
          </Table>
          <h3>Integration checks</h3>
          <ul>
            <li>Provide a visible or programmatic name for every interactive instance.</li>
            <li>
              Navigate the live example using Tab and Shift+Tab, then test the keys named above.
            </li>
            <li>
              Keep focus visible and restore it after closing or removing the focused surface.
            </li>
            <li>
              Confirm labels, descriptions, and errors describe the actual data supplied by the
              host.
            </li>
            <li>Check both modes, reduced motion, long text, and a narrow viewport.</li>
          </ul>
        </>
      );
    case 'api':
      return (
        <>
          {meta.description && meta.description !== introductionFor(meta) && (
            <div className="component-docs-implementation-notes">
              <h3>Implementation notes</h3>
              <Markdown
                options={{ disableParsingRawHTML: true, overrides: { table: DocumentationTable } }}
              >
                {meta.description}
              </Markdown>
            </div>
          )}
          <ApiTable meta={meta} />
        </>
      );
    case 'context':
      return (
        <>
          {notes(guidance?.context)}
          <p>
            These examples are registered for this family. Use the canvas link to explore the full
            interaction, controls, and theme modes.
          </p>
          <Table headers={['Example', 'Open']}>
            {meta.stories.map((story) => (
              <tr key={story.id}>
                <th scope="row">{story.name}</th>
                <td>
                  <a href={storyUrl(story.id)} target="_top">
                    Open {story.name}
                  </a>
                </td>
              </tr>
            ))}
          </Table>
          <h3>In the application</h3>
          <p>
            <a href="./?path=/story/console-application-demo--demo" target="_top">
              Open Application Demo
            </a>{' '}
            to explore the shared visual language in dashboards, data grids, records, profiles, and
            workspace settings.
          </p>
        </>
      );
    default:
      return null;
  }
}
function ApiTable({ meta }: { meta: ComponentMetadata }) {
  const [query, setQuery] = useState(''),
    [inherited, setInherited] = useState(false);
  const props = meta.props.filter(
    (prop) =>
      (inherited || !prop.inherited) &&
      `${prop.component} ${prop.name} ${prop.type}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <p>
        Properties are read from the TypeScript public API. Defaults are included only when declared
        in source; an omitted value is not assumed to be false or empty.
      </p>
      <div className="component-docs-controls">
        <label>
          Find a property
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="size, onChange, disabled…"
          />
        </label>
        <label className="component-docs-checkbox">
          <input
            type="checkbox"
            checked={inherited}
            onChange={(event) => setInherited(event.target.checked)}
          />
          Include inherited platform properties
        </label>
      </div>
      <Table headers={['Component / property', 'Type', 'Required / default', 'Description']}>
        {props.map((prop) => (
          <tr key={`${prop.component}.${prop.name}`}>
            <th scope="row">
              <small>{prop.component}</small>
              <code>{prop.name}</code>
            </th>
            <td>
              <code>{prop.type}</code>
            </td>
            <td>
              {prop.required ? 'Required' : 'Optional'}
              <small>
                {prop.defaultValue === undefined ? 'No explicit default' : prop.defaultValue}
              </small>
            </td>
            <td>
              {prop.description ||
                'See the property type and working examples for the supported value.'}
            </td>
          </tr>
        ))}
      </Table>
      <h3>Source files</h3>
      <ul>
        {meta.sourceFiles.map((file) => (
          <li key={file}>
            <code>{file}</code>
          </li>
        ))}
      </ul>
    </>
  );
}
export function ComponentDocumentation({
  componentId,
  section,
}: {
  componentId: string;
  section: DocumentationSection;
}) {
  const [meta, setMeta] = useState<ComponentMetadata>();
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setMeta(undefined);
    setError('');
    loadComponentMetadata(componentId)
      .then((value) => {
        if (active) setMeta(value);
      })
      .catch(() => {
        if (active) setError(`Component documentation is unavailable for ${componentId}.`);
      });
    return () => {
      active = false;
    };
  }, [componentId]);
  if (error) return <p role="alert">{error}</p>;
  if (!meta) return <p role="status">Loading component documentation…</p>;
  return <ComponentHub key={componentId} meta={meta} initialSection={section} />;
}

function ComponentHub({
  meta,
  initialSection,
}: {
  meta: ComponentMetadata;
  initialSection: DocumentationSection;
}) {
  const [state, setState] = useState(() => readHubState(initialSection, meta));
  const guidelineContent = useRef<HTMLDivElement>(null);
  const pendingAnchor = useRef<GuidelineSection | null>(
    state.tab === 'guidelines' ? state.anchor : null,
  );
  const focusAnchor = useRef(false);
  useEffect(() => {
    const target = navigationWindow();
    const restore = () => {
      const next = readHubState(initialSection, meta);
      pendingAnchor.current = next.tab === 'guidelines' ? next.anchor : null;
      setState(next);
    };
    target.addEventListener('popstate', restore);
    return () => target.removeEventListener('popstate', restore);
  }, [meta, initialSection]);
  useEffect(() => {
    if (state.tab !== 'guidelines' || !pendingAnchor.current) return;
    const target = guidelineContent.current?.querySelector<HTMLElement>(
      `#guideline-${pendingAnchor.current}`,
    );
    if (!target) return;
    const frame = requestAnimationFrame(() => {
      target.scrollIntoView({ block: 'start' });
      if (focusAnchor.current)
        target.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
      pendingAnchor.current = null;
      focusAnchor.current = false;
    });
    return () => cancelAnimationFrame(frame);
  }, [state.tab, state.anchor]);
  useEffect(() => {
    if (state.tab !== 'guidelines' || !guidelineContent.current) return;
    const nodes = [
      ...guidelineContent.current.querySelectorAll<HTMLElement>('[data-guideline-section]'),
    ];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const next = visible[0]?.target.getAttribute('data-guideline-section') as
          GuidelineSection | undefined;
        if (next && !pendingAnchor.current)
          setState((current) => (current.anchor === next ? current : { ...current, anchor: next }));
      },
      { rootMargin: '-10% 0px -65% 0px' },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [state.tab]);
  const navigate = (tab: HubTab, anchor?: GuidelineSection) => {
    const nextAnchor = anchor ?? state.anchor;
    pendingAnchor.current = tab === 'guidelines' && anchor ? anchor : null;
    focusAnchor.current = !!anchor;
    setState((current) => ({ ...current, tab, anchor: nextAnchor }));
    updateHubUrl(tab, nextAnchor, state.example);
    // A repeated anchor still needs to move focus and scroll to the same section.
    if (tab === state.tab && nextAnchor === state.anchor && anchor) {
      const target = guidelineContent.current?.querySelector<HTMLElement>(`#guideline-${anchor}`);
      target?.scrollIntoView({ block: 'start' });
      target?.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
      pendingAnchor.current = null;
      focusAnchor.current = false;
    }
  };
  const changeExample = (example: string) => {
    setState((current) => ({ ...current, example }));
    updateHubUrl(state.tab, state.anchor, example);
  };
  const guidanceProps = {
    meta,
    example: state.example,
    onExampleChange: changeExample,
    onNavigate: navigate,
  };
  return (
    <article className="component-docs" data-component-id={meta.id}>
      <header className="component-docs-heading">
        <p>{meta.category.replace(/^Components\//, '').replace(/^Patterns\//, '')}</p>
        <h1>{meta.name}</h1>
        <p className="component-docs-description">{introductionFor(meta)}</p>
        <div className="component-docs-page-links">
          <a href="./?path=/docs/foundations-component-directory--docs" target="_top">
            Directory
          </a>
          <a href={`ai/components/${meta.id}.json`} target="_blank" rel="noreferrer">
            AI reference
          </a>
        </div>
      </header>
      <Tabs.Root
        value={state.tab}
        onValueChange={(value) => {
          if (hubTabs.some((tab) => tab.id === value)) navigate(value as HubTab);
        }}
      >
        <Tabs.List className="component-docs-tabs" aria-label={`${meta.name} documentation`}>
          {hubTabs.map((tab) => (
            <Tabs.Tab className="component-docs-tab" key={tab.id} value={tab.id}>
              {tab.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        <Tabs.Panel value="overview" className="component-docs-panel">
          <Guidelines {...guidanceProps} section="overview" />
        </Tabs.Panel>
        <Tabs.Panel value="guidelines" className="component-docs-panel">
          <div className="component-docs-guidelines">
            <nav className="component-docs-guideline-nav" aria-label="Component guideline sections">
              <p>On this page</p>
              {guidelineSections.map((item) => (
                <a
                  key={item.id}
                  href={sectionUrl(meta, item.id)}
                  target="_top"
                  aria-current={state.anchor === item.id ? 'location' : undefined}
                  onClick={(event) => {
                    if (!isPlainClick(event)) return;
                    event.preventDefault();
                    navigate('guidelines', item.id);
                  }}
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <div ref={guidelineContent} className="component-docs-guideline-content">
              {guidelineSections.map((item) => (
                <section
                  key={item.id}
                  id={`guideline-${item.id}`}
                  data-guideline-section={item.id}
                  className="component-docs-guideline-section"
                  aria-labelledby={`guideline-heading-${item.id}`}
                >
                  <h2 id={`guideline-heading-${item.id}`} tabIndex={-1}>
                    {item.label}
                  </h2>
                  <Guidelines {...guidanceProps} section={item.id} />
                </section>
              ))}
            </div>
          </div>
        </Tabs.Panel>
        <Tabs.Panel value="tokens" className="component-docs-panel">
          <TokenDocumentation meta={meta} />
        </Tabs.Panel>
        <Tabs.Panel value="examples" className="component-docs-panel">
          <p>
            Explore {meta.stories.length}{' '}
            {meta.stories.length === 1 ? 'working example' : 'working examples'}. Choose an example
            on the right, then try its behavior and available options.
          </p>
          <Specimen meta={meta} story={state.example} onStoryChange={changeExample} examples />
        </Tabs.Panel>
      </Tabs.Root>
    </article>
  );
}
