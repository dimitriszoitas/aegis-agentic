import { useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { DocsContext } from '@storybook/addon-docs/blocks';
import { UPDATE_GLOBALS } from 'storybook/internal/core-events';
import { Button } from '@/components/button';
import { Popover } from '@/components/popover';
import { TextInput } from '@/components/text-input';
import {
  defaultLayoutTheme,
  layoutThemeOptions,
  normalizeLayoutTheme,
  type LayoutTheme,
} from '@/lib/layout-theme';

export function SwitchingSpecimen({
  layout,
  onLayoutChange,
  value,
  onValueChange,
}: {
  layout: LayoutTheme;
  onLayoutChange: (theme: LayoutTheme) => void;
  value?: string;
  onValueChange?: (value: string) => void;
}) {
  const [localDraft, setLocalDraft] = useState('');
  const draft = value ?? localDraft;
  return (
    <div className="stack story-pad sb-unstyled" style={{ maxWidth: 'var(--size-600)' }}>
      <h3>Presentation without losing your place</h3>
      <div className="row" role="group" aria-label="Presentation">
        {layoutThemeOptions.map(({ value, label }) => (
          <Button
            key={value}
            emphasis="secondary"
            aria-pressed={layout === value}
            onClick={() => onLayoutChange(value)}
          >
            {label}
          </Button>
        ))}
      </div>
      <TextInput label="Draft name" value={draft} onValueChange={onValueChange ?? setLocalDraft} />
      <Popover
        title="Preview details"
        trigger={<Button emphasis="tertiary">Open preview panel</Button>}
        showClose
      >
        <p>The portaled panel follows the active presentation and color theme.</p>
        <p>Draft: {draft || 'Untitled'}</p>
      </Popover>
    </div>
  );
}

// Storybook remounts the MDX subtree when globals change. Keep the editable docs
// draft in this preview's memory so changing presentation cannot discard it.
let docsDraft = '';
const draftListeners = new Set<() => void>();
const readDraft = () => docsDraft;
function subscribeToDraft(listener: () => void) {
  draftListeners.add(listener);
  return () => {
    draftListeners.delete(listener);
  };
}
function updateDraft(value: string) {
  docsDraft = value;
  draftListeners.forEach((listener) => listener());
}

export function ThemeSwitchingPreview() {
  const context = useContext(DocsContext);
  const draft = useSyncExternalStore(subscribeToDraft, readDraft, readDraft);
  const [layout, setLayout] = useState<LayoutTheme>(
    () => normalizeLayoutTheme(document.documentElement.dataset.layoutTheme) ?? defaultLayoutTheme,
  );
  useEffect(() => {
    const update = () =>
      setLayout(
        normalizeLayoutTheme(document.documentElement.dataset.layoutTheme) ?? defaultLayoutTheme,
      );
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-layout-theme'],
    });
    return () => observer.disconnect();
  }, []);
  return (
    <SwitchingSpecimen
      value={draft}
      onValueChange={updateDraft}
      layout={layout}
      onLayoutChange={(layoutTheme) =>
        context.channel.emit(UPDATE_GLOBALS, { globals: { layoutTheme } })
      }
    />
  );
}
