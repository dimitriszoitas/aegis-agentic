import { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { loadAnatomyDefinition } from './registry';
import type { AnatomyDefinition } from './types';
import './anatomy.css';

function AnatomySpecimen({ componentId }: { componentId: string }) {
  const [definition, setDefinition] = useState<AnatomyDefinition>();
  useEffect(() => {
    let active = true;
    setDefinition(undefined);
    void loadAnatomyDefinition(componentId).then((next) => {
      if (active) setDefinition(next);
    });
    return () => {
      active = false;
    };
  }, [componentId]);
  if (!definition) return <p>Loading component anatomy…</p>;
  return (
    <div
      className="anatomy-fixture"
      data-anatomy-definition={JSON.stringify({
        componentId,
        parts: definition.parts,
        height: definition.height ?? 320,
        note: definition.note,
      })}
      style={{ minHeight: definition.height ?? 320 }}
    >
      <div className="anatomy-fixture-content">{definition.render()}</div>
    </div>
  );
}

const meta = {
  title: 'Documentation/Anatomy specimen',
  component: AnatomySpecimen,
  tags: ['!dev', '!autodocs', '!test'],
  parameters: { layout: 'fullscreen', a11y: { disable: true } },
} satisfies Meta<typeof AnatomySpecimen>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Specimen: Story = { args: { componentId: 'components-actions-button' } };
