import { SortableList } from '@/components/sortable-list';
import type { AnatomyDefinition } from './types';
export const sortableListAnatomy: AnatomyDefinition = {
  render: () => (
    <div data-anatomy="sortable-list">
      <SortableList
        label="Release stages"
        items={[
          { id: 'review', label: 'Review', description: 'Check acceptance criteria' },
          { id: 'release', label: 'Release', description: 'Publish the approved version' },
        ]}
        onReorder={() => {}}
      />
    </div>
  ),
  parts: [
    {
      name: 'Semantic list',
      description: 'The host array determines item order and stable identities.',
      selector: '[data-anatomy="sortable-list"] ul',
      anchor: 'top-left',
    },
    {
      name: 'Drag handle',
      description: 'A real button starts pointer or keyboard dragging.',
      selector: '[data-anatomy="sortable-list"] .aegis-sortable-handle',
      anchor: 'left',
    },
    {
      name: 'Item content',
      description:
        'Label and optional description; custom renderers retain the host accessibility obligation.',
      selector: '[data-anatomy="sortable-list"] .aegis-sortable-content',
      anchor: 'bottom',
    },
    {
      name: 'Explicit move actions',
      description: 'Up/down buttons provide an alternative to dragging and disable at boundaries.',
      selector: '[data-anatomy="sortable-list"] .aegis-sortable-actions',
      anchor: 'right',
    },
  ],
  note: 'The specimen keeps its original order. Interactive stories accept the emitted ID order and test keyboard drag and cancellation.',
};
