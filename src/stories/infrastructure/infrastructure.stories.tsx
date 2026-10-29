import { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '@/components/button';
import { PortabilityPanel } from '@/agentic/portability-panel';
import { RecipePanel } from '@/agentic/recipe-panel';
import { compileProfile, designProfiles } from '@/agentic/profile';
import '@/agentic/workbench.css';

function PortableBrandExample({ layoutTheme }: { layoutTheme: string }) {
  const [profile, setProfile] = useState(designProfiles[0]);
  const compiled = useMemo(() => compileProfile(profile), [profile]);
  return (
    <div className="aw-settings-group">
      <PortabilityPanel profile={profile} onApply={setProfile} />
      <section
        aria-label="Applied brand preview"
        data-agentic-profile={profile.id}
        data-layout-theme={layoutTheme}
      >
        <style>{compiled.css}</style>
        <p>
          Applied profile: <strong>{profile.name}</strong> · {profile.brand} · {profile.radius}{' '}
          corners
        </p>
        <Button intent="function">Brand preview</Button>
      </section>
    </div>
  );
}
const meta = {
  title: 'Agentic Tools/Design Infrastructure',
  parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const BrandPackages: Story = {
  name: 'Brand packages & token exchange',
  render: (_, context) => (
    <PortableBrandExample
      layoutTheme={
        context.globals.layoutTheme === 'fundamental-floating'
          ? 'fundamental-floating'
          : 'fundamental'
      }
    />
  ),
};
export const ProjectRecipes: Story = {
  name: 'Project recipes & discovery',
  render: () => <RecipePanel />,
};
