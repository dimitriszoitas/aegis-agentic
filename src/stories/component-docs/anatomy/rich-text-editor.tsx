import { RichTextEditor } from '@/components/rich-text-editor';
import type { AnatomyDefinition } from './types';
export const richTextEditorAnatomy: AnatomyDefinition = {
  render: () => (
    <div data-anatomy="rich-text-editor">
      <RichTextEditor
        label="Release notes"
        defaultValue={{
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'A useful update', marks: [{ type: 'bold' }] }],
            },
          ],
        }}
      />
    </div>
  ),
  parts: [
    {
      name: 'Editor name',
      description:
        'Visible label associated through aria-labelledby with the contenteditable textbox.',
      selector: '[data-anatomy="rich-text-editor"] label',
      anchor: 'top-left',
    },
    {
      name: 'Formatting toolbar',
      description: 'Base UI toolbar navigation and shared buttons invoke Tiptap commands.',
      selector: '[data-anatomy="rich-text-editor"] [role="toolbar"]',
      anchor: 'top-right',
    },
    {
      name: 'Rich text surface',
      description: 'ProseMirror owns selection, editing, formatting, paste schema and history.',
      selector: '[data-anatomy="rich-text-editor"] [role="textbox"]',
      anchor: 'bottom',
    },
  ],
  note: 'Link editing uses the shared Modal and a URL-validated TextInput. Required state is announced, while the host validates document content before form submission.',
};
