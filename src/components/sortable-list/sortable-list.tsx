import { useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { IconButton } from '@/components/icon-button';
import { ArrowDown, ArrowUp, GripVertical } from '@/components/icon';
import { componentToken } from '@/lib/component-design-tokens';
import { cn } from '@/lib/utils';
import './sortable-list.css';

export interface SortableListItem {
  id: string;
  label: string;
  description?: string;
}
export interface SortableListChange {
  activeId: string;
  overId: string;
  source: 'drag' | 'move-button';
}
export interface SortableListProps {
  label: string;
  items: readonly SortableListItem[];
  onReorder: (ids: string[], details: SortableListChange) => void;
  disabled?: boolean;
  renderItem?: (item: SortableListItem) => ReactNode;
  emptyText?: string;
  className?: string;
}
export function assertSortableIds(items: readonly SortableListItem[]): void {
  if (
    items.some((item) => typeof item.id !== 'string' || !item.id.trim()) ||
    new Set(items.map((item) => item.id)).size !== items.length
  )
    throw new TypeError('SortableList items require unique, nonempty stable string ids.');
}
export function reorderIds(ids: readonly string[], activeId: string, overId: string): string[] {
  const from = ids.indexOf(activeId);
  const to = ids.indexOf(overId);
  return from < 0 || to < 0 || from === to ? [...ids] : arrayMove([...ids], from, to);
}
function Row({
  item,
  index,
  count,
  disabled,
  renderItem,
  move,
}: {
  item: SortableListItem;
  index: number;
  count: number;
  disabled: boolean;
  renderItem?: SortableListProps['renderItem'];
  move: (id: string, offset: number) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } =
    useSortable({ id: item.id, disabled, transition: null });
  const style: CSSProperties = { transform: CSS.Transform.toString(transform) };
  const iconSize = componentToken('data-display.icon-sm');
  return (
    <li
      ref={setNodeRef}
      style={style}
      className="aegis-sortable-item"
      data-dragging={isDragging || undefined}
      data-item-id={item.id}
    >
      <span
        className="aegis-sortable-handle"
        ref={(node) => setActivatorNodeRef(node?.querySelector('button') ?? null)}
      >
        <IconButton
          {...attributes}
          {...listeners}
          tooltip={false}
          emphasis="ghost"
          size="sm"
          disabled={disabled}
          aria-label={`Reorder ${item.label}`}
        >
          <GripVertical size={iconSize} aria-hidden="true" />
        </IconButton>
      </span>
      <div className="aegis-sortable-content">
        {renderItem ? (
          renderItem(item)
        ) : (
          <>
            <span>{item.label}</span>
            {item.description && (
              <span className="aegis-sortable-description">{item.description}</span>
            )}
          </>
        )}
      </div>
      <div className="aegis-sortable-actions">
        <IconButton
          tooltip={false}
          emphasis="ghost"
          size="sm"
          disabled={disabled || index === 0}
          aria-label={`Move ${item.label} up`}
          onClick={() => move(item.id, -1)}
        >
          <ArrowUp size={iconSize} aria-hidden="true" />
        </IconButton>
        <IconButton
          tooltip={false}
          emphasis="ghost"
          size="sm"
          disabled={disabled || index === count - 1}
          aria-label={`Move ${item.label} down`}
          onClick={() => move(item.id, 1)}
        >
          <ArrowDown size={iconSize} aria-hidden="true" />
        </IconButton>
      </div>
    </li>
  );
}
/** A controlled vertical list with real pointer/keyboard sensors and explicit move actions. */
export function SortableList({
  label,
  items,
  onReorder,
  disabled = false,
  renderItem,
  emptyText = 'No items',
  className,
}: SortableListProps) {
  assertSortableIds(items);
  const contextId = useId();
  const [announcement, setAnnouncement] = useState('');
  const startingOrder = useRef<string | undefined>(undefined);
  const ids = items.map((item) => item.id);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      scrollBehavior: 'auto',
    }),
  );
  const name = (id: string | number) => items.find((item) => item.id === id)?.label ?? String(id);
  const move = (id: string, offset: number) => {
    const index = ids.indexOf(id);
    const overId = ids[index + offset];
    if (disabled || index < 0 || !overId) return;
    onReorder(reorderIds(ids, id, overId), { activeId: id, overId, source: 'move-button' });
    setAnnouncement(`Requested ${name(id)} at position ${index + offset + 1} of ${items.length}.`);
  };
  return (
    <div className={cn('aegis-sortable-list', className)}>
      <DndContext
        id={contextId}
        sensors={sensors}
        collisionDetection={closestCenter}
        accessibility={{
          screenReaderInstructions: {
            draggable:
              'Press Space to pick up. Use arrow keys to move. Press Space to drop or Escape to cancel. Move up and down buttons are also available.',
          },
          announcements: {
            onDragStart: ({ active }) => `Picked up ${name(active.id)}.`,
            onDragOver: ({ active, over }) =>
              over
                ? `${name(active.id)} over position ${ids.indexOf(String(over.id)) + 1} of ${items.length}.`
                : 'Outside the list.',
            onDragEnd: ({ active, over }) =>
              over ? `Finished dragging ${name(active.id)}.` : 'Reorder cancelled.',
            onDragCancel: () => 'Reorder cancelled.',
          },
        }}
        onDragStart={() => {
          startingOrder.current = JSON.stringify(ids);
        }}
        onDragCancel={() => {
          startingOrder.current = undefined;
        }}
        onDragEnd={({ active, over }) => {
          const stable = startingOrder.current === JSON.stringify(ids);
          startingOrder.current = undefined;
          if (!stable) {
            setAnnouncement('The list changed during dragging. No move was applied.');
            return;
          }
          if (disabled || !over || active.id === over.id) return;
          const activeId = String(active.id);
          const overId = String(over.id);
          onReorder(reorderIds(ids, activeId, overId), { activeId, overId, source: 'drag' });
        }}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ul className="aegis-sortable-items" aria-label={label}>
            {items.map((item, index) => (
              <Row
                key={item.id}
                item={item}
                index={index}
                count={items.length}
                disabled={disabled}
                renderItem={renderItem}
                move={move}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      {!items.length && <p>{emptyText}</p>}
      <span className="sr-only" role="status" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}
