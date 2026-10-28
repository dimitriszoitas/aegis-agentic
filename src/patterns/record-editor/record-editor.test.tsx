import { renderToStaticMarkup as render } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { RecordEditor, type RecordEditorProps } from './record-editor';
const record = { name: 'Alex' };
const props: RecordEditorProps<typeof record> = {
  recordId: 'one',
  record,
  version: 'opaque-v1',
  title: 'Contact',
  createDraft: (value) => ({ ...value }),
  isEqual: (a, b) => a.name === b.name,
  renderView: (value) => <p>{value.name}</p>,
  renderFields: ({ draft, disabled }) => (
    <input name="name" defaultValue={draft.name} disabled={disabled} />
  ),
  onSave: async (value) => ({ record: value, version: 'opaque-v2' }),
};
describe('RecordEditor native boundaries', () => {
  it('starts in read mode without inventing deletion or a form', () => {
    const html = render(<RecordEditor {...props} />);
    expect(html).toContain('Alex');
    expect(html).not.toContain('<form');
    expect(html).not.toContain('Delete record');
  });
  it('creates one native form and passes explicit disabled state to host fields', () => {
    const html = render(<RecordEditor {...props} defaultEditing disabled />);
    expect(html.match(/<form/g)).toHaveLength(1);
    expect(html).toContain('aria-label="Edit Contact"');
    expect(html).toContain('<fieldset');
    expect(html.match(/<input[^>]*>/)?.[0]).toContain('disabled=""');
  });
  it('clones through the host factory and only shows save/discard when its comparator says dirty', () => {
    const html = render(
      <RecordEditor
        {...props}
        defaultEditing
        createDraft={(value) => ({ ...value, name: 'New draft' })}
      />,
    );
    expect(record.name).toBe('Alex');
    expect(html).toContain('value="New draft"');
    expect(html).toContain('Save changes');
    expect(html).toContain('Discard');
  });
});
