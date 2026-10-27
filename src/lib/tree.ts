/** The selection model stores leaf IDs only; parent state is always derived. */
export interface TreeNode {
  id: string;
  label: string;
  disabled?: boolean;
  children?: readonly TreeNode[];
}

export type TreeCheckState = boolean | 'indeterminate';

/** Disabled branches do not participate in parent selection propagation. */
export function getTreeLeafIds(node: TreeNode, includeDisabled = false): string[] {
  if (node.disabled && !includeDisabled) return [];
  if (!node.children?.length) return [node.id];
  return node.children.flatMap((child) => getTreeLeafIds(child, includeDisabled));
}

export function getTreeCheckState(node: TreeNode, selectedIds: ReadonlySet<string> | readonly string[]): TreeCheckState {
  const selected = selectedIds instanceof Set ? selectedIds : new Set(selectedIds);
  const enabledLeaves = getTreeLeafIds(node);
  const leaves = enabledLeaves.length ? enabledLeaves : getTreeLeafIds(node, true);
  const count = leaves.filter((id) => selected.has(id)).length;
  return count === 0 ? false : count === leaves.length ? true : 'indeterminate';
}

export function findTreePath(nodes: readonly TreeNode[], id: string): TreeNode[] | undefined {
  for (const node of nodes) {
    if (node.id === id) return [node];
    const childPath = node.children ? findTreePath(node.children, id) : undefined;
    if (childPath) return [node, ...childPath];
  }
  return undefined;
}

/** Mixed parents toggle to fully checked; disabled selections remain untouched. */
export function toggleTreeSelection(nodes: readonly TreeNode[], id: string, selectedIds: readonly string[], checked?: boolean): string[] {
  const path = findTreePath(nodes, id);
  if (!path || path.some((node) => node.disabled)) return [...selectedIds];
  const node = path[path.length - 1];
  const next = new Set(selectedIds);
  const shouldCheck = checked ?? getTreeCheckState(node, next) !== true;
  for (const leafId of getTreeLeafIds(node)) {
    if (shouldCheck) next.add(leafId);
    else next.delete(leafId);
  }
  return [...next];
}

export interface VisibleTreeNode<T extends TreeNode = TreeNode> {
  node: T;
  parentId?: string;
  level: number;
  position: number;
  siblings: number;
  disabled: boolean;
}

/** Visible order also defines keyboard navigation and ARIA positional metadata. */
export function flattenVisibleTree<T extends TreeNode>(nodes: readonly T[], expandedIds: ReadonlySet<string> | readonly string[]): VisibleTreeNode<T>[] {
  const expanded = expandedIds instanceof Set ? expandedIds : new Set(expandedIds);
  const result: VisibleTreeNode<T>[] = [];
  function visit(items: readonly T[], level: number, parentId?: string, inheritedDisabled = false) {
    items.forEach((node, index) => {
      const disabled = inheritedDisabled || Boolean(node.disabled);
      result.push({ node, level, parentId, disabled, position: index + 1, siblings: items.length });
      if (node.children?.length && expanded.has(node.id)) visit(node.children as readonly T[], level + 1, node.id, disabled);
    });
  }
  visit(nodes, 1);
  return result;
}
