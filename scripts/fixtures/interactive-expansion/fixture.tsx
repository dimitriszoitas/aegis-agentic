import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@/package/reset.css';
import '@/package/styles.css';
import { Button } from '@/components/button';
import { InlineEdit } from '@/components/inline-edit';
import {
  RichTextEditor,
  emptyRichTextDocument,
  type RichTextDocument,
} from '@/components/rich-text-editor';
import { SortableList } from '@/components/sortable-list';
import { FilePreview } from '@/components/file-preview';
import './fixture.css';
const image =
  'data:image/png;base64,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';
function Fixture() {
  const [value, setValue] = useState('Atlas');
  const [fail, setFail] = useState(true);
  const [doc, setDoc] = useState<RichTextDocument>(emptyRichTextDocument);
  const [locked, setLocked] = useState(false);
  const [submitted, setSubmitted] = useState('');
  const [items, setItems] = useState([
    { id: 'one', label: 'One' },
    { id: 'two', label: 'Two' },
    { id: 'three', label: 'Three' },
  ]);
  return (
    <main>
      <h1>Interactive components</h1>
      <section aria-label="Inline editing">
        <InlineEdit
          label="Project"
          value={value}
          validate={(draft) => (draft.length < 3 ? 'Use three characters.' : undefined)}
          onSave={async (next) => {
            if (fail) throw new Error('Unavailable');
            setValue(next);
          }}
        />
        <Button onClick={() => setFail(false)}>Allow save</Button>
        <Button onClick={() => setValue('Server value')}>External value</Button>
      </section>
      <section aria-label="Rich text">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted(String(new FormData(event.currentTarget).get('body')));
          }}
        >
          <RichTextEditor
            label="Message"
            name="body"
            value={doc}
            onValueChange={setDoc}
            readOnly={locked}
          />
          <Button type="submit">Submit document</Button>
        </form>
        <Button onClick={() => setLocked(!locked)}>Toggle read only</Button>
        <Button
          onClick={() =>
            setDoc({
              type: 'doc',
              content: [
                { type: 'paragraph', content: [{ type: 'text', text: 'External document' }] },
              ],
            })
          }
        >
          Replace document
        </Button>
        <output aria-label="Submitted document">{submitted}</output>
      </section>
      <section aria-label="Reordering">
        <SortableList
          label="Steps"
          items={items}
          onReorder={(ids) =>
            setItems((current) => ids.map((id) => current.find((item) => item.id === id)!))
          }
        />
      </section>
      <section aria-label="Image file">
        <FilePreview
          file={{ name: 'Sample.png', mimeType: 'image/png', size: 9987, url: image }}
          imageAlt="Sample raster"
        />
      </section>
      <section aria-label="Document file">
        <FilePreview
          file={{ name: 'Brief.pdf', mimeType: 'application/pdf', size: 2048, url: '/example.pdf' }}
        />
      </section>
    </main>
  );
}
createRoot(document.getElementById('root')!).render(<Fixture />);
