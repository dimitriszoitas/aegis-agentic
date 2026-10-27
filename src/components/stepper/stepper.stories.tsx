import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stepper, type StepperStep } from './stepper';
import { Button } from '@/components/button';
const steps: StepperStep[] = [
  { id: 'define', title: 'Define', description: 'Name and describe the project' },
  { id: 'logic', title: 'Logic', description: 'Configure the project workflow' },
  { id: 'test', title: 'Test', description: 'Preview the starting tasks' },
  { id: 'review', title: 'Review and create', description: 'Approve the project setup' },
];
const meta = {
  id: 'components-navigation-stepper',
  title: 'Components/Navigation/Stepper',
  component: Stepper,
  tags: ['autodocs'],
  args: { steps, currentStep: 1 },
} satisfies Meta<typeof Stepper>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Orientations: Story = {
  render: () => (
    <div className="stack" style={{ gap: 'var(--space-10)' }}>
      <div className="story-layout">
        <Stepper steps={steps} currentStep={1} />
      </div>
      <div className="story-layout" style={{ maxWidth: 400 }}>
        <Stepper steps={steps} currentStep={2} orientation="vertical" />
      </div>
    </div>
  ),
};
export const AllStates: Story = {
  args: {
    steps: steps.map((step, index) => ({
      ...step,
      state: (['complete', 'current', 'error', 'upcoming'] as const)[index],
    })),
    currentStep: 1,
  },
};
function InteractiveDemo() {
  const [currentStep, setCurrentStep] = useState(2);
  return (
    <div className="story-layout stack">
      <Stepper steps={steps} currentStep={currentStep} onStepChange={setCurrentStep} />
      <div className="between" style={{ marginTop: 'var(--space-6)' }}>
        <p className="muted" style={{ margin: 0 }}>
          Use arrow keys to move between completed steps, then Enter to revisit.
        </p>
        <Button
          intent="function"
          onClick={() => setCurrentStep((current) => (current === 3 ? 0 : current + 1))}
        >
          {currentStep === 3 ? 'Start again' : 'Complete step'}
        </Button>
      </div>
    </div>
  );
}
export const CompletedStepNavigation: Story = { render: () => <InteractiveDemo /> };
