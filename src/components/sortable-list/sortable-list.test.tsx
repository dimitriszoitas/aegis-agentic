import { describe, expect, it } from 'vitest';
import { assertSortableIds, reorderIds } from './sortable-list';
describe('SortableList identity and reorder contract', () => {
  it('requires unique nonempty stable IDs, independent from duplicate display labels', () => {
    expect(() =>
      assertSortableIds([
        { id: 'a', label: 'Item' },
        { id: 'b', label: 'Item' },
      ]),
    ).not.toThrow();
    for (const ids of [['a', 'a'], [''], ['  ']])
      expect(() => assertSortableIds(ids.map((id) => ({ id, label: 'Item' })))).toThrow();
  });
  it('preserves item identity and input order while moving in both directions', () => {
    const ids = Object.freeze(['a', 'b', 'c']);
    expect(reorderIds(ids, 'a', 'c')).toEqual(['b', 'c', 'a']);
    expect(reorderIds(ids, 'c', 'a')).toEqual(['c', 'a', 'b']);
    expect(ids).toEqual(['a', 'b', 'c']);
    expect(reorderIds(ids, 'missing', 'b')).toEqual(ids);
    expect(reorderIds(ids, 'a', 'missing')).toEqual(ids);
    expect(reorderIds(ids, 'a', 'a')).toEqual(ids);
  });
});
