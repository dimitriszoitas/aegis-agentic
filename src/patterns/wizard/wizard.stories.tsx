import { useArgs } from 'storybook/preview-api';
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Play, ShieldCheck } from '@/components/icon';
import { Wizard, type WizardStep } from './wizard';
import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { EmptyState } from '@/components/empty-state';
import { Field } from '@/components/field';
import { TextInput } from '@/components/text-input';
import { Textarea } from '@/components/textarea';

const meta = {
  id: 'patterns-wizard-project-setup',
  title: 'Patterns/Workflows/Project setup wizard',
  component: Wizard,
  tags: ['autodocs'],
} satisfies Meta<typeof Wizard>;
export default meta;
const initialLogic = `selection:
  task_status: ready
  assignee: project_owner
condition: selection`;

function ProjectSetup({ orientation = 'horizontal' }: { orientation?: 'horizontal' | 'vertical' }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [name, setName] = useState('Customer portal redesign');
  const [description, setDescription] = useState(
    'Create a shared project space for redesigning the customer portal, planning milestones, and reviewing deliverables.',
  );
  const [logic, setLogic] = useState(initialLogic);
  const [tested, setTested] = useState(false);
  const [testing, setTesting] = useState(false);
  const [approved, setApproved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [finished, setFinished] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  async function previewWorkflow() {
    setTesting(true);
    await new Promise((resolve) => setTimeout(resolve, 550));
    setTested(true);
    setTesting(false);
  }
  function restart() {
    setCurrentStep(0);
    setFinished(false);
    setCancelled(false);
    setDirty(false);
    setTested(false);
    setApproved(false);
  }
  const steps: WizardStep[] = [
    {
      id: 'define',
      title: 'Define',
      description: 'Describe the project',
      validate: () =>
        name.trim().length >= 8 && description.trim().length >= 20
          ? true
          : 'Add a descriptive project name (at least 8 characters) and a description (at least 20 characters).',
      content: (
        <div className="stack">
          <Field
            label="Project name"
            required
            helpText="Use a clear name that helps team members understand the project’s purpose."
          >
            <TextInput
              value={name}
              onValueChange={(value) => {
                setName(value);
                setDirty(true);
              }}
            />
          </Field>
          <Field label="Description" required>
            <Textarea
              value={description}
              onValueChange={(value) => {
                setDescription(value);
                setDirty(true);
              }}
              rows={3}
              maxLength={500}
              showCount
            />
          </Field>
          <Banner intent="info">
            This example keeps project changes in the current preview session.
          </Banner>
        </div>
      ),
    },
    {
      id: 'logic',
      title: 'Workflow',
      description: 'Set the starting conditions',
      validate: async () => {
        await new Promise((resolve) => setTimeout(resolve, 400));
        return logic.includes('condition:') && logic.includes('selection:')
          ? true
          : 'The workflow must include a selection and a condition before it can be previewed.';
      },
      content: (
        <div className="stack">
          <Field
            label="Workflow configuration"
            required
            helpText="Define which tasks belong in the project’s initial workflow. This example checks the required configuration fields only."
          >
            <Textarea
              value={logic}
              onValueChange={(value) => {
                setLogic(value);
                setTested(false);
                setApproved(false);
                setDirty(true);
              }}
              rows={8}
              textareaClassName="mono"
            />
          </Field>
          <Banner intent="warning" title="Review the starting workflow">
            Check the initial task status and assignment before creating the project. The preview
            uses illustrative tasks and does not run automation.
          </Banner>
        </div>
      ),
    },
    {
      id: 'test',
      title: 'Preview',
      description: 'Review sample tasks',
      validate: () => tested || 'Open the sample workflow preview before continuing.',
      content: (
        <div className="stack">
          <p className="muted">
            Review a fixed set of three sample tasks to see how the project workflow could look. No
            tasks are created or changed by this preview.
          </p>
          <div>
            <Button
              intent="function"
              emphasis="secondary"
              leadingIcon={<Play size={15} />}
              loading={testing}
              onClick={previewWorkflow}
            >
              {tested ? 'Preview again' : 'Preview workflow'}
            </Button>
          </div>
          {tested && (
            <Banner intent="success" title="Preview ready: 3 sample tasks">
              Plan the kickoff, review the requirements, and prepare the first milestone. These
              illustrative tasks are assigned to the project owner.
            </Banner>
          )}
          <div className="surface">
            <p className="muted" style={{ marginBottom: 'var(--space-2)' }}>
              Sample task
            </p>
            <code
              style={{
                whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere',
                fontSize: 'var(--text-xs)',
              }}
            >
              TASK-001 · Plan the kickoff · Ready · Project owner
            </code>
          </div>
        </div>
      ),
    },
    {
      id: 'review',
      title: 'Review and create',
      description: 'Confirm the project',
      validate: () =>
        approved || 'Confirm that you reviewed the project settings and sample tasks.',
      content: (
        <div className="stack">
          <dl
            className="surface"
            style={{
              margin: 0,
              display: 'grid',
              gridTemplateColumns: '140px 1fr',
              gap: 'var(--space-3)',
            }}
          >
            <dt className="muted">Project name</dt>
            <dd style={{ margin: 0 }}>{name}</dd>
            <dt className="muted">Workflow</dt>
            <dd style={{ margin: 0 }}>Ready tasks</dd>
            <dt className="muted">Assignment</dt>
            <dd style={{ margin: 0 }}>Project owner</dd>
            <dt className="muted">Preview</dt>
            <dd style={{ margin: 0 }}>3 illustrative tasks</dd>
          </dl>
          <Checkbox
            checked={approved}
            onCheckedChange={(value) => {
              setApproved(value === true);
              setDirty(true);
            }}
            label="I reviewed the project settings and sample tasks"
            description="Creating this project completes the example in the current preview session."
          />
        </div>
      ),
    },
  ];
  if (finished || cancelled)
    return (
      <div className="surface" style={{ maxWidth: 900 }}>
        <EmptyState
          icon={<ShieldCheck size={25} />}
          title={finished ? 'Project created' : 'Setup cancelled'}
          description={
            finished
              ? `${name} is ready in this example. No external project or tasks were created.`
              : 'The unfinished project setup was discarded. Existing projects were not changed.'
          }
          action={
            <Button intent="function" onClick={restart}>
              Create another project
            </Button>
          }
        />
      </div>
    );
  return (
    <Wizard
      title="Create project"
      description="Define the project, preview its starting workflow, and review the setup."
      steps={steps}
      currentStep={currentStep}
      onStepChange={(step) => {
        setCurrentStep(step);
        setDirty(true);
      }}
      onFinish={async () => {
        await new Promise((resolve) => setTimeout(resolve, 450));
        setDirty(false);
        setFinished(true);
      }}
      onCancel={() => {
        setDirty(false);
        setCancelled(true);
      }}
      dirty={dirty}
      finishLabel="Create project"
      orientation={orientation}
    />
  );
}
export const GuidedSetup: StoryObj = { render: () => <ProjectSetup /> };
export const VerticalLayout: StoryObj = { render: () => <ProjectSetup orientation="vertical" /> };
export const ValidationAndDirtyGuard: StoryObj = {
  render: () => (
    <div className="stack">
      <Banner title="Try the validation and exit guard">
        Clear the project name and continue to see validation. Edit any field, then select Cancel to
        choose whether to discard your changes.
      </Banner>
      <ProjectSetup />
    </div>
  ),
};

interface WizardPlaygroundOptions {
  title: string;
  description: string;
  orientation: 'horizontal' | 'vertical';
  currentStep: number;
  dirty: boolean;
  projectName: string;
  notifications: boolean;
  validateName: boolean;
  showStepDescriptions: boolean;
  finishLabel: string;
  cancelLabel: string;
}
function WizardPlaygroundExample({
  onOptionsChange,
  ...args
}: WizardPlaygroundOptions & {
  onOptionsChange: (options: Partial<WizardPlaygroundOptions>) => void;
}) {
  const [result, setResult] = useState('');
  const steps: WizardStep[] = [
    {
      id: 'details',
      title: 'Project details',
      description: args.showStepDescriptions ? 'Name the project' : undefined,
      validate: () =>
        !args.validateName ||
        args.projectName.trim().length >= 3 ||
        'Use at least three characters for the project name.',
      content: (
        <Field label="Project name" required={args.validateName}>
          <TextInput
            value={args.projectName}
            onValueChange={(projectName) => onOptionsChange({ projectName, dirty: true })}
          />
        </Field>
      ),
    },
    {
      id: 'updates',
      title: 'Team updates',
      description: args.showStepDescriptions ? 'Choose notifications' : undefined,
      content: (
        <Checkbox
          label="Enable project notifications"
          description="Send updates when milestones change."
          checked={args.notifications}
          onCheckedChange={(checked) =>
            onOptionsChange({ notifications: checked === true, dirty: true })
          }
        />
      ),
    },
    {
      id: 'review',
      title: 'Review',
      description: args.showStepDescriptions ? 'Confirm the setup' : undefined,
      content: (
        <div className="stack">
          <p>
            <strong>{args.projectName || 'Unnamed project'}</strong>
          </p>
          <p className="muted">
            Notifications {args.notifications ? 'enabled' : 'disabled'}. Completing this example
            updates only the preview.
          </p>
        </div>
      ),
    },
  ];
  return (
    <div className="stack" style={{ width: '100%', maxWidth: 1040 }}>
      <Wizard
        title={args.title}
        description={args.description}
        steps={steps}
        currentStep={Math.max(0, Math.min(2, args.currentStep))}
        onStepChange={(currentStep) => onOptionsChange({ currentStep })}
        orientation={args.orientation}
        dirty={args.dirty}
        finishLabel={args.finishLabel}
        cancelLabel={args.cancelLabel}
        onFinish={() => {
          onOptionsChange({ dirty: false });
          setResult(`${args.projectName} created in this preview.`);
        }}
        onCancel={() => {
          onOptionsChange({ dirty: false, currentStep: 0 });
          setResult('Setup cancelled.');
        }}
      />
      {result && <p role="status">{result}</p>}
    </div>
  );
}

export const Playground: StoryObj<WizardPlaygroundOptions> = {
  args: {
    title: 'Create project',
    description: 'Set up a shared space for your team.',
    orientation: 'vertical',
    currentStep: 0,
    dirty: false,
    projectName: 'Customer portal',
    notifications: true,
    validateName: true,
    showStepDescriptions: true,
    finishLabel: 'Create project',
    cancelLabel: 'Cancel',
  },
  argTypes: {
    title: { control: 'text' },
    description: { control: 'text' },
    orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
    currentStep: { control: { type: 'range', min: 0, max: 2, step: 1 } },
    dirty: { control: 'boolean' },
    projectName: { control: 'text' },
    notifications: { control: 'boolean' },
    validateName: { control: 'boolean' },
    showStepDescriptions: { control: 'boolean' },
    finishLabel: { control: 'text' },
    cancelLabel: { control: 'text' },
  },
  render: function WizardPlayground(args) {
    const [, updateArgs] = useArgs();
    return <WizardPlaygroundExample {...args} onOptionsChange={updateArgs} />;
  },
};
