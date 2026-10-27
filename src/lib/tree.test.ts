import { describe, expect, it } from 'vitest';
import { flattenVisibleTree, getTreeCheckState, toggleTreeSelection, type TreeNode } from './tree';

const tree: TreeNode[] = [
  { id: 'endpoint', label: 'Endpoint', children: [
    { id: 'windows', label: 'Windows', children: [{ id: 'ath', label: 'WS-ATH-114' }, { id: 'lon', label: 'WS-LON-082' }] },
    { id: 'linux', label: 'Linux', children: [{ id: 'prod', label: 'SRV-PROD-09' }, { id: 'offline', label: 'SRV-DR-02', disabled: true }] },
  ] },
  { id: 'identity', label: 'Identity', children: [{ id: 'entra', label: 'Microsoft Entra ID' }] },
];

describe('tree selection and navigation', () => {
  it('derives unchecked, mixed and checked ancestors from nested leaf selection', () => {
    expect(getTreeCheckState(tree[0], [])).toBe(false);
    expect(getTreeCheckState(tree[0], ['ath'])).toBe('indeterminate');
    expect(getTreeCheckState(tree[0], ['ath', 'lon', 'prod'])).toBe(true);
    expect(getTreeCheckState(tree[0], ['endpoint'])).toBe(false);
  });
  it('checks and unchecks a branch recursively without losing unrelated selection', () => {
    const checked = toggleTreeSelection(tree, 'endpoint', ['entra']);
    expect(checked).toEqual(['entra', 'ath', 'lon', 'prod']);
    expect(toggleTreeSelection(tree, 'windows', checked)).toEqual(['entra', 'prod']);
    expect(toggleTreeSelection(tree, 'endpoint', checked, false)).toEqual(['entra']);
  });
  it('promotes mixed parents to checked and preserves disabled descendant selections', () => {
    expect(toggleTreeSelection(tree, 'endpoint', ['ath', 'offline'])).toEqual(['ath', 'offline', 'lon', 'prod']);
    expect(toggleTreeSelection(tree, 'endpoint', ['ath', 'offline'], false)).toEqual(['offline']);
    const locked: TreeNode[] = [{ id: 'managed', label: 'Managed sources', disabled: true, children: [{ id: 'audit', label: 'Audit stream' }] }];
    expect(toggleTreeSelection(locked, 'audit', [])).toEqual([]);
  });
  it('flattens only expanded branches with correct hierarchy and disabled metadata', () => {
    const visible = flattenVisibleTree(tree, ['endpoint', 'linux']);
    expect(visible.map(({ node }) => node.id)).toEqual(['endpoint', 'windows', 'linux', 'prod', 'offline', 'identity']);
    expect(visible.find(({ node }) => node.id === 'linux')).toMatchObject({ parentId: 'endpoint', level: 2, position: 2, siblings: 2 });
    expect(visible.find(({ node }) => node.id === 'offline')).toMatchObject({ parentId: 'linux', level: 3, disabled: true });
    expect(flattenVisibleTree(tree, []).map(({ node }) => node.id)).toEqual(['endpoint', 'identity']);
  });
});
