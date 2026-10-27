import { useEffect, useRef, type ReactNode } from 'react';
import { Accordion } from '@/components/accordion';
import { Avatar } from '@/components/avatar';
import { BottomSheet } from '@/components/bottom-sheet';
import { Breadcrumb } from '@/components/breadcrumb';
import { Button } from '@/components/button';
import { CommandPalette } from '@/components/command-palette';
import { ContextMenu } from '@/components/context-menu';
import { DescriptionList } from '@/components/description-list';
import { DropdownMenu, type DropdownMenuEntry } from '@/components/dropdown-menu';
import { Field } from '@/components/field';
import {
  Clipboard,
  Download,
  Folder,
  LayoutDashboard,
  MoreHorizontal,
  Plus,
  Settings,
  Trash2,
  UserRound,
} from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { List, ListItem } from '@/components/list';
import { Modal } from '@/components/modal';
import { Pagination } from '@/components/pagination';
import { Popover } from '@/components/popover';
import { ResizablePanels, ResizablePanel, ResizeHandle } from '@/components/resizable-panels';
import { ScrollArea } from '@/components/scroll-area';
import { Select } from '@/components/select';
import { Sheet } from '@/components/sheet';
import { SideNav } from '@/components/side-nav';
import { SideSheet, SideSheetSection, SideSheetField } from '@/components/side-sheet';
import { Stepper } from '@/components/stepper';
import { Tabs } from '@/components/tabs';
import { Tag } from '@/components/tag';
import { Textarea } from '@/components/textarea';
import { TextInput } from '@/components/text-input';
import { RichTooltip } from '@/components/tooltip';
import { AiDiffReview } from '@/patterns/ai-diff-review';
import { AiPanel } from '@/patterns/ai-panel';
import { FilterBar } from '@/patterns/filter-bar';
import { FilterPanel } from '@/patterns/filter-panel';
import { NotificationCenter } from '@/patterns/notification-center';
import { OnboardingChecklist } from '@/patterns/onboarding-checklist';
import { PageHeader } from '@/patterns/page-header';
import { PromptInput } from '@/patterns/prompt-input';
import { UnsavedChangesBar } from '@/patterns/unsaved-changes-bar';
import { Wizard } from '@/patterns/wizard';
import { createDefaultFilters, type RecordFilterState } from '@/lib/filters';
import type { AiContextItem, AiMessageData } from '@/lib/ai';
import { owners, records, referenceTime } from '@/sample-data';
import type { AnatomyPart, AnatomyRegistry } from './types';

const noop = () => {};
const part = (name: string, selector: string, description: string): AnatomyPart => ({
  name,
  selector,
  description,
  anchor: /title|heading|description/i.test(name) ? 'top-left' : undefined,
});
function Frame({
  name,
  children,
  width = 900,
  height,
}: {
  name: string;
  children: ReactNode;
  width?: number;
  height?: number;
}) {
  return (
    <div
      data-anatomy={name}
      style={{
        padding: 24,
        width: '100%',
        maxWidth: width,
        minHeight: height,
        marginInline: 'auto',
      }}
    >
      {children}
    </div>
  );
}
function RestingOverlay({ children, selector }: { children: ReactNode; selector: string }) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      document.querySelector<HTMLElement>(selector)?.focus({ preventScroll: true });
    }, 100);
    return () => window.clearTimeout(timer);
  }, [selector]);
  return children;
}
function ContextMenuSpecimen() {
  const target = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      const node = target.current;
      if (!node) return;
      const bounds = node.getBoundingClientRect();
      node.dispatchEvent(
        new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          clientX: bounds.left + 24,
          clientY: bounds.top + 32,
        }),
      );
    });
    return () => cancelAnimationFrame(timer);
  }, []);
  return (
    <Frame name="context" height={400}>
      <ContextMenu
        className="anatomy-context-menu"
        label="Project context actions"
        items={menuItems}
      >
        <div
          ref={target}
          data-anatomy-part="context-target"
          style={{
            padding: 24,
            paddingInlineStart: 300,
            border: '1px solid var(--color-border-default)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <strong>Customer portal</strong>
          <p className="muted">Selected project · PRJ-0042</p>
        </div>
      </ContextMenu>
    </Frame>
  );
}
function Actions() {
  return (
    <>
      <Button emphasis="ghost">Cancel</Button>
      <Button intent="function">Save changes</Button>
    </>
  );
}
function ProjectFields() {
  return (
    <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
      <TextInput label="Project name" defaultValue="Customer portal" />
      <Field label="Owner">
        <Select
          value="maya"
          onValueChange={noop}
          options={[
            { value: 'maya', label: 'Maya Chen' },
            { value: 'alex', label: 'Alex Morgan' },
          ]}
        />
      </Field>
      <Textarea
        label="Description"
        defaultValue="A shared place for customers to track delivery and contact their team."
        rows={3}
      />
    </div>
  );
}
function ProjectMetadata() {
  return (
    <DescriptionList
      columns={2}
      items={[
        {
          id: 'owner',
          label: 'Owner',
          value: (
            <span className="row">
              <Avatar name="Maya Chen" size="sm" />
              Maya Chen
            </span>
          ),
        },
        {
          id: 'status',
          label: 'Status',
          value: (
            <Tag variant="status" intent="success">
              Active
            </Tag>
          ),
        },
        { id: 'due', label: 'Due date', value: '12 November 2026' },
        { id: 'customer', label: 'Customer', value: 'Atlas Commerce' },
      ]}
    />
  );
}
const workflowSteps = [
  { id: 'details', title: 'Project details', description: 'Name and customer' },
  { id: 'team', title: 'Assign your team', description: 'Owner and collaborators' },
  { id: 'review', title: 'Review and create', description: 'Confirm the setup' },
];
const menuItems: DropdownMenuEntry[] = [
  {
    type: 'group',
    id: 'record',
    label: 'Customer portal',
    items: [
      {
        id: 'open',
        label: 'Open project',
        icon: <Folder size={16} />,
        shortcut: '↵',
        onSelect: noop,
      },
      {
        id: 'copy',
        label: 'Copy project link',
        icon: <Clipboard size={16} />,
        shortcut: '⌘C',
        onSelect: noop,
      },
      {
        type: 'submenu',
        id: 'assign',
        label: 'Assign owner',
        icon: <UserRound size={16} />,
        items: [
          { id: 'maya', label: 'Maya Chen', onSelect: noop },
          { id: 'alex', label: 'Alex Morgan', onSelect: noop },
        ],
      },
    ],
  },
  { type: 'separator', id: 'first-divider' },
  { type: 'checkbox', id: 'pin', label: 'Pin to workspace', checked: true, onCheckedChange: noop },
  {
    type: 'radio-group',
    id: 'view',
    label: 'Default view',
    value: 'overview',
    onValueChange: noop,
    options: [
      { value: 'overview', label: 'Overview' },
      { value: 'activity', label: 'Activity' },
    ],
  },
  { type: 'separator', id: 'last-divider' },
  {
    id: 'delete',
    label: 'Delete project',
    icon: <Trash2 size={16} />,
    intent: 'destroy',
    onSelect: noop,
  },
];
const context: AiContextItem[] = [
  {
    id: 'prj-42',
    kind: 'record',
    label: 'Customer portal',
    description: 'Design review is complete. Implementation is in progress.',
  },
];
const messages: AiMessageData[] = [
  {
    id: 'question',
    role: 'user',
    content: 'Summarize the project and suggest the next step.',
    status: 'complete',
    context,
    steps: [],
    citations: [],
    timestamp: '2026-10-24T10:00:00Z',
  },
  {
    id: 'answer',
    role: 'assistant',
    content:
      '**Customer portal** is ready for implementation. Confirm the handoff with the owner, then schedule the next milestone.',
    status: 'complete',
    context,
    steps: [{ id: 'review', label: 'Reviewed the supplied project context', status: 'complete' }],
    citations: context,
    timestamp: '2026-10-24T10:00:01Z',
    provenance: 'Based on the attached project snapshot.',
  },
];
const selectedFilters: RecordFilterState = {
  ...createDefaultFilters(),
  statuses: ['in-review'],
  sources: ['Projects'],
};

export const surfaceAnatomy: AnatomyRegistry = {
  'components-navigation-breadcrumb': {
    render: () => (
      <Frame name="breadcrumb">
        <Breadcrumb
          items={[
            { label: 'Workspace', icon: <LayoutDashboard size={15} />, onClick: noop },
            { label: 'Projects', onClick: noop },
            { label: 'Customer portal' },
          ]}
        />
      </Frame>
    ),
    parts: [
      part(
        'Ancestor link',
        '[data-anatomy="breadcrumb"] li:first-child button',
        'Returns to a higher level of the current navigation path.',
      ),
      part(
        'Leading icon',
        '[data-anatomy="breadcrumb"] li:first-child button svg',
        'Adds a recognizable workspace cue beside its label.',
      ),
      part(
        'Separator',
        '[data-anatomy="breadcrumb"] .aegis-breadcrumb-separator',
        'Separates adjacent levels without adding another navigation target.',
      ),
      part(
        'Current page',
        '[data-anatomy="breadcrumb"] [aria-current="page"]',
        'Identifies the current location and is not a link.',
      ),
    ],
    height: 160,
  },
  'components-navigation-tabs': {
    render: () => (
      <Frame name="tabs">
        <Tabs
          defaultValue="overview"
          label="Project views"
          items={[
            {
              value: 'overview',
              label: 'Overview',
              icon: <Folder size={16} />,
              count: 8,
              content: <ProjectMetadata />,
            },
            {
              value: 'activity',
              label: 'Activity',
              icon: <UserRound size={16} />,
              count: 24,
              content: <p>Project updates and decisions.</p>,
            },
            { value: 'archive', label: 'Archive', disabled: true, content: null },
          ]}
        />
      </Frame>
    ),
    parts: [
      part(
        'Tab list',
        '[data-anatomy="tabs"] [role="tablist"]',
        'Groups the available views into one keyboard navigation stop.',
      ),
      part(
        'Active tab',
        '[data-anatomy="tabs"] [role="tab"][aria-selected="true"]',
        'Labels the visible panel and carries the selection indicator.',
      ),
      part(
        'Optional icon',
        '[data-anatomy="tabs"] .aegis-tabs-icon',
        'Provides a compact visual cue for the view.',
      ),
      part(
        'Count',
        '[data-anatomy="tabs"] .aegis-tabs-count',
        'Shows the number of items in a view.',
      ),
      part(
        'Disabled tab',
        '[data-anatomy="tabs"] [role="tab"][aria-disabled="true"]',
        'Keeps an unavailable view visible without allowing activation.',
      ),
      part(
        'Content panel',
        '[data-anatomy="tabs"] [role="tabpanel"]:not([hidden])',
        'Contains the content associated with the selected tab.',
      ),
    ],
    height: 330,
  },
  'components-navigation-pagination': {
    render: () => (
      <Frame name="pagination">
        <Pagination
          page={4}
          pageSize={25}
          total={428}
          noun="projects"
          onPageChange={noop}
          onPageSizeChange={noop}
        />
      </Frame>
    ),
    parts: [
      part(
        'Result range',
        '[data-anatomy="pagination"] .aegis-pagination-summary',
        'States the visible item range and total.',
      ),
      part(
        'Page size',
        '[data-anatomy="pagination"] .aegis-pagination-size',
        'Changes how many rows are shown on each page.',
      ),
      part(
        'Previous control',
        '[data-anatomy="pagination"] [aria-label="Previous page"]',
        'Moves back one page.',
      ),
      part(
        'Current page',
        '[data-anatomy="pagination"] [aria-current="page"]',
        'Identifies the selected page among direct page links.',
      ),
      part(
        'Ellipsis',
        '[data-anatomy="pagination"] .aegis-pagination-ellipsis',
        'Marks omitted page numbers in a long result set.',
      ),
      part(
        'Next control',
        '[data-anatomy="pagination"] [aria-label="Next page"]',
        'Moves forward one page.',
      ),
    ],
    height: 170,
  },
  'components-navigation-stepper': {
    render: () => (
      <Frame name="stepper">
        <Stepper steps={workflowSteps} currentStep={1} onStepChange={noop} />
      </Frame>
    ),
    parts: [
      part(
        'Completed step',
        '[data-anatomy="stepper"] [data-state="complete"]',
        'Uses a checkmark and permits returning to completed work.',
      ),
      part(
        'Step marker',
        '[data-anatomy="stepper"] [data-state="current"] .aegis-stepper-marker',
        'Shows the current numbered position in the workflow.',
      ),
      part(
        'Step title',
        '[data-anatomy="stepper"] [data-state="current"] .aegis-stepper-title',
        'Names the task at this stage.',
      ),
      part(
        'Description',
        '[data-anatomy="stepper"] [data-state="current"] .aegis-stepper-description',
        'Adds a short explanation of what the step contains.',
      ),
      part(
        'Upcoming step',
        '[data-anatomy="stepper"] [data-state="upcoming"]',
        'Shows remaining work without making an incomplete stage navigable.',
      ),
    ],
    height: 220,
  },
  'components-navigation-sidenav': {
    render: () => (
      <Frame name="sidenav" width={380}>
        <style>{`[data-anatomy="sidenav"] .side-nav{height:100%;min-height:0;position:relative;top:0}`}</style>
        <div style={{ height: 570, display: 'flex' }}>
          <SideNav
            brandName="Northstar"
            brandIcon={<Folder size={22} />}
            workspace="Design operations"
            activeId="active"
            onNavigate={noop}
            onSearch={noop}
            sections={[
              {
                label: 'Workspace',
                items: [
                  { id: 'home', label: 'Overview', icon: <LayoutDashboard /> },
                  {
                    id: 'projects',
                    label: 'Projects',
                    icon: <Folder />,
                    children: [
                      { id: 'active', label: 'Active projects', icon: <Folder />, count: 12 },
                      { id: 'archived', label: 'Archived', icon: <Folder /> },
                    ],
                  },
                ],
              },
              {
                label: 'Organization',
                items: [
                  { id: 'team', label: 'Team', icon: <UserRound /> },
                  { id: 'settings', label: 'Settings', icon: <Settings /> },
                ],
              },
            ]}
            footer={
              <div className="row">
                <Avatar name="Maya Chen" size="sm" status="online" />
                <span>
                  Maya Chen
                  <br />
                  <small className="muted">Workspace admin</small>
                </span>
              </div>
            }
          />
        </div>
      </Frame>
    ),
    parts: [
      part(
        'Brand',
        '[data-anatomy="sidenav"] .nav-brand-copy',
        'Identifies the application with its mark and name.',
      ),
      part(
        'Collapse control',
        '[data-anatomy="sidenav"] [aria-label="Collapse navigation"]',
        'Switches between the expanded navigation and compact rail.',
      ),
      part(
        'Workspace summary',
        '[data-anatomy="sidenav"] .nav-workspace',
        'Shows the current workspace and connection indicator.',
      ),
      part(
        'Workspace search',
        '[data-anatomy="sidenav"] .nav-search',
        'Opens search with a visible keyboard shortcut.',
      ),
      part(
        'Nested navigation',
        '[data-anatomy="sidenav"] .nav-nested',
        'Groups child destinations under their parent.',
      ),
      part(
        'Active destination',
        '[data-anatomy="sidenav"] .nav-item.is-active',
        'Marks the current page with a selected treatment.',
      ),
      part(
        'Footer',
        '[data-anatomy="sidenav"] .nav-footer',
        'Holds account or workspace controls below the main destinations.',
      ),
    ],
    height: 630,
  },
  'components-navigation-commandpalette': {
    render: () => (
      <CommandPalette
        open
        shortcut={false}
        onOpenChange={noop}
        onAskAi={noop}
        actions={[
          {
            id: 'project',
            label: 'Open Customer portal',
            group: 'Projects',
            icon: <Folder size={16} />,
            shortcut: '↵',
            onSelect: noop,
          },
          {
            id: 'new',
            label: 'Create project',
            group: 'Actions',
            icon: <Plus size={16} />,
            shortcut: '⌘N',
            onSelect: noop,
          },
          {
            id: 'settings',
            label: 'Workspace settings',
            group: 'Actions',
            icon: <Settings size={16} />,
            onSelect: noop,
          },
        ]}
      />
    ),
    parts: [
      part(
        'Search input',
        '.command-dialog .command-input',
        'Filters commands, navigation destinations and records.',
      ),
      part(
        'Close action',
        '.command-dialog [aria-label="Close command palette"]',
        'Dismisses the palette and restores the opener focus.',
      ),
      part(
        'Group heading',
        '.command-dialog .command-group-label',
        'Separates results by purpose.',
      ),
      part(
        'Command result',
        '.command-dialog .command-item',
        'Combines an optional icon, action label and shortcut.',
      ),
      part(
        'Shortcut',
        '.command-dialog .command-item kbd',
        'Shows the command shortcut without becoming another control.',
      ),
      part(
        'Keyboard help',
        '.command-dialog .command-footer',
        'Explains the keys used to navigate and choose results.',
      ),
    ],
    height: 560,
  },
  'components-lists-list': {
    render: () => (
      <Frame name="list">
        <style>{'[data-anatomy="list"] .aegis-list-item-actions{opacity:1}'}</style>
        <List density="comfortable" aria-label="Project hierarchy">
          <ListItem
            title="Customer portal"
            subtitle="Atlas Commerce · Design handoff"
            avatar={<Avatar name="Maya Chen" size="sm" />}
            checkbox={{ defaultChecked: true }}
            tags={
              <Tag variant="status" intent="success">
                Active
              </Tag>
            }
            meta="Updated today"
            counter={24}
            counterLabel="open tasks"
            selectable
            selected
            onSelect={noop}
            actions={
              <IconButton aria-label="Project actions" emphasis="ghost" size="sm">
                <MoreHorizontal size={17} />
              </IconButton>
            }
          >
            <List aria-label="Customer portal deliverables">
              <ListItem
                title="Navigation specification"
                icon={<Folder size={22} />}
                counter={3}
                counterLabel="comments"
              />
            </List>
          </ListItem>
        </List>
      </Frame>
    ),
    parts: [
      part(
        'Checkbox',
        '[data-anatomy="list"] .aegis-list-item-checkbox',
        'Independent selection aligned with the primary title.',
      ),
      part(
        'Leading visual',
        '[data-anatomy="list"] .aegis-list-item-leading',
        'Uses an icon or avatar to identify the row.',
      ),
      part(
        'Primary title',
        '[data-anatomy="list"] .aegis-list-item-title',
        'Names the row button and its checkbox.',
      ),
      part(
        'Subtitle',
        '[data-anatomy="list"] .aegis-list-item-description',
        'Provides the supporting second line and accessible description.',
      ),
      part(
        'Tags',
        '[data-anatomy="list"] .aegis-list-item-tags',
        'Places shared Tag components outside the primary button.',
      ),
      part(
        'Metadata',
        '[data-anatomy="list"] .aegis-list-item-meta',
        'Adds concise supporting information.',
      ),
      part(
        'Actions',
        '[data-anatomy="list"] .aegis-list-item-actions',
        'Independent controls appear on row hover or keyboard focus.',
      ),
      part(
        'Counter',
        '[data-anatomy="list"] .aegis-list-item-counter',
        'Shows a compact CountBadge at the row end.',
      ),
      part(
        'Child list',
        '[data-anatomy="list"] .aegis-list[data-depth="2"]',
        'A nested native list sits beneath its parent row with inherited density.',
      ),
    ],
    note: 'A selected parent has one child row. Actions are shown in their hover or focus state.',
    height: 360,
  },
  'components-lists-accordion': {
    render: () => (
      <Frame name="accordion">
        <Accordion
          type="multiple"
          defaultValue={['details']}
          items={[
            {
              value: 'details',
              title: 'Project details',
              icon: <Folder size={16} />,
              count: 4,
              content: <ProjectMetadata />,
            },
            {
              value: 'activity',
              title: 'Recent activity',
              icon: <UserRound size={16} />,
              count: 12,
              content: 'Milestone reviews and team updates.',
            },
          ]}
        />
      </Frame>
    ),
    parts: [
      part(
        'Disclosure trigger',
        '[data-anatomy="accordion"] .aegis-accordion-trigger',
        'Toggles one section while retaining its heading.',
      ),
      part(
        'Leading icon',
        '[data-anatomy="accordion"] .aegis-accordion-icon',
        'Adds an optional category cue.',
      ),
      part(
        'Section title',
        '[data-anatomy="accordion"] .aegis-accordion-title',
        'Names the expandable content.',
      ),
      part(
        'Count',
        '[data-anatomy="accordion"] .aegis-accordion-count',
        'Summarizes the number of items in the section.',
      ),
      part(
        'Chevron',
        '[data-anatomy="accordion"] .aegis-accordion-chevron',
        'Reflects whether the content is expanded.',
      ),
      part(
        'Expanded content',
        '[data-anatomy="accordion"] .aegis-accordion-content-inner',
        'Holds the revealed details, with its own spacing.',
      ),
    ],
    height: 340,
  },
  'components-lists-dropdownmenu': {
    render: () => (
      <Frame name="dropdown" width={520} height={400}>
        <DropdownMenu
          open
          onOpenChange={noop}
          label="Project actions"
          className="anatomy-dropdown-menu"
          items={menuItems}
          trigger={
            <Button emphasis="tertiary" trailingIcon={<MoreHorizontal size={16} />}>
              Project actions
            </Button>
          }
        />
      </Frame>
    ),
    parts: [
      part(
        'Trigger',
        '[data-anatomy="dropdown"] button',
        'Opens the anchored menu for this project.',
      ),
      part(
        'Group label',
        '.anatomy-dropdown-menu .aegis-menu-label',
        'Adds context for the actions below it.',
      ),
      part(
        'Action row',
        '.anatomy-dropdown-menu .aegis-menu-item',
        'Combines a label with optional icon and shortcut.',
      ),
      part(
        'Submenu entry',
        '.anatomy-dropdown-menu .aegis-menu-sub-arrow',
        'Indicates a nested set of choices.',
      ),
      part(
        'Checkbox item',
        '.anatomy-dropdown-menu [role="menuitemcheckbox"]',
        'Toggles an independent preference.',
      ),
      part(
        'Radio group',
        '.anatomy-dropdown-menu [role="group"]:has([role="menuitemradio"])',
        'Allows one choice from related views.',
      ),
      part(
        'Divider',
        '.anatomy-dropdown-menu .aegis-menu-separator',
        'Separates action groups visually.',
      ),
      part(
        'Destructive action',
        '.anatomy-dropdown-menu .aegis-menu-item-destroy',
        'Distinguishes an action that removes the project.',
      ),
    ],
    height: 550,
  },
  'components-lists-contextmenu': {
    render: () => <ContextMenuSpecimen />,
    parts: [
      part(
        'Context target',
        '[data-anatomy="context"] [data-anatomy-part="context-target"]',
        'The record surface that owns the contextual actions.',
      ),
      part(
        'Context label',
        '.anatomy-context-menu .aegis-context-label',
        'Identifies the record or group the actions apply to.',
      ),
      part(
        'Action',
        '.anatomy-context-menu .aegis-context-item',
        'Runs a command for the selected target.',
      ),
      part(
        'Submenu indicator',
        '.anatomy-context-menu .aegis-context-sub-arrow',
        'Leads to an additional level of actions.',
      ),
      part(
        'Checked preference',
        '.anatomy-context-menu [role="menuitemcheckbox"]',
        'Shows an independently enabled option.',
      ),
      part(
        'Exclusive choice',
        '.anatomy-context-menu [role="menuitemradio"][aria-checked="true"]',
        'Marks the selected value in a radio group.',
      ),
      part(
        'Destructive action',
        '.anatomy-context-menu .aegis-context-item-destroy',
        'Keeps removal actions visually distinct.',
      ),
    ],
    height: 540,
  },
  'components-overlays-modal': {
    render: () => (
      <RestingOverlay selector=".anatomy-modal">
        <Modal
          open
          onOpenChange={noop}
          className="anatomy-modal"
          title="Edit project"
          description="Update the project details for Atlas Commerce."
          headerActions={
            <IconButton aria-label="Copy project link" emphasis="ghost" size="sm" tooltip={false}>
              <Clipboard size={16} />
            </IconButton>
          }
          footer={<Actions />}
        >
          <ProjectFields />
        </Modal>
      </RestingOverlay>
    ),
    parts: [
      part(
        'Backdrop',
        '.aegis-modal-overlay',
        'Separates the focused dialog from the workspace behind it.',
      ),
      part('Title', '.anatomy-modal .aegis-modal-title', 'Names the dialog task.'),
      part(
        'Description',
        '.anatomy-modal .aegis-modal-description',
        'Explains the context before the fields.',
      ),
      part(
        'Header action',
        '.anatomy-modal .aegis-modal-header-actions',
        'Holds a secondary action beside the title area.',
      ),
      part('Close action', '.anatomy-modal .aegis-modal-close', 'Dismisses the dialog.'),
      part(
        'Scrollable body',
        '.anatomy-modal .aegis-modal-body',
        'Contains the fields or content for the task.',
      ),
      part(
        'Footer actions',
        '.anatomy-modal .aegis-modal-footer',
        'Keeps the primary decision and cancellation together.',
      ),
    ],
    height: 620,
  },
  'components-overlays-popover': {
    render: () => (
      <Frame name="popover" width={550}>
        <Popover
          open
          onOpenChange={noop}
          className="anatomy-popover"
          title="Project sharing"
          description="Choose who can access this workspace."
          width={420}
          showClose
          footer={<Actions />}
          trigger={<Button emphasis="tertiary">Manage access</Button>}
        >
          <Field label="Access level">
            <Select
              value="team"
              onValueChange={noop}
              options={[
                { value: 'team', label: 'Workspace members' },
                { value: 'private', label: 'Only invited people' },
              ]}
            />
          </Field>
          <p className="muted">Members can view the project and contribute updates.</p>
        </Popover>
      </Frame>
    ),
    parts: [
      part(
        'Trigger',
        '[data-anatomy="popover"] button',
        'Anchors the contextual panel to its invoking control.',
      ),
      part(
        'Heading',
        '.anatomy-popover .aegis-popover-heading-copy',
        'Combines the panel title and supporting description.',
      ),
      part(
        'Close action',
        '.anatomy-popover .aegis-popover-close',
        'Dismisses the panel without submitting changes.',
      ),
      part(
        'Content body',
        '.anatomy-popover .aegis-popover-body',
        'Contains the local controls and explanatory content.',
      ),
      part(
        'Footer',
        '.anatomy-popover .aegis-popover-footer',
        'Groups the actions for this focused task.',
      ),
    ],
    height: 470,
  },
  'components-overlays-tooltip': {
    render: () => (
      <Frame name="tooltip" width={580}>
        <div style={{ padding: '110px 24px 24px', textAlign: 'center' }}>
          <RichTooltip
            open
            title="Copy project link"
            description="Share a direct link with anyone who has workspace access."
            shortcut="⌘C"
            side="top"
            className="anatomy-rich-tooltip"
          >
            <Button emphasis="tertiary" leadingIcon={<Clipboard size={16} />}>
              Copy link
            </Button>
          </RichTooltip>
        </div>
      </Frame>
    ),
    parts: [
      part(
        'Trigger',
        '[data-anatomy="tooltip"] button',
        'The control receiving the additional explanation.',
      ),
      part(
        'Tooltip title',
        '.anatomy-rich-tooltip .aegis-tooltip-heading',
        'States the action or meaning concisely.',
      ),
      part('Shortcut', '.anatomy-rich-tooltip kbd', 'Adds an optional keyboard alternative.'),
      part(
        'Description',
        '.anatomy-rich-tooltip .aegis-tooltip-description',
        'Supplies context that is not required to operate the control.',
      ),
      part(
        'Anchor arrow',
        '.anatomy-rich-tooltip .aegis-tooltip-arrow',
        'Visually connects the explanation to its trigger.',
      ),
    ],
    height: 280,
  },
  'components-overlays-sidesheet': {
    render: () => (
      <SideSheet
        open
        onOpenChange={noop}
        className="anatomy-side-sheet"
        title="Customer portal"
        description="PRJ-0042 · Atlas Commerce"
        size="md"
        resizable
        position={2}
        total={12}
        onPrevious={noop}
        onNext={noop}
        headerActions={
          <Button size="sm" emphasis="tertiary" leadingIcon={<Download size={14} />}>
            Export
          </Button>
        }
        footer={<Actions />}
      >
        <SideSheetSection title="Project summary">
          <ProjectMetadata />
        </SideSheetSection>
        <SideSheetSection title="Notes">
          <SideSheetField label="Latest update">
            The handoff is ready for implementation.
          </SideSheetField>
          <Textarea label="Add a note" placeholder="Share an update for the team…" rows={3} />
        </SideSheetSection>
      </SideSheet>
    ),
    parts: [
      part(
        'Resize edge',
        '.anatomy-side-sheet .aegis-sheet-resize-handle',
        'Adjusts the panel width without leaving the current workspace.',
      ),
      part(
        'Heading',
        '.anatomy-side-sheet .aegis-sheet-heading',
        'Shows the record title and supporting identifier.',
      ),
      part(
        'Close action',
        '.anatomy-side-sheet [aria-label="Close detail panel"]',
        'Dismisses the record panel.',
      ),
      part(
        'Record navigation',
        '.anatomy-side-sheet .aegis-sheet-navigation',
        'Moves between records in the same result set.',
      ),
      part(
        'Header actions',
        '.anatomy-side-sheet .aegis-sheet-actions',
        'Provides record-level secondary actions.',
      ),
      part(
        'Content section',
        '.anatomy-side-sheet .aegis-sheet-section',
        'Groups related fields under a section title.',
      ),
      part(
        'Field',
        '.anatomy-side-sheet .aegis-sheet-field',
        'Pairs a concise label with its value.',
      ),
      part(
        'Footer',
        '.anatomy-side-sheet .aegis-sheet-footer',
        'Keeps primary and secondary decisions visible.',
      ),
    ],
    height: 670,
  },
  'components-overlays-sheet': {
    render: () => (
      <Frame name="sheet">
        <div style={{ height: 520 }}>
          <Sheet
            open
            onOpenChange={noop}
            title="Project context"
            description="PRJ-0042 · Customer portal"
            defaultSize={380}
            contentMinSize={220}
            content={
              <div style={{ padding: 24 }}>
                <h3>Projects</h3>
                <p className="muted">The workspace remains visible beside the panel.</p>
                <List>
                  <ListItem
                    title="Customer portal"
                    description="Atlas Commerce"
                    icon={<Folder size={18} />}
                    selected
                  />
                </List>
              </div>
            }
            headerActions={
              <IconButton aria-label="Copy identifier" emphasis="ghost">
                <Clipboard size={16} />
              </IconButton>
            }
            footer={<Actions />}
          >
            <ProjectMetadata />
            <p>The customer review is complete. Implementation begins next week.</p>
          </Sheet>
        </div>
      </Frame>
    ),
    parts: [
      part(
        'Workspace',
        '[data-anatomy="sheet"] .aegis-contained-sheet-content',
        'The content pushed aside within the bounded workspace.',
      ),
      part(
        'Resize separator',
        '[data-anatomy="sheet"] .aegis-contained-sheet-resizer',
        'Changes the panel width with pointer or keyboard input.',
      ),
      part(
        'Heading',
        '[data-anatomy="sheet"] .aegis-contained-sheet-heading',
        'Identifies the selected record and its context.',
      ),
      part(
        'Header actions',
        '[data-anatomy="sheet"] .aegis-contained-sheet-actions',
        'Holds secondary actions and the close control.',
      ),
      part(
        'Panel body',
        '[data-anatomy="sheet"] .aegis-contained-sheet-body',
        'Scrolls independently when the details grow.',
      ),
      part(
        'Footer',
        '[data-anatomy="sheet"] .aegis-contained-sheet-footer',
        'Keeps the panel decisions separate from its scrollable content.',
      ),
    ],
    height: 600,
  },
  'components-overlays-bottomsheet': {
    render: () => (
      <Frame name="bottomsheet">
        <div style={{ height: 540, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, minHeight: 100, padding: 20 }}>
            <h3>Customer portal workspace</h3>
            <p className="muted">Project context remains visible above the activity panel.</p>
          </div>
          <BottomSheet
            open
            onOpenChange={noop}
            title="Project activity"
            description="Updates for Customer portal"
            defaultHeight={350}
            headerActions={
              <Button emphasis="tertiary" size="sm" leadingIcon={<Download size={14} />}>
                Export
              </Button>
            }
            footer={<Button intent="function">View project</Button>}
          >
            <List divided>
              <ListItem
                title="Design review approved"
                description="Maya Chen · Today at 10:40"
                icon={<UserRound size={18} />}
              />
              <ListItem
                title="Implementation milestone created"
                description="Alex Morgan · Today at 09:15"
                icon={<Folder size={18} />}
              />
            </List>
          </BottomSheet>
        </div>
      </Frame>
    ),
    parts: [
      part(
        'Resize edge',
        '[data-anatomy="bottomsheet"] .aegis-bottom-sheet-resizer',
        'Changes the panel height while preserving space above it.',
      ),
      part(
        'Heading',
        '[data-anatomy="bottomsheet"] .aegis-bottom-sheet-heading',
        'Labels the panel and its current context.',
      ),
      part(
        'Header actions',
        '[data-anatomy="bottomsheet"] .aegis-bottom-sheet-actions',
        'Holds secondary actions and the close control.',
      ),
      part(
        'Scrollable body',
        '[data-anatomy="bottomsheet"] .aegis-bottom-sheet-body',
        'Contains the activity or supporting details.',
      ),
      part(
        'Footer',
        '[data-anatomy="bottomsheet"] .aegis-bottom-sheet-footer',
        'Provides a stable place for the main panel action.',
      ),
    ],
    height: 620,
  },
  'components-layout-resizablepanels': {
    render: () => (
      <Frame name="panels">
        <ResizablePanels orientation="horizontal" style={{ height: 350 }}>
          <ResizablePanel id="anatomy-project-list" defaultSize="38%" minSize="25%">
            <div style={{ padding: 20 }}>
              <h3>Projects</h3>
              <List>
                <ListItem
                  title="Customer portal"
                  description="Atlas Commerce"
                  icon={<Folder size={18} />}
                  selected
                />
              </List>
            </div>
          </ResizablePanel>
          <ResizeHandle label="Resize projects and details" />
          <ResizablePanel id="anatomy-project-details" defaultSize="62%" minSize="30%">
            <div style={{ padding: 20 }}>
              <h3>Customer portal</h3>
              <ProjectMetadata />
            </div>
          </ResizablePanel>
        </ResizablePanels>
      </Frame>
    ),
    parts: [
      part(
        'Panel group',
        '[data-anatomy="panels"] .aegis-resizable-panels',
        'Contains the related panes and manages their available space.',
      ),
      part(
        'First panel',
        '[data-anatomy="panels"] .aegis-resizable-panel:first-child',
        'Holds the primary navigation or record list.',
      ),
      part(
        'Resize separator',
        '[data-anatomy="panels"] .aegis-resize-handle',
        'Supports dragging and arrow-key adjustments between the panes.',
      ),
      part(
        'Grip',
        '[data-anatomy="panels"] .aegis-resize-handle > span',
        'Makes the adjustable boundary visually discoverable.',
      ),
      part(
        'Second panel',
        '[data-anatomy="panels"] .aegis-resizable-panel:last-child',
        'Uses the remaining space for contextual detail.',
      ),
    ],
    height: 430,
  },
  'components-utilities-scrollarea': {
    render: () => (
      <Frame name="scrollarea" width={640}>
        <ScrollArea
          label="Project activity"
          maxHeight={260}
          style={{
            padding: 16,
            border: '1px solid var(--color-border-default)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <div data-anatomy="scroll-content">
            <h3>Project activity</h3>
            <List divided>
              {[
                'Scope confirmed',
                'Design review scheduled',
                'Prototype shared',
                'Feedback reviewed',
                'Handoff approved',
                'Implementation started',
                'Quality review scheduled',
              ].map((title, index) => (
                <ListItem
                  key={title}
                  title={title}
                  description={`Maya Chen · ${10 + index}:00 UTC`}
                  icon={<Folder size={16} />}
                />
              ))}
            </List>
          </div>
        </ScrollArea>
      </Frame>
    ),
    parts: [
      part(
        'Scrollable viewport',
        '[data-anatomy="scrollarea"] .aegis-scroll-area',
        'Constrains the visible height and remains keyboard focusable.',
      ),
      part(
        'Content heading',
        '[data-anatomy="scroll-content"] h3',
        'Introduces content that continues beyond the visible viewport.',
      ),
      part(
        'Visible item',
        '[data-anatomy="scrollarea"] .aegis-list-item',
        'Uses the same row structure throughout the scrollable content.',
      ),
    ],
    note: 'The scrollbar is the browser-managed scroll affordance. It is not a separate DOM element.',
    height: 340,
  },
  'patterns-pageheader': {
    render: () => (
      <Frame name="pageheader">
        <PageHeader
          title="Customer portal"
          description="Plan delivery and keep the customer informed."
          breadcrumbs={[
            { label: 'Workspace', onClick: noop },
            { label: 'Projects', onClick: noop },
            { label: 'Customer portal' },
          ]}
          leading={<Avatar name="Atlas Commerce" initials="AC" size="lg" />}
          metadata={
            <span className="row">
              <Tag variant="status" intent="success">
                Active
              </Tag>
              <span className="muted">Owned by Maya Chen</span>
            </span>
          }
          actions={
            <>
              <Button emphasis="tertiary" leadingIcon={<Clipboard size={16} />}>
                Copy link
              </Button>
              <Button intent="function" leadingIcon={<Plus size={16} />}>
                Add task
              </Button>
            </>
          }
        >
          <Tabs
            label="Project sections"
            items={[
              { value: 'overview', label: 'Overview', content: null },
              { value: 'tasks', label: 'Tasks', count: 12, content: null },
            ]}
          />
        </PageHeader>
      </Frame>
    ),
    parts: [
      part(
        'Breadcrumbs',
        '[data-anatomy="pageheader"] .aegis-page-header-navigation',
        'Places the page within its workspace hierarchy.',
      ),
      part(
        'Leading visual',
        '[data-anatomy="pageheader"] .aegis-page-header-leading',
        'Identifies the record or account at a glance.',
      ),
      part(
        'Title',
        '[data-anatomy="pageheader"] .aegis-page-header-title',
        'Names the current page or record.',
      ),
      part(
        'Description',
        '[data-anatomy="pageheader"] .aegis-page-header-description',
        'Adds a concise explanation beneath the title.',
      ),
      part(
        'Metadata',
        '[data-anatomy="pageheader"] .aegis-page-header-metadata',
        'Holds status and ownership information.',
      ),
      part(
        'Actions',
        '[data-anatomy="pageheader"] .aegis-page-header-actions',
        'Groups the page-level actions beside its heading.',
      ),
      part(
        'Supporting navigation',
        '[data-anatomy="pageheader"] .aegis-page-header-content',
        'Hosts tabs or filters below the main heading row.',
      ),
    ],
    height: 350,
  },
  'patterns-unsavedchangesbar': {
    render: () => (
      <Frame name="unsaved">
        <UnsavedChangesBar
          dirty
          message="Project details have unsaved changes."
          onSave={noop}
          onDiscard={noop}
        />
      </Frame>
    ),
    parts: [
      part(
        'Boundary',
        '[data-anatomy="unsaved"] .aegis-unsaved-bar',
        'Keeps the unsaved state and its decisions together.',
      ),
      part(
        'Status message',
        '[data-anatomy="unsaved"] [role="status"]',
        'Explains why the actions are present.',
      ),
      part(
        'Discard action',
        '[data-anatomy="unsaved"] .aegis-unsaved-actions button:first-child',
        'Lets the host restore the saved values.',
      ),
      part(
        'Save action',
        '[data-anatomy="unsaved"] .aegis-unsaved-actions button:last-child',
        'Invokes saving and becomes a guarded loading action while pending.',
      ),
    ],
    height: 180,
  },
  'patterns-filterbar': {
    render: () => (
      <Frame name="filterbar">
        <FilterBar
          value={selectedFilters}
          onValueChange={noop}
          owners={owners}
          now={referenceTime}
          density="default"
          onDensityChange={noop}
          columns={[
            { id: 'title', label: 'Title', visible: true, hideable: false },
            { id: 'owner', label: 'Owner', visible: true },
            { id: 'updated', label: 'Updated', visible: true },
          ]}
          onColumnVisibilityChange={noop}
        />
      </Frame>
    ),
    parts: [
      part(
        'Filter composer',
        '[data-anatomy="filterbar"] .aegis-filter-bar-main > button:first-child',
        'Starts a structured field, operator and value filter.',
      ),
      part(
        'Search',
        '[data-anatomy="filterbar"] .aegis-filter-search',
        'Filters records with a free-text query.',
      ),
      part(
        'Time range',
        '[data-anatomy="filterbar"] .aegis-time-range-trigger',
        'Scopes records to a chosen time window.',
      ),
      part(
        'Density controls',
        '[data-anatomy="filterbar"] [aria-label="Row density"]',
        'Changes row spacing without changing the result set.',
      ),
      part(
        'Column control',
        '[data-anatomy="filterbar"] [aria-label="Column settings"]',
        'Opens the visible-column preferences.',
      ),
      part(
        'Applied criteria',
        '[data-anatomy="filterbar"] .aegis-filter-bar-applied',
        'Shows removable criteria and the clear-all action.',
      ),
    ],
    height: 260,
  },
  'patterns-filterpanel': {
    render: () => (
      <Frame name="filterpanel" width={400}>
        <div style={{ height: 610, display: 'flex' }}>
          <FilterPanel
            value={selectedFilters}
            onValueChange={noop}
            records={records}
            owners={owners}
            now={referenceTime}
            onClose={noop}
          >
            <Field label="Workspace">
              <Select
                value="northstar"
                onValueChange={noop}
                options={[{ value: 'northstar', label: 'Northstar' }]}
              />
            </Field>
          </FilterPanel>
        </div>
      </Frame>
    ),
    parts: [
      part(
        'Heading and applied count',
        '[data-anatomy="filterpanel"] .aegis-filter-panel-heading h2',
        'Identifies the panel and counts its active criteria.',
      ),
      part(
        'Clear and close actions',
        '[data-anatomy="filterpanel"] .aegis-filter-panel-actions',
        'Resets criteria or closes the panel without clearing them.',
      ),
      part(
        'Option search',
        '[data-anatomy="filterpanel"] input[type="search"]',
        'Finds options across the available facet groups.',
      ),
      part(
        'Result count',
        '[data-anatomy="filterpanel"] .aegis-filter-panel-result',
        'Reports how many records match the current criteria.',
      ),
      part(
        'Custom criterion',
        '[data-anatomy="filterpanel"] .aegis-filter-panel-custom',
        'Hosts an application-specific filter above the standard facets.',
      ),
      part(
        'Facet heading',
        '[data-anatomy="filterpanel"] .aegis-accordion-trigger',
        'Names a collapsible group and shows its selected count.',
      ),
      part(
        'Checkbox option',
        '[data-anatomy="filterpanel"] .aegis-filter-facets .aegis-checkbox-field',
        'Combines a selectable value with its matching-record count.',
      ),
    ],
    height: 690,
  },
  'patterns-notificationcenter': {
    render: () => (
      <Frame name="notificationcenter" width={600} height={520}>
        <NotificationCenter
          defaultOpen
          now={Date.parse('2026-10-24T12:00:00Z')}
          onReadChange={noop}
          onDismiss={noop}
          onOpenItem={noop}
          items={[
            {
              id: 'approval',
              title: 'Project approved',
              description: 'Maya approved the customer portal scope.',
              timestamp: '2026-10-24T11:55:00Z',
              read: false,
              intent: 'success',
            },
            {
              id: 'invoice',
              title: 'Invoice due tomorrow',
              description: 'INV-2026-024 is ready for a payment reminder.',
              timestamp: '2026-10-24T11:30:00Z',
              read: true,
              intent: 'warning',
            },
          ]}
        />
      </Frame>
    ),
    parts: [
      part(
        'Unread trigger',
        '[data-anatomy="notificationcenter"] button',
        'Opens the inbox and carries its unread count.',
      ),
      part(
        'Inbox heading',
        '.aegis-sheet:has(.aegis-notification-center) .aegis-sheet-header',
        'Names the inbox and provides a close control.',
      ),
      part(
        'Search',
        '.aegis-notification-center input[type="search"]',
        'Filters notification titles and descriptions.',
      ),
      part(
        'Bulk read action',
        '.aegis-notification-center-tools',
        'Shows the unread total beside Mark all read.',
      ),
      part(
        'View tabs',
        '.aegis-notification-center [role="tablist"]',
        'Switches between all updates and unread updates.',
      ),
      part(
        'Notification content',
        '.aegis-notification-center-copy',
        'Combines the title, description, timestamp and read action.',
      ),
      part(
        'Intent icon',
        '.aegis-notification-center-icon',
        'Signals the type of update without changing its text hierarchy.',
      ),
      part(
        'Dismiss action',
        '.aegis-notification-center [aria-label="Dismiss Project approved"]',
        'Removes one notification through the host callback.',
      ),
    ],
    height: 700,
  },
  'patterns-onboardingchecklist': {
    render: () => (
      <Frame name="onboarding" width={680}>
        <div style={{ display: 'grid', gap: 28 }}>
          <OnboardingChecklist
            data-anatomy="onboarding-progress"
            title="Set up your workspace"
            description="Prepare the essentials for your team."
            onCompletedChange={noop}
            onDismiss={noop}
            items={[
              {
                id: 'details',
                title: 'Add workspace details',
                description: 'Name the workspace and add a description.',
                completed: true,
              },
              {
                id: 'team',
                title: 'Add your first team member',
                description: 'Choose who will collaborate on the project.',
                completed: false,
                actionLabel: 'Add member',
                onAction: noop,
              },
              {
                id: 'updates',
                title: 'Choose updates',
                description: 'Decide which notifications matter to you.',
                completed: false,
                optional: true,
              },
            ]}
          />
          <OnboardingChecklist
            data-anatomy="onboarding-complete"
            title="Project setup"
            description="The project is ready for your team."
            onCompletedChange={noop}
            onReset={noop}
            items={[{ id: 'ready', title: 'Confirm project details', completed: true }]}
          />
        </div>
      </Frame>
    ),
    parts: [
      part(
        'Title and description',
        '[data-anatomy="onboarding-progress"] .aegis-onboarding-heading > div:first-child',
        'Explains the goal of the checklist.',
      ),
      part(
        'Header controls',
        '[data-anatomy="onboarding-progress"] .aegis-onboarding-header-actions',
        'Collapses the steps or dismisses the checklist.',
      ),
      part(
        'Progress',
        '[data-anatomy="onboarding-progress"] .aegis-onboarding-progress',
        'Pairs the completed count with a progress bar.',
      ),
      part(
        'Step checkbox',
        '[data-anatomy="onboarding-progress"] [role="checkbox"]',
        'Shows and changes completion through the host callback.',
      ),
      part(
        'Step action',
        '[data-anatomy="onboarding-progress"] .aegis-onboarding-steps > li:nth-child(2) > button',
        'Starts the work needed to finish a step.',
      ),
      part(
        'Optional label',
        '[data-anatomy="onboarding-progress"] .aegis-checkbox-label small',
        'Distinguishes a nonrequired setup step.',
      ),
      part(
        'Completion footer',
        '[data-anatomy="onboarding-complete"] .aegis-onboarding-complete',
        'Confirms completion and offers a reset action.',
      ),
    ],
    note: 'The second instance shows the completion footer, which is hidden while steps remain.',
    height: 760,
  },
  'patterns-wizard-project-setup': {
    render: () => (
      <Frame name="wizard">
        <Wizard
          title="Create a project"
          description="Set up the people and context for delivery."
          orientation="vertical"
          currentStep={1}
          onStepChange={noop}
          onFinish={noop}
          onCancel={noop}
          steps={workflowSteps.map((step, index) => ({
            ...step,
            content:
              index === 1 ? (
                <>
                  <Field label="Project owner">
                    <Select
                      value="maya"
                      onValueChange={noop}
                      options={[
                        { value: 'maya', label: 'Maya Chen' },
                        { value: 'alex', label: 'Alex Morgan' },
                      ]}
                    />
                  </Field>
                  <Textarea
                    label="Team instructions"
                    defaultValue="Review the customer brief before the first planning session."
                    rows={3}
                  />
                </>
              ) : (
                <ProjectFields />
              ),
          }))}
        />
      </Frame>
    ),
    parts: [
      part(
        'Progress card',
        '[data-anatomy="wizard"] .aegis-wizard-progress',
        'Shows the ordered steps separately from the form.',
      ),
      part(
        'Form heading',
        '[data-anatomy="wizard"] .aegis-wizard-header',
        'Names the overall setup flow.',
      ),
      part(
        'Current step heading',
        '[data-anatomy="wizard"] .aegis-wizard-step-heading',
        'States the current position and the task to complete.',
      ),
      part(
        'Step fields',
        '[data-anatomy="wizard"] .aegis-wizard-step-content',
        'Contains only the fields for the current stage.',
      ),
      part(
        'Cancel action',
        '[data-anatomy="wizard"] .aegis-wizard-footer > div:first-child',
        'Exits the flow, with a guard when the host marks it dirty.',
      ),
      part(
        'Step navigation',
        '[data-anatomy="wizard"] .aegis-wizard-footer > div:last-child',
        'Moves backward or validates and advances the current step.',
      ),
    ],
    height: 600,
  },
  'patterns-ai-promptinput': {
    render: () => (
      <Frame name="prompt" width={760}>
        <PromptInput
          defaultValue="Summarize the customer portal and suggest the next milestone."
          context={context}
          availableContext={context}
          onContextChange={noop}
          onSend={noop}
        />
      </Frame>
    ),
    parts: [
      part(
        'Attached context',
        '[data-anatomy="prompt"] .aegis-prompt-context',
        'Shows removable records included with the next request.',
      ),
      part(
        'Message field',
        '[data-anatomy="prompt"] textarea',
        'Accepts the prompt, with Enter to send and Shift+Enter for a new line.',
      ),
      part(
        'Attach action',
        '[data-anatomy="prompt"] [aria-label="Attach context"]',
        'Adds an available record or resource to the request.',
      ),
      part(
        'Prompt commands',
        '[data-anatomy="prompt"] [aria-label="Prompt commands"]',
        'Offers reusable instructions for common tasks.',
      ),
      part(
        'Keyboard hint',
        '[data-anatomy="prompt"] .aegis-prompt-hint',
        'Explains the message keyboard behavior.',
      ),
      part(
        'Send action',
        '[data-anatomy="prompt"] [aria-label="Send message"]',
        'Submits the nonempty prompt together with attached context.',
      ),
    ],
    height: 300,
  },
  'patterns-ai-aipanel': {
    render: () => (
      <Frame name="aipanel" width={620}>
        <div style={{ display: 'flex', height: 670 }}>
          <AiPanel
            open
            docked
            resizable
            onOpenChange={noop}
            size="md"
            title="Aegis AI"
            modelLabel="Workspace assistant"
            scopeLabel="Customer portal"
            context={context}
            availableContext={context}
            initialMessages={messages}
            onEvidenceClick={noop}
            onFeedback={noop}
          />
        </div>
      </Frame>
    ),
    parts: [
      part(
        'Assistant identity',
        '[data-anatomy="aipanel"] .aegis-ai-panel-title',
        'Names the assistant with its AI intent marker.',
      ),
      part(
        'Model and scope',
        '[data-anatomy="aipanel"] .aegis-sheet-description',
        'Clarifies the model label and workspace context.',
      ),
      part(
        'Visible context',
        '[data-anatomy="aipanel"] .aegis-ai-panel-context',
        'Shows the records available to this conversation.',
      ),
      part(
        'Conversation',
        '[data-anatomy="aipanel"] .aegis-ai-transcript',
        'Contains user messages, assistant responses and citations.',
      ),
      part(
        'Composer',
        '[data-anatomy="aipanel"] .aegis-prompt',
        'Keeps the next request and attachment controls at the bottom.',
      ),
      part(
        'Review reminder',
        '[data-anatomy="aipanel"] .aegis-ai-panel-disclaimer',
        'Reminds the user to review suggestions before acting.',
      ),
      part(
        'Close control',
        '[data-anatomy="aipanel"] [aria-label="Close AI panel"]',
        'Hides the panel while preserving its conversation state.',
      ),
    ],
    height: 730,
  },
  'patterns-ai-aidiffreview': {
    render: () => (
      <Frame name="aireview">
        <AiDiffReview
          documentName="Project handoff workflow"
          summary="Notify the project channel when a review is ready, while keeping the existing owner assignment."
          provenance="Suggested from the supplied workflow and project context."
          confidence="high"
          original={
            'name: Project handoff\nenabled: true\nactions:\n  - type: assign\n    value: maya\n'
          }
          proposed={
            'name: Project handoff\nenabled: true\nactions:\n  - type: assign\n    value: maya\n  - type: notify\n    value: project-channel\n'
          }
          defaultMode="split"
          maxHeight={240}
          onApprove={noop}
          onReject={noop}
        />
      </Frame>
    ),
    parts: [
      part(
        'Review heading',
        '[data-anatomy="aireview"] .aegis-ai-review-heading',
        'Names the review and the affected document.',
      ),
      part(
        'Proposal summary',
        '[data-anatomy="aireview"] .aegis-ai-card',
        'Explains the proposed change, confidence and provenance.',
      ),
      part(
        'Diff controls',
        '[data-anatomy="aireview"] .aegis-diff-toolbar',
        'Switches the comparison mode and navigates changes.',
      ),
      part(
        'Change comparison',
        '[data-anatomy="aireview"] .aegis-diff-host',
        'Shows removed and added lines in the actual document.',
      ),
      part(
        'Review guidance',
        '[data-anatomy="aireview"] .aegis-ai-review-guidance',
        'Requires an explicit review before approval.',
      ),
      part(
        'Decision actions',
        '[data-anatomy="aireview"] .aegis-ai-review-actions',
        'Keeps rejection and approval distinct, with guarded async handling.',
      ),
    ],
    height: 700,
  },
};
