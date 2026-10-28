import { version as packageVersion } from '../../package.json';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/card';
import { Field } from '@/components/field';
import { TextInput } from '@/components/text-input';
import { Textarea } from '@/components/textarea';
import { Select } from '@/components/select';
import { SegmentedControl } from '@/components/segmented-control';
import { DropdownMenu } from '@/components/dropdown-menu';
import { Modal } from '@/components/modal';
import { Tag } from '@/components/tag';
import { StatusBadge } from '@/components/status-badge';
import { TokenInput } from './components/TokenInput';
import { FilteredDataset, type FilteredDatasetRecord } from './components/FilteredDataset';
import { InfrastructurePanel } from './infrastructure-panel';
import { compileProfile, designProfiles, validateProfile, type DesignProfile } from './profile';
import {
  registry,
  proposals,
  proposalExampleRegistry,
  discoverRegistry,
  compareProposals,
  planConsolidation,
} from './registry';
import * as composition from './composition';
import * as maintenance from './maintenance';
import './workbench.css';

type Page = 'configure' | 'compose' | 'registry' | 'maintain' | 'export' | 'infrastructure';
const pages: { id: Page; label: string; detail: string }[] = [
  { id: 'configure', label: 'Design language', detail: 'Set the character' },
  { id: 'compose', label: 'Compose a pattern', detail: 'Intent to interface' },
  { id: 'registry', label: 'Component registry', detail: 'Discover and extend' },
  { id: 'maintain', label: 'Maintain the system', detail: 'Inspect changes' },
  { id: 'export', label: 'Export agent kit', detail: 'Bring your own agent' },
  { id: 'infrastructure', label: 'Infrastructure', detail: 'Operate the system' },
];
const storageKey = 'aegis-agentic.profile.v1';
const customers: FilteredDatasetRecord[] = [
  {
    id: 'linear',
    name: 'Linear',
    domain: 'linear.app',
    owner: 'Sofia Chen',
    status: 'Active',
    plan: 'Enterprise',
    seats: 48,
  },
  {
    id: 'arc',
    name: 'Arc',
    domain: 'arc.net',
    owner: 'Noah Williams',
    status: 'Active',
    plan: 'Growth',
    seats: 24,
  },
  {
    id: 'layers',
    name: 'Layers',
    domain: 'layers.to',
    owner: 'Amelia Park',
    status: 'Trial',
    plan: 'Starter',
    seats: 8,
  },
  {
    id: 'vercel',
    name: 'Vercel',
    domain: 'vercel.com',
    owner: 'Oliver Martin',
    status: 'Active',
    plan: 'Enterprise',
    seats: 96,
  },
  {
    id: 'orbit',
    name: 'Orbit',
    domain: 'orbit.design',
    owner: 'Mia Thompson',
    status: 'Paused',
    plan: 'Growth',
    seats: 16,
  },
];
function readProfile(): DesignProfile {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (saved && !validateProfile(saved).length) return saved as DesignProfile;
  } catch {
    /* Invalid or unavailable storage uses the default profile. */
  }
  return designProfiles[0];
}
function downloadJson(name: string, value: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
function Glyph({ kind }: { kind: string }) {
  const paths: Record<string, ReactNode> = {
    configure: (
      <>
        <path d="M4 7h16M4 17h16" />
        <circle cx="9" cy="7" r="3" />
        <circle cx="15" cy="17" r="3" />
      </>
    ),
    compose: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="18" height="7" rx="2" />
      </>
    ),
    registry: (
      <>
        <path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 17l9 5 9-5" />
      </>
    ),
    maintain: (
      <>
        <path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    infrastructure: (
      <>
        <rect x="3" y="3" width="18" height="7" rx="2" />
        <rect x="3" y="14" width="18" height="7" rx="2" />
        <path d="M7 6h1m-1 11h1m8-11h1m-1 11h1" />
      </>
    ),
    export: (
      <>
        <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />
      </>
    ),
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    check: <path d="m5 12 4 4 10-10" />,
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2" />
      </>
    ),
  };
  return (
    <svg
      className="aw-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[kind] ?? paths.compose}
    </svg>
  );
}
function Choice({
  label,
  value,
  values,
  onChange,
  help,
}: {
  label: string;
  value: string;
  values: string[];
  onChange: (value: string) => void;
  help?: string;
}) {
  return (
    <div className="aw-choice">
      <span>{label}</span>
      <SegmentedControl
        label={label}
        value={value}
        options={values.map((item) => ({
          value: item,
          label: item.replace(/\b\w/g, (x) => x.toUpperCase()),
        }))}
        onValueChange={onChange}
        fullWidth
        wrap
      />
      {help && <small>{help}</small>}
    </div>
  );
}
function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="aw-color-field">
      <TextInput label={label} value={value} onValueChange={onChange} aria-label={`${label} hex`} />
      <input
        type="color"
        aria-label={`${label} color picker`}
        value={/^#[a-f\d]{6}$/i.test(value) ? value : designProfiles[0].brand}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
function SectionIntro({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <header className="aw-section-intro">
      <span className="aw-eyebrow">{kicker}</span>
      <h1>{title}</h1>
      <p>{children}</p>
    </header>
  );
}

export function AgenticWorkbench() {
  const [page, setPage] = useState<Page>('configure');
  const [profile, setProfile] = useState<DesignProfile>(readProfile);
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const [presentation, setPresentation] = useState('fundamental');
  const [notice, setNotice] = useState('');
  const [storageStatus, setStorageStatus] = useState('Session only');
  const [compositionSpec, setCompositionSpec] = useState(composition.defaultCompositionSpec);
  const fileInput = useRef<HTMLInputElement>(null);
  const issues = useMemo(() => validateProfile(profile), [profile]);
  const compiled = useMemo(
    () => compileProfile(issues.length ? designProfiles[0] : profile),
    [profile, issues.length],
  );
  useEffect(() => {
    document.title = 'Aegis Agentic · Design language workbench';
    document.documentElement.dataset.agenticProfile = compiled.profile.id;
    document.documentElement.dataset.theme = mode;
    document.documentElement.dataset.layoutTheme = presentation;
    document.documentElement.classList.toggle('dark', mode === 'dark');
    return () => {
      delete document.documentElement.dataset.agenticProfile;
    };
  }, [compiled.profile.id, mode, presentation]);
  useEffect(() => {
    if (!issues.length)
      try {
        localStorage.setItem(storageKey, JSON.stringify(profile));
        setStorageStatus('Profile saved on this device');
      } catch {
        setStorageStatus('Session only');
      }
    else setStorageStatus('Unsaved profile changes');
  }, [profile, issues.length]);
  function update<K extends keyof DesignProfile>(key: K, value: DesignProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
    setNotice('');
  }
  async function importProfile(file: File) {
    try {
      const candidate: unknown = JSON.parse(await file.text());
      const found = validateProfile(candidate);
      if (found.length) throw new Error(found.map((issue) => issue.message).join(' '));
      setProfile(candidate as DesignProfile);
      setNotice('Profile imported and validated.');
    } catch (error) {
      setNotice(`Import failed: ${error instanceof Error ? error.message : 'Invalid file.'}`);
    }
  }
  return (
    <>
      <style>{compiled.css}</style>
      <div
        className="agentic-workbench"
        data-agentic-profile={compiled.profile.id}
        data-theme="light"
        data-layout-theme="fundamental"
      >
        <a className="aw-skip sr-only" href="#aw-main">
          Skip to workbench
        </a>
        <aside className="aw-rail">
          <a
            className="aw-brand"
            href="#"
            onClick={(event) => {
              event.preventDefault();
              setPage('configure');
            }}
          >
            <span className="aw-mark">a</span>
            <span>
              Aegis<span className="aw-brand-sub">AGENTIC</span>
            </span>
          </a>
          <div className="aw-project">
            <span className="aw-project-mark">A</span>
            <span>
              <strong>Your design system</strong>
              <small>Local experiment</small>
            </span>
            <span className="aw-project-dot" />
          </div>
          <p className="aw-nav-label">WORKBENCH</p>
          <nav aria-label="Workbench sections">
            {pages.map((item, index) => (
              <button
                type="button"
                key={item.id}
                className="aw-nav-item"
                data-active={page === item.id}
                onClick={() => {
                  setPage(item.id);
                  setNotice('');
                }}
                aria-current={page === item.id ? 'page' : undefined}
              >
                <Glyph kind={item.id} />
                <span>{item.label}</span>
                <small>{String(index + 1).padStart(2, '0')}</small>
              </button>
            ))}
          </nav>
          <div className="aw-rail-bottom">
            <div className="aw-agent-note">
              <span className="aw-orbit">✳</span>
              <strong>A language agents can use.</strong>
              <p>Rules, contracts, and evidence travel with your system.</p>
            </div>
            <div className="aw-version">
              <span className="aw-project-dot" /> Experimental build <span>v{packageVersion.split('.').slice(0, 2).join('.')}</span>
            </div>
          </div>
        </aside>
        <div className="aw-workspace">
          <header className="aw-topbar">
            <div>
              <span>Workspace</span>
              <span className="aw-breadcrumb">/</span>
              <strong>{pages.find((item) => item.id === page)?.label}</strong>
            </div>
            <div className="aw-topbar-actions">
              <span className="aw-local">{storageStatus}</span>
              <Button
                emphasis="secondary"
                size="sm"
                onClick={() => setPage('export')}
                trailingIcon={<Glyph kind="export" />}
              >
                Export kit
              </Button>
            </div>
          </header>
          <main id="aw-main" className="aw-main">
            {notice && (
              <div className="aw-notice" role="status">
                {notice}
              </div>
            )}
            {page === 'configure' && (
              <>
                <SectionIntro kicker="01 / FOUNDATION" title="Make it feel like you.">
                  Choose the character. Aegis translates your decisions into a consistent design
                  language, with light and dark modes built in.
                </SectionIntro>
                <div className="aw-foundation-grid">
                  <section className="aw-settings" aria-label="Design profile configuration">
                    <div className="aw-panel-heading">
                      <h2>Design profile</h2>
                      <span className="aw-subtle">Start with a direction</span>
                    </div>
                    <div className="aw-presets">
                      {designProfiles.map((preset, index) => (
                        <button
                          type="button"
                          className="aw-preset"
                          key={preset.id}
                          data-selected={profile.id === preset.id}
                          onClick={() => setProfile({ ...preset })}
                        >
                          <span className={`aw-preset-art aw-preset-art-${index}`}>
                            <i />
                            <i />
                            <svg
                              className="aw-preset-color"
                              viewBox="0 0 100 10"
                              preserveAspectRatio="none"
                              aria-hidden="true"
                            >
                              <rect width="100" height="10" fill={preset.brand} />
                            </svg>
                          </span>
                          <strong>{preset.name}</strong>
                          <small>
                            {['Calm & precise', 'Sharp & focused', 'Warm & expressive'][index] ??
                              'Custom direction'}
                          </small>
                        </button>
                      ))}
                    </div>
                    <div className="aw-settings-group">
                      <div className="aw-group-label">
                        <span>01</span>
                        <h3>Identity & color</h3>
                      </div>
                      <TextInput
                        label="Profile name"
                        value={profile.name}
                        onValueChange={(value) => update('name', value)}
                      />
                      <ColorField
                        label="Brand color"
                        value={profile.brand}
                        onChange={(value) => update('brand', value)}
                      />
                      <Choice
                        label="Neutral temperature"
                        value={profile.neutral}
                        values={['neutral', 'warm', 'cool']}
                        onChange={(value) => update('neutral', value as DesignProfile['neutral'])}
                        help="A subtle undertone for surfaces, borders, and text."
                      />
                      <details className="aw-details">
                        <summary>
                          Semantic color seeds <span>4 roles</span>
                        </summary>
                        <p>
                          Meaning stays consistent. The compiler derives accessible foreground and
                          surface pairs for each mode.
                        </p>
                        <div className="aw-semantic-fields">
                          {(['success', 'warning', 'danger', 'info'] as const).map((role) => (
                            <ColorField
                              key={role}
                              label={role[0].toUpperCase() + role.slice(1)}
                              value={profile.semantic[role]}
                              onChange={(value) =>
                                update('semantic', { ...profile.semantic, [role]: value })
                              }
                            />
                          ))}
                        </div>
                      </details>
                    </div>
                    <div className="aw-settings-group">
                      <div className="aw-group-label">
                        <span>02</span>
                        <h3>Shape & rhythm</h3>
                      </div>
                      <Choice
                        label="Corner character"
                        value={profile.radius}
                        values={['compact', 'soft', 'round']}
                        onChange={(value) => update('radius', value as DesignProfile['radius'])}
                      />
                      <Choice
                        label="Default density"
                        value={profile.density}
                        values={['compact', 'comfortable']}
                        onChange={(value) => update('density', value as DesignProfile['density'])}
                      />
                      <Choice
                        label="Typography"
                        value={profile.font}
                        values={['figtree', 'system', 'serif']}
                        onChange={(value) => update('font', value as DesignProfile['font'])}
                        help="One type scale, with consistent geometry across light and dark."
                      />
                    </div>
                    {issues.length > 0 && (
                      <div className="aw-error" role="alert">
                        {issues.map((issue, i) => (
                          <p key={i}>{issue.message}</p>
                        ))}
                        <p>Preview uses the default profile until these values are valid.</p>
                      </div>
                    )}
                    <div className="aw-settings-footer">
                      <Button
                        emphasis="ghost"
                        size="sm"
                        onClick={() => setProfile(designProfiles[0])}
                      >
                        Reset profile
                      </Button>
                      <Button
                        emphasis="secondary"
                        size="sm"
                        onClick={() => fileInput.current?.click()}
                      >
                        Import JSON
                      </Button>
                      <input
                        ref={fileInput}
                        type="file"
                        accept="application/json,.json"
                        hidden
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) void importProfile(file);
                          event.target.value = '';
                        }}
                      />
                    </div>
                  </section>
                  <div className="aw-preview-column">
                    <section className="aw-preview" aria-label="Live design preview">
                      <div className="aw-preview-toolbar">
                        <div>
                          <span className="aw-live-dot" />
                          <strong>Live preview</strong>
                        </div>
                        <SegmentedControl
                          label="Preview color mode"
                          value={mode}
                          onValueChange={(value) => setMode(value as 'light' | 'dark')}
                          options={[
                            { value: 'light', label: 'Light' },
                            { value: 'dark', label: 'Dark' },
                          ]}
                          size="sm"
                        />
                      </div>
                      <div
                        className="aw-preview-scene"
                        data-theme={mode}
                        data-layout-theme={presentation}
                        data-density={profile.density}
                      >
                        <PreviewScene density={profile.density} />
                        <div className="aw-preview-caption">
                          <span>Real components. Shared rules.</span>
                          <Select
                            aria-label="Preview presentation"
                            value={presentation}
                            size="sm"
                            onValueChange={setPresentation}
                            options={[
                              { value: 'fundamental', label: 'Fundamental' },
                              { value: 'fundamental-floating', label: 'Fundamental Floating' },
                            ]}
                          />
                        </div>
                      </div>
                    </section>
                    <div className="aw-compile-strip">
                      <span className="aw-check-icon">
                        <Glyph kind="check" />
                      </span>
                      <div>
                        <strong>
                          {issues.length ? 'Profile needs attention' : 'Profile compiled'}
                        </strong>
                        <p>
                          {compiled.stats.primitive.toLocaleString()} primitives ·{' '}
                          {compiled.stats.semantic.toLocaleString()} semantic roles ·{' '}
                          {compiled.stats.group.toLocaleString()} group tokens
                        </p>
                      </div>
                      <code>{compiled.hash.slice(0, 8)}</code>
                    </div>
                    <div className="aw-language-note">
                      <div>
                        <Glyph kind="registry" />
                      </div>
                      <section>
                        <h3>Your choices become a system.</h3>
                        <p>
                          Components consume category tokens. New components inherit the same
                          language through contracts and extension rules.
                        </p>
                        <button type="button" onClick={() => setPage('compose')}>
                          Try composing a pattern <Glyph kind="arrow" />
                        </button>
                      </section>
                    </div>
                    <details className="aw-details aw-diagnostics">
                      <summary>
                        Inspect compilation evidence{' '}
                        <span>{compiled.contrast.length} contrast pairs</span>
                      </summary>
                      <p>
                        Computed checks cover these foreground/background pairs. They do not certify
                        every rendered state.
                      </p>
                      <div className="aw-evidence-list">
                        {compiled.contrast.map((item, i) => (
                          <div key={i}>
                            <span>
                              {item.pair} · {item.mode}
                            </span>
                            <strong>
                              {item.ratio.toFixed(2)}:1 {item.passes ? 'Pass' : 'Review'}
                            </strong>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                </div>
              </>
            )}
            {page === 'compose' && (
              <CompositionWorkbench
                profile={compiled.profile}
                fingerprint={compiled.hash}
                mode={mode}
                setMode={setMode}
                spec={compositionSpec}
                onSpecChange={setCompositionSpec}
              />
            )}
            {page === 'registry' && <RegistryWorkbench />}
            {page === 'maintain' && <MaintenanceWorkbench />}
            {page === 'infrastructure' && <InfrastructurePanel />}
            {page === 'export' && (
              <>
                <SectionIntro kicker="05 / HANDOFF" title="Take the language with you.">
                  Give your agent a precise starting point: the profile, registry, composition
                  rules, and the evidence needed to propose a new component.
                </SectionIntro>
                <div className="aw-export-grid">
                  <Card>
                    <CardHeader>
                      <Glyph kind="export" />
                      <CardTitle>Design profile</CardTitle>
                      <CardDescription>Your editable source of visual decisions.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <dl className="aw-export-facts">
                        <div>
                          <dt>Profile</dt>
                          <dd>{profile.name}</dd>
                        </div>
                        <div>
                          <dt>Modes</dt>
                          <dd>Light + dark</dd>
                        </div>
                        <div>
                          <dt>Compiler fingerprint</dt>
                          <dd>
                            <code>{compiled.hash}</code>
                          </dd>
                        </div>
                      </dl>
                    </CardContent>
                    <CardFooter>
                      <Button
                        intent="function"
                        disabled={issues.length > 0}
                        onClick={() => downloadJson(`${profile.id}.profile.json`, profile)}
                        trailingIcon={<Glyph kind="export" />}
                      >
                        Download profile
                      </Button>
                    </CardFooter>
                  </Card>
                  <Card>
                    <CardHeader>
                      <Glyph kind="registry" />
                      <CardTitle>Agent handoff bundle</CardTitle>
                      <CardDescription>
                        Machine-readable inputs for an external agent.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p>
                        Includes the profile, compiled manifest, canonical registry, default
                        composition, and verification status. The full instructions and validator
                        CLI live in this repository.
                      </p>
                      <Tag intent="warning">Experimental · requires review</Tag>
                    </CardContent>
                    <CardFooter>
                      <Button
                        emphasis="secondary"
                        disabled={issues.length > 0}
                        onClick={() =>
                          downloadJson(`${profile.id}.agent-kit.json`, {
                            schemaVersion: 1,
                            profile,
                            manifest: compiled.manifest,
                            registry,
                            composition: {
                              ...compositionSpec,
                              profileId: compiled.profile.id,
                              profileHash: compiled.hash,
                              mode,
                            },
                            evidence: {
                              status: 'experimental',
                              contrast: compiled.contrast,
                              note: 'Compiler checks are not runtime or visual approval.',
                            },
                          })
                        }
                      >
                        Download JSON bundle
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
                <section className="aw-handoff">
                  <span className="aw-eyebrow">THE AGENT WORKFLOW</span>
                  <h2>Discover → compose → validate → review</h2>
                  <p>
                    Reuse an existing contract first. When the registry has a gap, propose a
                    component with explicit behavior, category ownership, stories, and evidence.
                    Consolidation stays blocked until conflicts and review requirements are
                    resolved.
                  </p>
                  <p className="aw-subtle">
                    No model calls, hosted generation, or automatic publishing are connected in this
                    experiment.
                  </p>
                </section>
              </>
            )}
          </main>
          <footer className="aw-footer">
            <span>Aegis Agentic</span>
            <span>Deterministic foundations. Human design direction.</span>
            <span>Local experiment</span>
          </footer>
        </div>
      </div>
    </>
  );
}

function PreviewScene({ density }: { density: string }) {
  const [dialog, setDialog] = useState(false);
  const [name, setName] = useState('Alex Morgan');
  const [saved, setSaved] = useState(false);
  return (
    <div className="aw-specimen">
      <div className="aw-specimen-heading">
        <div className="aw-specimen-logo">
          a<span>acme</span>
        </div>
        <div className="aw-specimen-account">AM</div>
      </div>
      <div className="aw-specimen-title">
        <div>
          <span className="aw-eyebrow">WORKSPACE OVERVIEW</span>
          <h2>
            Good morning, Alex <span>↗</span>
          </h2>
          <p>A little clarity for your everyday work.</p>
        </div>
        <DropdownMenu
          trigger={
            <Button emphasis="secondary" size="sm">
              Actions ⌄
            </Button>
          }
          items={[
            { id: 'open', label: 'Edit workspace', onSelect: () => setDialog(true) },
            {
              id: 'reset',
              label: 'Reset example',
              onSelect: () => {
                setName('Alex Morgan');
                setSaved(false);
              },
            },
          ]}
        />
      </div>
      <div className="aw-stat-grid">
        <div>
          <span>Total revenue</span>
          <strong>
            $24,680<span>+12.8%</span>
          </strong>
          <div className="aw-mini-bars" aria-hidden="true">
            {[38, 49, 35, 63, 52, 70, 65, 80, 71, 94, 85, 100].map((height, i) => (
              <i key={i} style={{ height: `${height}%` }} />
            ))}
          </div>
        </div>
        <div>
          <span>Active customers</span>
          <strong>
            1,428<span>+8.2%</span>
          </strong>
          <div className="aw-mini-chart" aria-hidden="true">
            <svg viewBox="0 0 240 48" preserveAspectRatio="none">
              <path d="M0 43 22 35 43 39 65 26 86 31 108 19 130 26 151 12 172 19 194 7 216 12 240 1" />
            </svg>
          </div>
        </div>
      </div>
      <Card elevation="flat">
        <CardHeader>
          <CardTitle>Team settings</CardTitle>
          <CardDescription>A small surface, shaped by your design language.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="aw-preview-fields">
            <Field label="Your name">
              <TextInput
                value={name}
                onValueChange={(value) => {
                  setName(value);
                  setSaved(false);
                }}
              />
            </Field>
            <Select
              label="Role"
              defaultValue="admin"
              options={[
                { value: 'admin', label: 'Administrator' },
                { value: 'member', label: 'Member' },
              ]}
            />
          </div>
        </CardContent>
        <CardFooter>
          <div className="aw-preview-actions">
            <Button intent="function" onClick={() => setSaved(true)}>
              {saved ? 'Changes saved' : 'Save changes'}
            </Button>
            <Button emphasis="secondary" onClick={() => setDialog(true)}>
              Invite member
            </Button>
            <Tag intent="success">All systems operational</Tag>
          </div>
        </CardFooter>
      </Card>
      <div className="aw-table-heading">
        <h3>Recent activity</h3>
        <span>3 updates</span>
      </div>
      <div className="aw-table-scroll">
        <table className="aw-data-table" data-density={density}>
          <thead>
            <tr>
              <th>Project</th>
              <th>Owner</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {[
              { name: 'Website refresh', owner: 'Design team', status: 'in-progress' },
              { name: 'Customer portal', owner: 'Product team', status: 'in-review' },
              { name: 'Brand guidelines', owner: 'Design team', status: 'completed' },
            ].map((row) => (
              <tr key={row.name}>
                <td>
                  <strong>{row.name}</strong>
                </td>
                <td>{row.owner}</td>
                <td>
                  <StatusBadge status={row.status as 'in-progress' | 'in-review' | 'completed'} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal
        title="Invite a teammate"
        description="A local preview of dialog, focus, and input behavior."
        open={dialog}
        onOpenChange={setDialog}
        footer={
          <>
            <Button emphasis="secondary" onClick={() => setDialog(false)}>
              Cancel
            </Button>
            <Button intent="function" onClick={() => setDialog(false)}>
              Done
            </Button>
          </>
        }
      >
        <TextInput label="Email address" type="email" placeholder="teammate@acme.com" />
        <p>This preview does not send invitations.</p>
      </Modal>
    </div>
  );
}

function CompositionWorkbench({
  profile,
  fingerprint,
  mode,
  setMode,
  spec,
  onSpecChange,
}: {
  profile: DesignProfile;
  fingerprint: string;
  mode: 'light' | 'dark';
  setMode: (mode: 'light' | 'dark') => void;
  spec: composition.CompositionSpec;
  onSpecChange: (spec: composition.CompositionSpec) => void;
}) {
  const [draft, setDraft] = useState(JSON.stringify(spec, null, 2));
  const [specError, setSpecError] = useState('');
  const [editor, setEditor] = useState(false);
  const effectiveSpec = { ...spec, profileId: profile.id, profileHash: fingerprint, mode };
  const validation = composition.validateCompositionSpec(effectiveSpec);
  const resolution = validation.valid
    ? composition.resolveComposition(effectiveSpec, registry, {
        id: profile.id,
        revision: spec.profileRevision,
        fingerprint,
      })
    : null;
  function changeSpec(next: typeof spec) {
    onSpecChange(next);
    setDraft(JSON.stringify(next, null, 2));
    setSpecError('');
  }
  function applyJson() {
    try {
      const next: unknown = JSON.parse(draft);
      const result = composition.validateCompositionSpec(next);
      if (!result.valid)
        throw new Error(result.issues.map((issue) => `${issue.path}: ${issue.message}`).join(' '));
      changeSpec(next as typeof spec);
    } catch (error) {
      setSpecError(error instanceof Error ? error.message : 'Invalid JSON');
    }
  }
  return (
    <>
      <SectionIntro kicker="02 / COMPOSITION" title="Start with intent. Keep the rules.">
        One canonical dataset-filtering pattern, resolved from a structured specification. Change
        the behavior and inspect exactly what will be built.
      </SectionIntro>
      <div className="aw-compose-layout">
        <aside className="aw-compose-controls">
          <div className="aw-panel-heading">
            <h2>Pattern specification</h2>
            <Tag>v1</Tag>
          </div>
          <TextInput
            label="Page title"
            value={spec.content.title}
            onValueChange={(value) =>
              changeSpec({ ...spec, content: { ...spec.content, title: value } })
            }
          />
          <Choice
            label="Filter application"
            value={spec.filters.application}
            values={['immediate', 'explicit']}
            onChange={(value) =>
              changeSpec({
                ...spec,
                filters: {
                  ...spec.filters,
                  application: value as 'immediate' | 'explicit',
                  showApplyButton: value === 'explicit',
                },
              })
            }
            help="Deferred filters require an explicit Apply action."
          />
          <Choice
            label="Density"
            value={spec.density}
            values={['compact', 'comfortable']}
            onChange={(value) =>
              changeSpec({ ...spec, density: value as 'compact' | 'comfortable' })
            }
          />
          <TextInput
            label="Empty-state message"
            value={spec.content.emptyMessage}
            onValueChange={(value) =>
              changeSpec({ ...spec, content: { ...spec.content, emptyMessage: value } })
            }
          />
          <Button emphasis="secondary" onClick={() => setEditor(!editor)}>
            {editor ? 'Hide' : 'Edit'} JSON specification
          </Button>
          {editor && (
            <>
              <Textarea
                label="Composition JSON"
                value={draft}
                onValueChange={setDraft}
                rows={16}
                spellCheck={false}
              />
              <Button onClick={applyJson}>Validate and apply JSON</Button>
              {specError && (
                <p className="aw-error" role="alert">
                  {specError}
                </p>
              )}
            </>
          )}
          <div className="aw-contract-note">
            <Glyph kind="maintain" />
            <h3>A constrained composition</h3>
            <p>
              Search, filters, results, empty state, and reset share one state model. Both modes use
              the same recipe.
            </p>
            <code>{resolution?.stableHash ?? 'Invalid specification'}</code>
          </div>
          <Button emphasis="ghost" onClick={() => downloadJson('composition.json', effectiveSpec)}>
            Export specification
          </Button>
        </aside>
        <div>
          <div className="aw-preview-toolbar">
            <div>
              <span className="aw-live-dot" />
              <strong>Pattern preview</strong>
            </div>
            <SegmentedControl
              label="Pattern color mode"
              value={mode}
              onValueChange={(value) => setMode(value as 'light' | 'dark')}
              options={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
              size="sm"
            />
          </div>
          <FilteredDataset
            spec={effectiveSpec}
            records={customers}
            description="Manage the people and companies you work with."
            sourceLabel="Local sample data · no customer records are connected."
          />
          <details className="aw-details aw-recipe">
            <summary>
              Resolved component recipe <span>{resolution?.recipe.length ?? 0} slots</span>
            </summary>
            <pre>{JSON.stringify(resolution?.recipe ?? validation.issues, null, 2)}</pre>
          </details>
        </div>
      </div>
    </>
  );
}

function RegistryWorkbench() {
  const [search, setSearch] = useState('');
  const [valuesA, setValuesA] = useState<string[]>(['design', 'system']);
  const [valuesB, setValuesB] = useState<string[]>(['design', 'system']);
  const [showPlan, setShowPlan] = useState(false);
  const entries = discoverRegistry(search);
  const comparison = compareProposals(proposals[0], proposals[1], proposalExampleRegistry);
  const plan = planConsolidation(
    proposals.map((proposal) => proposal.id),
    { expectedRevision: proposalExampleRegistry.revision },
    proposalExampleRegistry,
  );
  return (
    <>
      <SectionIntro kicker="03 / REGISTRY" title="Extend with a shared vocabulary.">
        Discover existing capabilities before creating something new. Compare two proposals, expose
        their behavioral differences, and prepare a consolidation plan.
      </SectionIntro>
      <div className="aw-registry-summary">
        <TextInput
          label="Find a component or capability"
          placeholder="Try: search, filtering, tokens…"
          value={search}
          onValueChange={setSearch}
          clearable
        />
        <span>
          {entries.length} matching entries · revision {registry.revision}
        </span>
      </div>
      <div className="aw-registry-grid">
        {entries.map((entry) => (
          <article className="aw-registry-card" key={entry.id}>
            <div>
              <Glyph kind="registry" />
              <Tag>{entry.kind}</Tag>
            </div>
            <h3>{entry.name}</h3>
            <p>{entry.capabilities.join(' · ')}</p>
            <code>{entry.importPath}</code>
            <details className="aw-details">
              <summary>Contract v{entry.version} · requirements</summary>
              <p>
                This is the version of the component’s declared API, behavior, and token ownership.
                It is not a verification or approval badge.
              </p>
              <p>
                Source: <code>{entry.contract}</code>
              </p>
              <p>
                Evidence:{' '}
                {entry.provenance.reviewedBy
                  ? `Owner review recorded by ${entry.provenance.reviewedBy}.`
                  : 'No owner review recorded in this registry entry.'}
              </p>
            </details>
          </article>
        ))}
      </div>
      {!entries.length && (
        <p className="aw-empty">
          No registered capability matches. A new proposal must include a contract and evidence.
        </p>
      )}
      <div className="aw-section-divider">
        <div>
          <span className="aw-eyebrow">EXTENSION LAB</span>
          <h2>One name. Two interpretations.</h2>
          <p>These historical fixtures use registry revision 1 to demonstrate conflicting defaults. The current registry includes the consolidated experimental TokenInput.</p>
        </div>
        <Tag intent="warning">Proposals · not approved</Tag>
      </div>
      <div className="aw-proposal-grid">
        {proposals.slice(0, 2).map((proposal, index) => (
          <Card key={proposal.id}>
            <CardHeader>
              <span className="aw-eyebrow">PROPOSAL {index === 0 ? 'A' : 'B'}</span>
              <CardTitle>{proposal.name}</CardTitle>
              <CardDescription>{proposal.id} · illustrative fixture</CardDescription>
            </CardHeader>
            <CardContent>
              <TokenInput
                label={`Proposal ${index === 0 ? 'A' : 'B'} values`}
                values={index === 0 ? valuesA : valuesB}
                onValuesChange={index === 0 ? setValuesA : setValuesB}
                suggestions={['design', 'system', 'research', 'engineering']}
                duplicatePolicy={proposal.behavior.duplicatePolicy}
                commitKeys={proposal.behavior.commitKeys}
                commitOnBlur={proposal.behavior.commitOnBlur}
              />
              <div className="aw-proposal-contract">
                <span>Duplicate policy</span>
                <strong>{proposal.behavior.duplicatePolicy}</strong>
                <span>Commit on blur</span>
                <strong>{String(proposal.behavior.commitOnBlur)}</strong>
                <span>Commit keys</span>
                <strong>{proposal.behavior.commitKeys.join(' + ')}</strong>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <section className="aw-conflict-panel">
        <div>
          <Glyph kind="maintain" />
          <h3>
            {comparison.conflicts.length} behavior conflict
            {comparison.conflicts.length === 1 ? '' : 's'} detected
          </h3>
          <p>
            {comparison.recommendation === 'consolidate-after-owner-review'
              ? 'Both proposals serve the same purpose. Resolve their behavioral differences before consolidation.'
              : 'The proposals need a review of their component boundaries.'}
          </p>
        </div>
        <div className="aw-conflicts">
          {comparison.conflicts.map((conflict) => (
            <div key={conflict.field}>
              <code>{conflict.field}</code>
              <span>A: {String(conflict.left)}</span>
              <span>B: {String(conflict.right)}</span>
            </div>
          ))}
        </div>
        <Button emphasis="secondary" onClick={() => setShowPlan(!showPlan)}>
          {showPlan ? 'Hide' : 'Prepare'} consolidation plan
        </Button>
        {showPlan && (
          <div className="aw-plan" role="status">
            <h4>Historical example plan · not a pending release</h4>
            <p>
              Resolve the duplicate policy, supply passing tests and visual evidence, then record an
              explicit owner decision. This workbench does not mark either fixture approved.
            </p>
            <pre>{JSON.stringify(plan, null, 2)}</pre>
            <Button
              emphasis="ghost"
              onClick={() => downloadJson('token-input-consolidation-plan.json', plan)}
            >
              Export plan
            </Button>
          </div>
        )}
      </section>
    </>
  );
}

function MaintenanceWorkbench() {
  const exports = Object.keys(maintenance);
  return (
    <>
      <SectionIntro kicker="04 / MAINTENANCE" title="Keep change intentional.">
        Derived output can be repaired from its source. A change to meaning needs an impact plan and
        an explicit review decision.
      </SectionIntro>
      <MaintenanceInspector />
      <details className="aw-details">
        <summary>
          Available maintenance operations <span>{exports.length}</span>
        </summary>
        <pre>{exports.join('\n')}</pre>
      </details>
    </>
  );
}

function MaintenanceInspector() {
  const [evidence, setEvidence] = useState(maintenance.demoEvidence);
  const [json, setJson] = useState(JSON.stringify(maintenance.demoEvidence, null, 2));
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(1);
  const plan = maintenance.planMaintenance(evidence, {
    expectedRegistryRevision: registry.revision,
    maxAttempts: attempts,
  });
  function inspect() {
    try {
      const input: unknown = JSON.parse(json);
      if (!Array.isArray(input)) throw new Error('Evidence must be an array.');
      maintenance.planMaintenance(input as maintenance.MaintenanceEvidence[], {
        expectedRegistryRevision: registry.revision,
        maxAttempts: attempts,
      });
      setEvidence(input as maintenance.MaintenanceEvidence[]);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Invalid evidence.');
    }
  }
  return (
    <div className="aw-maintenance-grid">
      <section className="aw-maintenance-card">
        <h2>Evidence inspection</h2>
        <p>
          These examples are marked as fixtures. They demonstrate policy decisions and cannot
          authorize a repair.
        </p>
        {evidence.map((item) => (
          <article className="aw-maintenance-evidence" key={item.id}>
            <Tag intent={item.kind === 'derived-drift' ? 'function' : 'warning'}>{item.kind}</Tag>
            <p>{item.summary}</p>
            <small>
              {item.origin} · source revision {item.sourceRevision}
            </small>
          </article>
        ))}
        <details className="aw-details">
          <summary>Inspect supplied evidence JSON</summary>
          <p>
            Use output from a real local check. A declared origin is not proof of a passing check.
          </p>
          <Textarea
            label="Maintenance evidence JSON"
            rows={14}
            value={json}
            onValueChange={setJson}
            spellCheck={false}
          />
          <Button emphasis="secondary" onClick={inspect}>
            Validate and inspect
          </Button>
          {error && (
            <p className="aw-error" role="alert">
              {error}
            </p>
          )}
        </details>
      </section>
      <section className="aw-maintenance-card">
        <h2>Proposed maintenance plan</h2>
        <p>{plan.status.replaceAll('-', ' ')}</p>
        <Choice
          label="Maximum repair attempts"
          value={String(attempts)}
          values={['1', '2']}
          onChange={(value) => setAttempts(Number(value))}
        />
        <div className="aw-section-divider">
          <strong>{plan.automatic.length} eligible derived repairs</strong>
          <Tag intent="warning">{plan.review.length} review items</Tag>
        </div>
        {plan.review.map((item) => (
          <article className="aw-maintenance-evidence" key={item.evidenceId}>
            <strong>{item.evidenceId}</strong>
            <p>{item.reason}</p>
          </article>
        ))}
        {plan.automatic.map((item) => (
          <article className="aw-maintenance-evidence" key={item.evidenceId}>
            <strong>{item.artifact}</strong>
            <p>{item.operation}</p>
            <small>Plan only. No files have been changed.</small>
          </article>
        ))}
        <details className="aw-details">
          <summary>Protected boundaries</summary>
          <ul>
            {plan.prohibited.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p>Preserves: {plan.preserves.join(', ')}.</p>
        </details>
        <Button emphasis="secondary" onClick={() => downloadJson('maintenance-plan.json', plan)}>
          Export maintenance plan
        </Button>
      </section>
    </div>
  );
}
