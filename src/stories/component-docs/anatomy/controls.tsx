import { useState, type CSSProperties, type ReactNode } from 'react';
import { Button } from '@/components/button';
import { ButtonGroup } from '@/components/button-group';
import { CopyButton } from '@/components/copy-button';
import { IconButton } from '@/components/icon-button';
import { Link } from '@/components/link';
import { SplitButton } from '@/components/split-button';
import { Avatar, AvatarGroup } from '@/components/avatar';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/card';
import { Checkbox } from '@/components/checkbox';
import { CopyableField } from '@/components/copyable-field';
import { CountBadge } from '@/components/count-badge';
import { DatePicker } from '@/components/date-picker';
import { ExpandableText } from '@/components/expandable-text';
import { Field } from '@/components/field';
import { FileUpload, type FileUploadItem } from '@/components/file-upload';
import { Kbd } from '@/components/kbd';
import { MultiCombobox } from '@/components/multi-combobox';
import { RadioGroup } from '@/components/radio-group';
import { SearchInput } from '@/components/search-input';
import { SegmentedControl } from '@/components/segmented-control';
import { Select, type SelectOption } from '@/components/select';
import { Separator } from '@/components/separator';
import { SeverityBadge } from '@/components/severity-badge';
import { Slider } from '@/components/slider';
import { StatusBadge } from '@/components/status-badge';
import { Switch } from '@/components/switch';
import { Tag } from '@/components/tag';
import { TextInput } from '@/components/text-input';
import { Textarea } from '@/components/textarea';
import { TimeRangePicker } from '@/components/time-range-picker';
import { TreeView } from '@/components/tree-view';
import {
  ArrowRight,
  CalendarDays,
  Check,
  Download,
  FileCode2,
  Folder,
  Link2,
  List,
  Search,
  Settings,
  UserRound,
} from '@/components/icon';
import type { AnatomyPart, AnatomyRegistry } from './types';

function Frame({
  name,
  children,
  width = 480,
  style,
}: {
  name: string;
  children: ReactNode;
  width?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      data-anatomy={name}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 'var(--space-6)',
        width,
        maxWidth: '100%',
        padding: 'var(--space-8)',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function part(
  selector: string,
  name: string,
  description: string,
  anchor?: AnatomyPart['anchor'],
): AnatomyPart {
  return { selector, name, description, anchor };
}

const sources: SelectOption[] = [
  {
    value: 'projects',
    label: 'Project tracker',
    description: 'Milestones, tasks, and delivery progress',
    icon: <Folder size={16} />,
    group: 'Workspace',
  },
  {
    value: 'customers',
    label: 'Customer directory',
    description: 'Account contacts and ownership',
    icon: <UserRound size={16} />,
    group: 'Workspace',
  },
  {
    value: 'billing',
    label: 'Billing platform',
    description: 'Invoices and payment schedules',
    icon: <FileCode2 size={16} />,
    group: 'Connected services',
  },
];

function UploadSpecimen() {
  const [files, setFiles] = useState<FileUploadItem[]>(() => [
    {
      id: 'brief',
      file: new File(['Project scope and delivery milestones.'], 'project-brief.pdf', {
        type: 'application/pdf',
      }),
      status: 'uploading',
      progress: 56,
    },
    {
      id: 'plan',
      file: new File(['Milestone,Owner\nReview,Alex'], 'delivery-plan.csv', { type: 'text/csv' }),
      status: 'error',
      error: 'Connection interrupted. Retry this file.',
    },
  ]);
  return (
    <Frame name="upload" width={620}>
      <FileUpload
        label="Project attachments"
        description="Drop a project brief or delivery plan here."
        accept=".pdf,.csv"
        value={files}
        onValueChange={setFiles}
        onUpload={async (_file, { onProgress }) => onProgress(100)}
        style={{ width: '100%' }}
      />
    </Frame>
  );
}

/** Direct component specimens for controls; each selector targets a visible rendered part. */
export const controlAnatomy: AnatomyRegistry = {
  'components-actions-button': {
    render: () => (
      <Frame name="button">
        <Button leadingIcon={<Download size={16} />} trailingIcon={<ArrowRight size={16} />}>
          Export report
        </Button>
        <Button loading leadingIcon={<Download size={16} />}>
          Preparing export
        </Button>
      </Frame>
    ),
    note: 'The second button shows loading, which replaces the leading icon and disables activation.',
    parts: [
      part(
        '[data-anatomy="button"] > button:first-child',
        'Action surface',
        'The native button owns its hit area, intent, emphasis, size, and focus state.',
        'top-left',
      ),
      part(
        '[data-anatomy="button"] > button:first-child .button-icon:first-child',
        'Leading icon',
        'Optional visual cue before the action label.',
        'left',
      ),
      part(
        '[data-anatomy="button"] > button:first-child .button-label',
        'Action label',
        'The visible name describes what activation does.',
        'top',
      ),
      part(
        '[data-anatomy="button"] > button:first-child .button-icon:last-child',
        'Trailing icon',
        'Optional directional or supplementary cue after the label.',
        'right',
      ),
      part(
        '[data-anatomy="button"] .button-spinner',
        'Loading indicator',
        'Replaces the leading icon while the button reports busy state.',
        'left',
      ),
    ],
  },
  'components-actions-buttongroup': {
    render: () => (
      <Frame name="button-group">
        <ButtonGroup aria-label="Record display density">
          <Button emphasis="secondary" aria-pressed={false}>
            Compact
          </Button>
          <Button emphasis="secondary" aria-pressed>
            Default
          </Button>
          <Button emphasis="secondary" aria-pressed={false}>
            Comfortable
          </Button>
        </ButtonGroup>
      </Frame>
    ),
    parts: [
      part(
        '[data-anatomy="button-group"] .button-group',
        'Named group',
        'Joins related buttons visually and exposes their shared purpose.',
        'top-left',
      ),
      part(
        '[data-anatomy="button-group"] button:first-child',
        'First action',
        'Retains its own native button behavior and outer leading corners.',
        'left',
      ),
      part(
        '[data-anatomy="button-group"] button[aria-pressed="true"]',
        'Selected action',
        'The child owns pressed state; the group does not implement selection logic.',
        'top',
      ),
      part(
        '[data-anatomy="button-group"] button:last-child',
        'Last action',
        'Completes the group while retaining a separate keyboard stop.',
        'right',
      ),
    ],
  },
  'components-actions-copybutton': {
    render: () => (
      <Frame name="copy-button">
        <CopyButton text="PRJ-0042" aria-label="Copy project ID" size="lg" tooltip={false} />
      </Frame>
    ),
    parts: [
      part(
        '[data-anatomy="copy-button"] button',
        'Copy action',
        'A named IconButton writes the supplied text to the clipboard.',
        'top-left',
      ),
      part(
        '[data-anatomy="copy-button"] .button-label > svg',
        'Feedback icon',
        'The copy symbol changes to a check only after clipboard writing succeeds.',
        'right',
      ),
    ],
  },
  'components-actions-iconbutton': {
    render: () => (
      <Frame name="icon-button">
        <IconButton aria-label="Workspace settings" emphasis="tertiary" size="lg">
          <Settings size={20} />
        </IconButton>
      </Frame>
    ),
    parts: [
      part(
        '[data-anatomy="icon-button"] button',
        'Named hit area',
        'The required aria-label names the action and also supplies its default tooltip.',
        'top-left',
      ),
      part(
        '[data-anatomy="icon-button"] .button-label > svg',
        'Action icon',
        'A familiar symbol communicates the action visually without replacing its accessible name.',
        'right',
      ),
    ],
  },
  'components-actions-link': {
    render: () => (
      <Frame name="link">
        <Link
          href="https://example.com/project-guide"
          external
          leadingIcon={<FileCode2 size={16} />}
        >
          Read the project guide
        </Link>
      </Frame>
    ),
    parts: [
      part(
        '[data-anatomy="link"] a',
        'Navigation anchor',
        'A native link carries the destination and safe new-tab behavior.',
        'top-left',
      ),
      part(
        '[data-anatomy="link"] .aegis-link-icon:first-child',
        'Leading icon',
        'Optional context about the destination.',
        'left',
      ),
      part(
        '[data-anatomy="link"] .aegis-link-label',
        'Destination label',
        'Names the destination and carries the configured underline treatment.',
        'bottom',
      ),
      part(
        '[data-anatomy="link"] .aegis-link-icon:nth-last-child(2)',
        'External indicator',
        'Marks a new-tab destination, which also has a screen-reader announcement.',
        'right',
      ),
    ],
  },
  'components-actions-splitbutton': {
    render: () => (
      <Frame name="split-button">
        <SplitButton
          leadingIcon={<Download size={16} />}
          onAction={() => undefined}
          menuLabel="Other export formats"
          actions={[
            {
              id: 'csv',
              label: 'Export CSV',
              icon: <Download size={16} />,
              onSelect: () => undefined,
            },
            {
              id: 'json',
              label: 'Export JSON',
              icon: <FileCode2 size={16} />,
              onSelect: () => undefined,
            },
          ]}
        >
          Export report
        </SplitButton>
        <SplitButton loading onAction={() => undefined} actions={[]}>
          Preparing report
        </SplitButton>
      </Frame>
    ),
    note: 'The companion loading instance shows both segments unavailable during the same operation.',
    parts: [
      part(
        '[data-anatomy="split-button"] .aegis-split-button:first-child .aegis-split-button-controls',
        'Action group',
        'Keeps the default action and its alternatives in one named group.',
        'top-left',
      ),
      part(
        '[data-anatomy="split-button"] [data-split-action="primary"]',
        'Primary action',
        'Runs the most frequent action directly.',
        'left',
      ),
      part(
        '[data-anatomy="split-button"] [data-split-action="primary"] .button-icon',
        'Action icon',
        'Optional cue shared with the primary action label.',
        'bottom-left',
      ),
      part(
        '[data-anatomy="split-button"] [data-split-action="menu"]',
        'Alternatives trigger',
        'A separate button opens related actions in a keyboard-operable menu.',
        'right',
      ),
      part(
        '[data-anatomy="split-button"] .button-loading',
        'Pending feedback',
        'Shows progress while both action segments are disabled.',
        'bottom',
      ),
    ],
  },
  'components-forms-field': {
    render: () => (
      <Frame name="field" style={{ alignItems: 'stretch' }}>
        <Field label="Project name" required helpText="Use a name your team can recognize.">
          <TextInput defaultValue="Customer portal" />
        </Field>
        <Field
          label="Project identifier"
          required
          helpText="Use letters, numbers, and hyphens."
          error="This identifier is already in use."
        >
          <TextInput defaultValue="customer-portal" />
        </Field>
      </Frame>
    ),
    height: 360,
    note: 'The second field adds a validation error while keeping the helper text and label relationship.',
    parts: [
      part(
        '[data-anatomy="field"] .aegis-field:first-child .aegis-field-label',
        'Field label',
        'Names the control and activates it through the shared ID.',
        'left',
      ),
      part(
        '[data-anatomy="field"] .aegis-field:first-child .aegis-field-marker',
        'Required marker',
        'Includes both a visible asterisk and an accessible required description.',
        'right',
      ),
      part(
        '[data-anatomy="field"] .aegis-field:first-child .aegis-input-shell',
        'Control slot',
        'The compatible child receives label, help, disabled, and invalid metadata.',
        'right',
      ),
      part(
        '[data-anatomy="field"] .aegis-field:first-child .aegis-field-help',
        'Helper text',
        'Persistent guidance is included in the control description.',
        'bottom-left',
      ),
      part(
        '[data-anatomy="field"] .aegis-field-error',
        'Validation message',
        'An actionable error is announced and marks the control invalid.',
        'left',
      ),
    ],
  },
  'components-forms-textinput': {
    render: () => (
      <Frame name="text-input" style={{ alignItems: 'stretch' }}>
        <TextInput
          label="Workspace address"
          defaultValue="northstar"
          prefix={<Link2 size={16} aria-hidden />}
          suffix={<span>.example.com</span>}
          clearable
          clearLabel="Clear workspace address"
        />
      </Frame>
    ),
    parts: [
      part(
        '[data-anatomy="text-input"] .aegis-field-label',
        'Standalone label',
        'Associates visible text with the native input when no Field wrapper is needed.',
        'left',
      ),
      part(
        '[data-anatomy="text-input"] .aegis-input-shell',
        'Input shell',
        'Contains the input and its optional adornments at the chosen control height.',
        'top-right',
      ),
      part(
        '[data-anatomy="text-input"] .aegis-input-prefix',
        'Prefix slot',
        'Provides context before the editable value.',
        'left',
      ),
      part(
        '[data-anatomy="text-input"] .aegis-input-native',
        'Editable value',
        'The native input owns text entry, selection, and form attributes.',
        'bottom',
      ),
      part(
        '[data-anatomy="text-input"] .aegis-input-clear',
        'Clear action',
        'Clears the value and returns focus to the input.',
        'top',
      ),
      part(
        '[data-anatomy="text-input"] .aegis-input-suffix',
        'Suffix slot',
        'Shows a stable unit or value ending outside the editable text.',
        'right',
      ),
    ],
  },
  'components-forms-searchinput': {
    render: () => (
      <Frame name="search-input" style={{ alignItems: 'stretch' }}>
        <SearchInput label="Search projects" defaultValue="Customer portal" shortcut="⌘K" />
      </Frame>
    ),
    parts: [
      part(
        '[data-anatomy="search-input"] .aegis-field-label',
        'Search label',
        'Names the collection or content being searched.',
        'left',
      ),
      part(
        '[data-anatomy="search-input"] .aegis-input-prefix',
        'Search icon',
        'Identifies the field as a search control.',
        'left',
      ),
      part(
        '[data-anatomy="search-input"] input',
        'Query input',
        'Emits immediate draft changes and optionally debounced searches.',
        'bottom',
      ),
      part(
        '[data-anatomy="search-input"] .aegis-input-clear',
        'Clear query',
        'Removes the current query without leaving the field.',
        'top',
      ),
      part(
        '[data-anatomy="search-input"] .aegis-search-shortcut',
        'Shortcut hint',
        'Displays a host-implemented shortcut without registering one itself.',
        'right',
      ),
    ],
  },
  'components-forms-textarea': {
    render: () => (
      <Frame name="textarea" style={{ alignItems: 'stretch' }}>
        <Field label="Project handoff" required helpText="Include the decision and the next owner.">
          <Textarea
            defaultValue="The customer portal is ready for review. Alex will confirm the account settings before the next milestone."
            rows={3}
            autoGrow
            maxRows={5}
            showCount
            maxLength={500}
          />
        </Field>
      </Frame>
    ),
    parts: [
      part(
        '[data-anatomy="textarea"] .aegis-field-label',
        'Field label',
        'Names the multiline input and shows its requirement.',
        'left',
      ),
      part(
        '[data-anatomy="textarea"] .aegis-textarea-native',
        'Multiline value',
        'The native textarea grows within its row bounds and supports normal text selection.',
        'right',
      ),
      part(
        '[data-anatomy="textarea"] .aegis-textarea-count',
        'Character counter',
        'Reports the current length and optional maximum, and is associated with the field.',
        'right',
      ),
      part(
        '[data-anatomy="textarea"] .aegis-field-help',
        'Content guidance',
        'Explains what belongs in the handoff without replacing the label.',
        'left',
      ),
    ],
  },
  'components-forms-checkbox': {
    render: () => (
      <Frame name="checkbox">
        <Checkbox
          defaultChecked
          label="Send project updates"
          description="Notify members when the delivery plan changes."
        />
        <Checkbox
          checked="indeterminate"
          label="Select all projects"
          description="Some projects in this group are selected."
        />
      </Frame>
    ),
    note: 'Checked and mixed are complementary states. The mixed state represents a partial group selection.',
    parts: [
      part(
        '[data-anatomy="checkbox"] .aegis-checkbox-field:first-child .aegis-checkbox-control',
        'Selection control',
        'The Base UI checkbox owns checked state, focus, and Space activation.',
        'left',
      ),
      part(
        '[data-anatomy="checkbox"] .aegis-checkbox-field:first-child .aegis-checkbox-check',
        'Checked indicator',
        'The check confirms the selected state visually.',
        'top',
      ),
      part(
        '[data-anatomy="checkbox"] .aegis-checkbox-field:first-child .aegis-checkbox-label',
        'Option label',
        'Clicking the associated label activates the checkbox.',
        'top',
      ),
      part(
        '[data-anatomy="checkbox"] .aegis-checkbox-field:first-child .aegis-checkbox-description',
        'Supporting description',
        'Explains the consequence and is associated with the control.',
        'right',
      ),
      part(
        '[data-anatomy="checkbox"] [aria-checked="mixed"] .aegis-checkbox-mixed',
        'Mixed indicator',
        'Represents a partial selection and is announced as mixed.',
        'left',
      ),
    ],
  },
  'components-forms-radiogroup': {
    render: () => (
      <Frame name="radio" width={540}>
        <RadioGroup
          label="Project digest"
          description="Choose how often to receive a summary."
          defaultValue="weekly"
          options={[
            {
              value: 'daily',
              label: 'Every weekday',
              description: 'A short summary of recent changes.',
            },
            {
              value: 'weekly',
              label: 'Once a week',
              description: 'A complete review every Monday.',
            },
            {
              value: 'monthly',
              label: 'Monthly',
              description: 'Available on the team plan.',
              disabled: true,
            },
          ]}
        />
      </Frame>
    ),
    height: 360,
    parts: [
      part(
        '[data-anatomy="radio"] .aegis-field-label',
        'Group label',
        'Names the mutually exclusive decision.',
        'left',
      ),
      part(
        '[data-anatomy="radio"] .aegis-radio-field > .aegis-radio-description',
        'Group description',
        'Provides guidance shared by every option.',
        'right',
      ),
      part(
        '[data-anatomy="radio"] .aegis-radio-option:nth-child(2) .aegis-radio-control',
        'Selected radio',
        'The group allows one selected value and native form integration.',
        'left',
      ),
      part(
        '[data-anatomy="radio"] .aegis-radio-option:nth-child(2) .aegis-radio-label',
        'Option label',
        'Names this value and activates its radio control.',
        'top',
      ),
      part(
        '[data-anatomy="radio"] .aegis-radio-option:nth-child(2) .aegis-radio-description',
        'Option description',
        'Explains this choice independently of the group description.',
        'right',
      ),
      part(
        '[data-anatomy="radio"] .aegis-radio-option[data-disabled]',
        'Unavailable option',
        'Remains readable while being skipped by selection navigation.',
        'bottom-left',
      ),
    ],
  },
  'components-forms-switch': {
    render: () => (
      <Frame name="switch">
        <Switch
          defaultChecked
          label="Email updates"
          description="Send a summary when a project milestone changes."
        />
      </Frame>
    ),
    parts: [
      part(
        '[data-anatomy="switch"] .aegis-switch-control',
        'Switch track',
        'The on/off control owns checked state and keyboard activation.',
        'left',
      ),
      part(
        '[data-anatomy="switch"] .aegis-switch-thumb',
        'State thumb',
        'Its position reinforces whether the setting is enabled.',
        'top',
      ),
      part(
        '[data-anatomy="switch"] .aegis-switch-label',
        'Setting label',
        'A stable label names the setting across both states.',
        'top',
      ),
      part(
        '[data-anatomy="switch"] .aegis-switch-description',
        'Setting description',
        'Explains the effect of enabling the setting.',
        'right',
      ),
    ],
  },
  'components-forms-select': {
    render: () => (
      <Frame name="select" style={{ alignItems: 'stretch', minHeight: 392 }}>
        <Field label="Default source" helpText="New projects inherit this source.">
          <Select
            defaultValue="projects"
            open
            options={sources}
            contentClassName="anatomy-select-options"
          />
        </Field>
      </Frame>
    ),
    height: 520,
    parts: [
      part(
        '[data-anatomy="select"] .aegis-field-label',
        'Field label',
        'Names the single-value decision.',
        'left',
      ),
      part(
        '[data-anatomy="select"] .aegis-select-trigger',
        'Selected-value trigger',
        'Shows the current option and opens the listbox.',
        'top-right',
      ),
      part(
        '[data-anatomy="select"] .aegis-select-chevron',
        'Disclosure icon',
        'Remains visible when the selected label is truncated.',
        'right',
      ),
      part(
        '.anatomy-select-options .aegis-select-group-label',
        'Option group',
        'Names a related set of choices.',
        'left',
      ),
      part(
        '.anatomy-select-options .aegis-select-option .aegis-select-icon',
        'Option icon',
        'Provides a supplementary visual cue for a choice.',
        'left',
      ),
      part(
        '.anatomy-select-options .aegis-select-option-copy',
        'Label and description',
        'Separates the option name from its supporting explanation.',
        'bottom',
      ),
      part(
        '.anatomy-select-options .aegis-select-check',
        'Selection indicator',
        'Marks the current value at the end of the option row.',
        'right',
      ),
    ],
  },
  'components-forms-multicombobox': {
    render: () => (
      <Frame name="multi" width={560} style={{ alignItems: 'stretch', minHeight: 412 }}>
        <MultiCombobox
          label="Connected sources"
          options={sources}
          defaultValue={['projects', 'customers']}
          maxVisible={1}
          defaultOpen
          searchPlaceholder="Search connected sources"
        />
      </Frame>
    ),
    height: 540,
    parts: [
      part(
        '[data-anatomy="multi"] .aegis-field-label',
        'Selection label',
        'Names the multiple-choice field.',
        'left',
      ),
      part(
        '[data-anatomy="multi"] .tag',
        'Selected-value chip',
        'Displays a selected source with its own removal action.',
        'bottom-left',
      ),
      part(
        '[data-anatomy="multi"] .tag-remove',
        'Remove selected value',
        'Removes this source and preserves a nearby focus target.',
        'top',
      ),
      part(
        '[data-anatomy="multi"] .aegis-multi-overflow',
        'Selection overflow',
        'Summarizes additional selected values without discarding them.',
        'bottom',
      ),
      part(
        '[data-anatomy="multi"] .aegis-multi-trigger',
        'Picker trigger',
        'Opens the searchable multi-select dialog.',
        'right',
      ),
      part(
        '.aegis-multi-popover .aegis-multi-search',
        'Option search',
        'Filters labels, descriptions, and optional keywords.',
        'left',
      ),
      part(
        '.aegis-multi-popover .aegis-multi-toolbar',
        'Selection tools',
        'Select all matches, Clear, and the current selection count remain explicit.',
        'right',
      ),
      part(
        '.aegis-multi-popover .aegis-multi-option-copy',
        'Option content',
        'A readable label and description identify each available value.',
        'bottom',
      ),
      part(
        '.aegis-multi-popover .aegis-multi-check[data-checked]',
        'Selected option marker',
        'Shows a checked choice while retaining independent multi-selection.',
        'left',
      ),
    ],
  },
  'components-forms-slider': {
    render: () => (
      <Frame name="slider" style={{ alignItems: 'stretch' }}>
        <Field label="Capacity range" helpText="Choose the minimum and maximum planned capacity.">
          <Slider
            defaultValue={[25, 75]}
            thumbLabels={['Minimum capacity', 'Maximum capacity']}
            formatValue={(value) => `${value}%`}
          />
        </Field>
      </Frame>
    ),
    parts: [
      part(
        '[data-anatomy="slider"] .aegis-field-label',
        'Range label',
        'Names the range and is shared with the individual thumb labels.',
        'left',
      ),
      part(
        '[data-anatomy="slider"] .aegis-slider-value',
        'Value readout',
        'Formats the current values with the same units as each thumb.',
        'right',
      ),
      part(
        '[data-anatomy="slider"] .aegis-slider-track',
        'Available range',
        'Shows the interval between the configured minimum and maximum.',
        'bottom',
      ),
      part(
        '[data-anatomy="slider"] .aegis-slider-range',
        'Selected range',
        'Fills the portion between the two selected values.',
        'top',
      ),
      part(
        '[data-anatomy="slider"] .aegis-slider-thumb:has(input[aria-valuenow="25"])',
        'Minimum thumb',
        'A separately named keyboard-operable lower bound.',
        'left',
      ),
      part(
        '[data-anatomy="slider"] .aegis-slider-thumb:has(input[aria-valuenow="75"])',
        'Maximum thumb',
        'A separately named keyboard-operable upper bound.',
        'right',
      ),
      part(
        '[data-anatomy="slider"] .aegis-field-help',
        'Range guidance',
        'Explains what the bounds control.',
        'bottom-left',
      ),
    ],
  },
  'components-forms-segmentedcontrol': {
    render: () => (
      <Frame name="segmented">
        <SegmentedControl
          label="Planning scale"
          defaultValue="week"
          options={[
            { value: 'day', label: 'Day', icon: <CalendarDays size={16} /> },
            { value: 'week', label: 'Week', icon: <List size={16} /> },
            { value: 'month', label: 'Month', icon: <CalendarDays size={16} /> },
          ]}
        />
      </Frame>
    ),
    parts: [
      part(
        '[data-anatomy="segmented"] .aegis-segmented',
        'Choice group',
        'A fieldset and hidden legend name one mutually exclusive value.',
        'top-left',
      ),
      part(
        '[data-anatomy="segmented"] .aegis-segmented-option:first-of-type > span',
        'Unselected option',
        'A native radio choice with a visible label surface.',
        'left',
      ),
      part(
        '[data-anatomy="segmented"] .aegis-segmented-option[data-selected="true"] > span',
        'Selected option',
        'The selected surface follows the checked radio value.',
        'bottom',
      ),
      part(
        '[data-anatomy="segmented"] .aegis-segmented-option[data-selected="true"] svg',
        'Option icon',
        'An optional cue preceding the option label.',
        'top',
      ),
    ],
  },
  'components-forms-datepicker': {
    render: () => (
      <Frame name="date" style={{ alignItems: 'stretch', minHeight: 432 }}>
        <Field label="Review date" helpText="Choose the day the team will review this milestone.">
          <DatePicker defaultValue={new Date('2026-10-21T12:00:00Z')} timeZone="UTC" defaultOpen />
        </Field>
      </Frame>
    ),
    height: 560,
    parts: [
      part(
        '[data-anatomy="date"] .aegis-field-label',
        'Date label',
        'Names the calendar value and associates its helper text.',
        'left',
      ),
      part(
        '[data-anatomy="date"] .aegis-date-picker-trigger',
        'Selected-date trigger',
        'Shows the selected date and opens the calendar.',
        'top-right',
      ),
      part(
        '.aegis-popover .rdp-month_caption',
        'Month caption',
        'Names the currently displayed calendar month.',
        'left',
      ),
      part(
        '.aegis-popover .rdp-nav',
        'Month navigation',
        'Moves to adjacent months through labeled controls.',
        'right',
      ),
      part(
        '.aegis-popover .rdp-weekdays',
        'Weekday headings',
        'Labels the seven calendar columns.',
        'top',
      ),
      part(
        '.aegis-popover .rdp-selected .rdp-day_button',
        'Selected day',
        'A calendar day button exposes the chosen date.',
        'bottom-right',
      ),
    ],
  },
  'components-forms-timerangepicker': {
    render: () => (
      <Frame name="time-range" width={580} style={{ minHeight: 562 }}>
        <Field label="Reporting period" helpText="Absolute date and time values are in UTC.">
          <TimeRangePicker
            defaultOpen
            now={new Date('2026-10-25T12:00:00Z')}
            defaultValue={{
              mode: 'absolute',
              from: '2026-10-19T09:00:00Z',
              to: '2026-10-25T17:00:00Z',
            }}
          />
        </Field>
      </Frame>
    ),
    height: 690,
    parts: [
      part(
        '[data-anatomy="time-range"] .aegis-time-range-trigger',
        'Committed range',
        'The trigger displays the last applied interval.',
        'top-left',
      ),
      part(
        '.time-range-popover .time-range-presets',
        'Relative presets',
        'Common periods commit immediately, while Custom opens an editable draft.',
        'left',
      ),
      part(
        '.time-range-popover .time-range-custom > p',
        'Timezone context',
        'Makes the UTC interpretation of the absolute inputs explicit.',
        'top',
      ),
      part(
        '.time-range-popover .rdp-month_caption',
        'Calendar month',
        'Names the month used to choose the date boundaries.',
        'left',
      ),
      part(
        '.time-range-popover .rdp-month_grid',
        'Date range calendar',
        'Start and end dates define the draft interval.',
        'right',
      ),
      part(
        '.time-range-popover .time-range-clock label:first-child',
        'Start time',
        'Sets the time at the draft interval’s beginning.',
        'bottom-left',
      ),
      part(
        '.time-range-popover .time-range-clock label:last-child',
        'End time',
        'Sets the time at the draft interval’s end.',
        'bottom-right',
      ),
      part(
        '.time-range-popover .aegis-popover-footer button',
        'Apply action',
        'Commits the valid absolute draft and closes the picker.',
        'right',
      ),
    ],
  },
  'components-forms-treeview': {
    render: () => (
      <Frame name="tree" width={560} style={{ alignItems: 'stretch' }}>
        <TreeView
          label="Project scope"
          defaultExpandedIds={['experience']}
          defaultSelectedIds={['portal']}
          items={[
            {
              id: 'experience',
              label: 'Customer experience',
              icon: <Folder size={16} />,
              count: 18,
              description: 'Work shared with the customer team',
              children: [
                { id: 'portal', label: 'Customer portal', icon: <Folder size={16} />, count: 12 },
                { id: 'onboarding', label: 'Onboarding', icon: <Folder size={16} />, count: 6 },
              ],
            },
            { id: 'platform', label: 'Platform', icon: <Folder size={16} />, count: 8 },
          ]}
        />
      </Frame>
    ),
    height: 360,
    parts: [
      part(
        '[data-anatomy="tree"] .aegis-field-label',
        'Tree label',
        'Names the hierarchical selection.',
        'left',
      ),
      part(
        '[data-anatomy="tree"] .aegis-tree-expand',
        'Branch disclosure',
        'Expands descendants without changing the selected leaves.',
        'left',
      ),
      part(
        '[data-anatomy="tree"] .aegis-tree-checkbox[data-state="indeterminate"]',
        'Derived mixed selection',
        'Shows that only some selectable descendants are chosen.',
        'top',
      ),
      part(
        '[data-anatomy="tree"] .aegis-tree-icon',
        'Node icon',
        'An optional cue for the branch or leaf type.',
        'bottom-left',
      ),
      part(
        '[data-anatomy="tree"] .aegis-tree-copy',
        'Node label and description',
        'Identifies the branch and explains its scope.',
        'top-right',
      ),
      part(
        '[data-anatomy="tree"] .aegis-tree-count',
        'Associated count',
        'A supplementary value associated with the node.',
        'right',
      ),
      part(
        '[data-anatomy="tree"] .aegis-tree-group',
        'Nested leaves',
        'An inset group preserves parent-child relationships and tree navigation.',
        'bottom',
      ),
    ],
  },
  'components-forms-copyablefield': {
    render: () => (
      <Frame name="copyable" style={{ alignItems: 'stretch' }}>
        <CopyableField
          label="Project reference"
          value="PRJ-0042"
          description="Use this identifier when sharing the project with your team."
        />
      </Frame>
    ),
    parts: [
      part(
        '[data-anatomy="copyable"] label',
        'Value label',
        'Names the readonly information.',
        'left',
      ),
      part(
        '[data-anatomy="copyable"] .aegis-copyable-field-control',
        'Value container',
        'Keeps the selectable value and explicit copy action together.',
        'top-right',
      ),
      part(
        '[data-anatomy="copyable"] input',
        'Readonly value',
        'Supports keyboard selection and manual copy without permitting edits.',
        'bottom-left',
      ),
      part(
        '[data-anatomy="copyable"] button',
        'Copy action',
        'Copies the exact value and reports success.',
        'right',
      ),
      part(
        '[data-anatomy="copyable"] p',
        'Supporting description',
        'Explains the value and is associated with the readonly input.',
        'bottom',
      ),
    ],
  },
  'components-forms-fileupload': {
    render: () => <UploadSpecimen />,
    height: 610,
    note: 'The selected-file list illustrates one upload in progress and one retryable error within a single upload component.',
    parts: [
      part(
        '[data-anatomy="upload"] .aegis-file-upload-heading h3',
        'Upload label',
        'Names the attachment collection.',
        'left',
      ),
      part(
        '[data-anatomy="upload"] .aegis-file-upload-heading > span',
        'File allowance',
        'Reports selected files against the configured maximum.',
        'right',
      ),
      part(
        '[data-anatomy="upload"] .aegis-file-upload-dropzone',
        'Drop target',
        'Accepts files through drag and drop while retaining a native picker alternative.',
        'top-right',
      ),
      part(
        '[data-anatomy="upload"] .aegis-file-upload-copy',
        'Selection guidance',
        'Explains accepted file formats and per-file size limits.',
        'left',
      ),
      part(
        '[data-anatomy="upload"] [data-choose-files]',
        'Choose-files action',
        'Opens the native file input from a keyboard-operable button.',
        'right',
      ),
      part(
        '[data-anatomy="upload"] [data-file-id="brief"] strong',
        'Selected filename',
        'Identifies the file being transferred.',
        'left',
      ),
      part(
        '[data-anatomy="upload"] [role="progressbar"]',
        'Upload progress',
        'Reports measured progress for this file.',
        'bottom',
      ),
      part(
        '[data-anatomy="upload"] .aegis-file-upload-item-error',
        'Per-file error',
        'Explains why a transfer needs another attempt.',
        'left',
      ),
      part(
        '[data-anatomy="upload"] [data-file-id="plan"] .aegis-file-upload-actions',
        'File actions',
        'Keeps retry and removal scoped to the affected file.',
        'right',
      ),
    ],
  },
  'components-people-avatar': {
    render: () => (
      <Frame name="avatar">
        <Avatar name="Alex Morgan" initials="AM" size="lg" status="online" />
        <AvatarGroup
          label="Project members"
          size="md"
          max={2}
          avatars={[
            { name: 'Alex Morgan', status: 'online' },
            { name: 'Nina Patel', status: 'away' },
            { name: 'Sam Lee' },
            { name: 'Jordan Kim' },
          ]}
        />
      </Frame>
    ),
    note: 'A standalone avatar shows identity and presence. The companion AvatarGroup shows member overlap and overflow.',
    parts: [
      part(
        '[data-anatomy="avatar"] > .aegis-avatar',
        'Identity surface',
        'A named image role wraps the portrait or initials fallback.',
        'top-left',
      ),
      part(
        '[data-anatomy="avatar"] > .aegis-avatar > span:first-child',
        'Initials fallback',
        'Remains readable when no portrait is supplied or an image fails.',
        'left',
      ),
      part(
        '[data-anatomy="avatar"] > .aegis-avatar .aegis-avatar-status',
        'Presence indicator',
        'Adds host-supplied availability to the avatar’s accessible label.',
        'right',
      ),
      part(
        '[data-anatomy="avatar"] .aegis-avatar-group',
        'Member group',
        'Names the collection and places related identities together.',
        'left',
      ),
      part(
        '[data-anatomy="avatar"] .aegis-avatar-overflow',
        'Overflow summary',
        'Shows additional members and includes their names in its accessible label.',
        'right',
      ),
    ],
  },
  'components-tags-tag': {
    render: () => (
      <Frame name="tag">
        <Tag variant="removable" intent="function" removeLabel="Remove Customer experience label">
          Customer experience
        </Tag>
        <Tag variant="counter" count={12}>
          Projects
        </Tag>
      </Frame>
    ),
    note: 'The removable and counter variants expose complementary parts that cannot appear in the same Tag instance.',
    parts: [
      part(
        '[data-anatomy="tag"] .tag:first-child',
        'Tag body and label',
        'Contains the compact metadata label at the selected size.',
        'top-left',
      ),
      part(
        '[data-anatomy="tag"] .tag-dot',
        'Intent dot',
        'Adds a semantic cue without replacing the visible label.',
        'left',
      ),
      part(
        '[data-anatomy="tag"] .tag-remove',
        'Removal control',
        'A separately named button removes the applied value.',
        'right',
      ),
      part(
        '[data-anatomy="tag"] .tag-count',
        'Attached count',
        'Adds a quantity to the counter variant.',
        'right',
      ),
    ],
  },
  'components-tags-severitybadge': {
    render: () => (
      <Frame name="severity">
        <SeverityBadge severity="high" />
        <SeverityBadge severity="high" compact />
      </Frame>
    ),
    note: 'The labeled form is preferred when severity needs explanation; compact mode exposes the same meaning through its accessible name.',
    parts: [
      part(
        '[data-anatomy="severity"] .severity-badge[data-compact="false"]',
        'Severity label',
        'Visible text communicates the priority independently of color.',
        'left',
      ),
      part(
        '[data-anatomy="severity"] .severity-badge[data-compact="true"]',
        'Compact severity',
        'An image label and title identify a compact severity indicator.',
        'left',
      ),
      part(
        '[data-anatomy="severity"] .severity-dot',
        'Severity dot',
        'The compact visual mark uses the shared severity palette.',
        'right',
      ),
    ],
  },
  'components-tags-statusbadge': {
    render: () => (
      <Frame name="status">
        <StatusBadge status="in-review" />
      </Frame>
    ),
    parts: [
      part(
        '[data-anatomy="status"] .status-badge',
        'Lifecycle label',
        'Names the actual record state inside a compact pill.',
        'top-right',
      ),
      part(
        '[data-anatomy="status"] .status-dot',
        'Status indicator',
        'Reinforces the state with its semantic color while remaining decorative beside the text.',
        'left',
      ),
    ],
  },
  'components-tags-countbadge': {
    render: () => (
      <Frame name="count">
        <CountBadge count={150} max={99} label="projects" />
      </Frame>
    ),
    parts: [
      part(
        '[data-anatomy="count"] .count-badge',
        'Count container',
        'A compact surface retains the exact count in its title.',
        'top-left',
      ),
      part(
        '[data-anatomy="count"] .count-badge > span[aria-hidden]',
        'Capped visible value',
        'Shows 99+ while a separate accessible text equivalent retains 150 projects.',
        'right',
      ),
    ],
  },
  'components-tags-kbd': {
    render: () => (
      <Frame name="kbd">
        <Kbd size="md">⌘ K</Kbd>
      </Frame>
    ),
    parts: [
      part(
        '[data-anatomy="kbd"] kbd',
        'Keycap and shortcut',
        'Native keyboard-text semantics present a host-implemented shortcut; this label does not register the command.',
        'right',
      ),
    ],
  },
  'components-surfaces-card': {
    render: () => (
      <Frame name="card" width={600} style={{ alignItems: 'stretch' }}>
        <Card aria-labelledby="anatomy-card-title">
          <CardHeader>
            <div>
              <CardTitle id="anatomy-card-title">Customer portal</CardTitle>
              <CardDescription>Next milestone: account settings review</CardDescription>
            </div>
            <IconButton aria-label="Project options" emphasis="ghost" tooltip={false}>
              <Settings size={16} />
            </IconButton>
          </CardHeader>
          <CardContent>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
              The project team has completed the design review. Confirm ownership before scheduling
              delivery.
            </p>
          </CardContent>
          <CardFooter>
            <Button emphasis="ghost">View activity</Button>
            <Button intent="function">Open project</Button>
          </CardFooter>
        </Card>
      </Frame>
    ),
    height: 380,
    parts: [
      part(
        '[data-anatomy="card"] .aegis-card',
        'Card surface',
        'A semantic section groups a related piece of content.',
        'top-left',
      ),
      part(
        '[data-anatomy="card"] .aegis-card-title',
        'Card title',
        'Names the card and can label its section through aria-labelledby.',
        'left',
      ),
      part(
        '[data-anatomy="card"] .aegis-card-description',
        'Supporting description',
        'Adds context beneath the title.',
        'bottom-left',
      ),
      part(
        '[data-anatomy="card"] .aegis-card-header button',
        'Header action',
        'An optional explicit control remains separate from the card surface.',
        'right',
      ),
      part(
        '[data-anatomy="card"] .aegis-card-content',
        'Content slot',
        'Holds the primary content using the shared card inset.',
        'right',
      ),
      part(
        '[data-anatomy="card"] .aegis-card-footer',
        'Footer actions',
        'Groups actions or supporting content at the bottom of the card.',
        'bottom',
      ),
    ],
  },
  'components-surfaces-separator': {
    render: () => (
      <Frame name="separator" style={{ alignItems: 'stretch' }}>
        <span style={{ color: 'var(--color-text-secondary)' }}>Project details</span>
        <Separator decorative={false} />
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', height: 32 }}>
          <span>Overview</span>
          <Separator orientation="vertical" decorative={false} />
          <span>Activity</span>
        </div>
      </Frame>
    ),
    note: 'Horizontal and vertical instances show the same divider at different layout boundaries.',
    parts: [
      part(
        '[data-anatomy="separator"] [data-orientation="horizontal"]',
        'Horizontal boundary',
        'Separates adjacent content sections without adding a container.',
        'right',
      ),
      part(
        '[data-anatomy="separator"] [data-orientation="vertical"]',
        'Vertical boundary',
        'Divides related inline regions on the perpendicular axis.',
        'top',
      ),
    ],
  },
  'components-content-expandabletext': {
    render: () => (
      <Frame name="expandable" width={490}>
        <ExpandableText collapsedLines={2} expandLabel="Read more" collapseLabel="Show less">
          The customer portal brings account settings, invoices, and project updates into one
          workspace. The next milestone focuses on clearer ownership and a simpler onboarding
          journey. Review the proposed changes with the customer team, confirm the delivery dates,
          and document any open questions before moving the project into implementation.
        </ExpandableText>
      </Frame>
    ),
    parts: [
      part(
        '[data-anatomy="expandable"] .aegis-expandable-text-content',
        'Text preview',
        'Plain text is visually clamped to the configured line count while remaining available to assistive technology.',
        'top-right',
      ),
      part(
        '[data-anatomy="expandable"] .aegis-expandable-text-toggle',
        'Disclosure action',
        'Appears only when the measured content exceeds the collapsed limit.',
        'left',
      ),
      part(
        '[data-anatomy="expandable"] .aegis-expandable-text-toggle .button-icon',
        'Disclosure direction',
        'Reinforces whether the control expands or collapses the text.',
        'right',
      ),
    ],
  },
  'foundations-icons': {
    render: () => (
      <Frame name="icons">
        <Search size={40} strokeWidth={1.8} aria-label="Search" />
        <Check size={24} strokeWidth={2} aria-label="Completed" />
      </Frame>
    ),
    note: 'Two actual named icons show the SVG frame and stroke geometry at different supported sizes.',
    parts: [
      part(
        '[data-anatomy="icons"] > svg:first-child',
        'Icon frame',
        'The adapter sets a square SVG size and supports an explicit accessible name.',
        'top-left',
      ),
      part(
        '[data-anatomy="icons"] > svg:first-child > :not(defs)',
        'Stroke artwork',
        'The installed icon path uses the configured stroke width and current semantic color.',
        'right',
      ),
      part(
        '[data-anatomy="icons"] > svg:last-child',
        'Compact symbol',
        'A second named icon demonstrates that meaning comes from the selected artwork, not a new component API.',
        'left',
      ),
    ],
  },
};
