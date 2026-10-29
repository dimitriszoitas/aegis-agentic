import { useId, useMemo, useRef, useState } from 'react';
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
import { Select } from '@/components/select';
import { Textarea } from '@/components/textarea';
import { Tag } from '@/components/tag';
import { createBrandPackage, previewBrandPackage, type ProfileChange } from './brand-package';
import {
  exportDtcg,
  inspectDtcg,
  previewDtcgImport,
  type DtcgProfileMapping,
} from './token-interchange';
import { configurations, type Configuration, type DesignProfile } from './profile';

export function downloadDesignJson(name: string, value: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2) + '\n'], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const tokenExample = {
  palette: {
    accent: {
      $type: 'color',
      $value: { colorSpace: 'srgb', components: [0.36, 0.25, 0.8], alpha: 1 },
    },
    brand: { $type: 'color', $value: '{palette.accent}' },
  },
};
const mappingFields = [
  'brand',
  'semantic.success',
  'semantic.warning',
  'semantic.danger',
  'semantic.info',
  'font',
  'radius',
] as const;

function Changes({ changes }: { changes: ProfileChange[] }) {
  return changes.length ? (
    <ul>
      {changes.map((change) => (
        <li key={change.field}>
          <strong>{change.field}</strong>: {change.before} → {change.after}
        </li>
      ))}
    </ul>
  ) : (
    <p>No profile changes.</p>
  );
}

/** JSON-only previews. Profile changes occur exclusively through the labelled Apply action. */
export function PortabilityPanel({
  profile,
  onApply,
}: {
  profile: DesignProfile;
  onApply: (profile: DesignProfile) => void;
}) {
  const fileInputId = useId();
  const fileReadVersion = useRef(0);
  const [source, setSource] = useState(() => JSON.stringify(createBrandPackage(profile), null, 2));
  const [kind, setKind] = useState<'brand' | 'tokens'>('brand');
  const [input, setInput] = useState<unknown>();
  const [parseError, setParseError] = useState('');
  const [mappings, setMappings] = useState<DtcgProfileMapping[]>([]);
  const [configuration, setConfiguration] = useState<Configuration>('fundamental.light');
  const [notice, setNotice] = useState('');
  const [exportIssues, setExportIssues] = useState<string[]>([]);
  const inspected = useMemo(
    () => (kind === 'tokens' && input !== undefined ? inspectDtcg(input) : undefined),
    [kind, input],
  );
  const preview = useMemo(
    () =>
      input === undefined
        ? undefined
        : kind === 'brand'
          ? previewBrandPackage(input, profile)
          : previewDtcgImport(input, profile, mappings),
    [input, kind, profile, mappings],
  );
  const candidate = preview?.valid ? preview.compiled?.profile : undefined;
  function inspect(text = source) {
    setNotice('');
    setParseError('');
    try {
      if (text.length > 8_000_000) throw new Error('Use a JSON document smaller than 8 MB.');
      setInput(JSON.parse(text));
    } catch (error) {
      setInput(undefined);
      setParseError(error instanceof Error ? error.message : 'Invalid JSON.');
    }
  }
  function replaceSource(text: string) {
    fileReadVersion.current += 1;
    setSource(text);
    setInput(undefined);
    setParseError('');
    setNotice('');
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Portable design language</CardTitle>
        <CardDescription>
          Move an Aegis brand between projects, or explicitly map external design tokens into your
          profile. Both light and dark stay included.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="aw-settings-group">
          <Field label="Import format">
            <Select
              aria-label="Import format"
              value={kind}
              onValueChange={(value) => {
                const next = value as 'brand' | 'tokens';
                setKind(next);
                setMappings([]);
                replaceSource(
                  JSON.stringify(
                    next === 'brand' ? createBrandPackage(profile) : tokenExample,
                    null,
                    2,
                  ),
                );
              }}
              options={[
                { value: 'brand', label: 'Aegis brand package' },
                { value: 'tokens', label: 'DTCG design tokens' },
              ]}
            />
          </Field>
          <Field id={fileInputId} label="Load JSON file">
            <input
              id={fileInputId}
              type="file"
              accept="application/json,.json"
              onChange={async (event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = '';
                if (!file) return;
                const readVersion = ++fileReadVersion.current;
                setInput(undefined);
                setParseError('');
                setNotice('');
                if (file.size > 8_000_000) {
                  setParseError('Use a JSON document smaller than 8 MB.');
                  return;
                }
                try {
                  const text = await file.text();
                  if (readVersion === fileReadVersion.current) replaceSource(text);
                } catch {
                  if (readVersion === fileReadVersion.current)
                    setParseError('This file could not be read.');
                }
              }}
            />
          </Field>
          <Textarea
            label="Import JSON"
            rows={8}
            value={source}
            onValueChange={replaceSource}
            spellCheck={false}
          />
          <Button emphasis="secondary" onClick={() => inspect()}>
            Preview import
          </Button>
          {parseError && <p role="alert">{parseError}</p>}
          {inspected && (
            <>
              <p>
                {inspected.tokens.length} tokens inspected. Map only the decisions you want to
                change. Unmapped profile fields remain as they are.
              </p>
              {mappingFields.map((field) => (
                <Field key={field} label={field}>
                  <Select
                    aria-label={`Map ${field}`}
                    value={mappings.find((item) => item.field === field)?.tokenPath ?? ''}
                    onValueChange={(tokenPath) =>
                      setMappings((current) => [
                        ...current.filter((item) => item.field !== field),
                        ...(tokenPath ? [{ field, tokenPath }] : []),
                      ])
                    }
                    options={[
                      { value: '', label: 'Keep current value' },
                      ...inspected.tokens.map((token) => ({
                        value: token.path,
                        label: `${token.path} (${token.type})`,
                      })),
                    ]}
                  />
                </Field>
              ))}
            </>
          )}
          {preview && (
            <section aria-label="Import preview">
              <Tag intent={preview.valid ? 'success' : 'warning'}>
                {preview.valid ? 'Ready to apply' : 'Needs attention'}
              </Tag>
              <Changes changes={preview.changes} />
              {preview.issues.length > 0 && (
                <ul>
                  {preview.issues.map((issue, index) => (
                    <li key={`${issue.code}-${index}`}>
                      {issue.severity}: {issue.message}
                    </li>
                  ))}
                </ul>
              )}
              {preview.compiled && (
                <p>
                  Compiled for all four theme/mode combinations. {preview.compiled.contrast.length}{' '}
                  static contrast pairs checked; rendered review remains necessary.
                </p>
              )}
              <Button
                disabled={!candidate || preview.changes.length === 0}
                onClick={() => {
                  if (candidate) {
                    onApply(candidate);
                    setNotice('Design profile applied.');
                    setInput(undefined);
                  }
                }}
              >
                Apply reviewed changes
              </Button>
            </section>
          )}
          {notice && <p role="status">{notice}</p>}
        </div>
      </CardContent>
      <CardFooter>
        <div className="aw-settings-group">
          <Button
            emphasis="secondary"
            onClick={() =>
              downloadDesignJson(`${profile.id}.brand.json`, createBrandPackage(profile))
            }
          >
            Download brand package
          </Button>
          <Field label="Token export theme">
            <Select
              aria-label="Token export theme"
              value={configuration}
              onValueChange={(value) => setConfiguration(value as Configuration)}
              options={configurations.map((value) => ({ value, label: value }))}
            />
          </Field>
          <Button
            emphasis="secondary"
            onClick={() => {
              const bundle = exportDtcg(profile);
              setExportIssues(bundle.issues.map((issue) => `${issue.path}: ${issue.message}`));
              downloadDesignJson(
                `${profile.id}.${configuration}.tokens.json`,
                bundle.documents[configuration],
              );
            }}
          >
            Download DTCG tokens
          </Button>
          <p>
            Token export supports a documented DTCG subset. Unsupported expressions stay in
            extension metadata and are listed below; the brand package preserves the complete Aegis
            profile.
          </p>
          {exportIssues.length > 0 && (
            <details>
              <summary>{exportIssues.length} token export notices</summary>
              <p>
                Showing the first 30. The token file retains all omitted expressions in its
                extension metadata.
              </p>
              <ul>
                {exportIssues.slice(0, 30).map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
