import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from 'react';
import {
  EditorContent,
  getSchema,
  useEditor,
  useEditorState,
  type JSONContent,
} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Toolbar } from '@base-ui/react/toolbar';
import { Button } from '@/components/button';
import { Field, useFieldControl } from '@/components/field';
import { TextInput } from '@/components/text-input';
import { Modal } from '@/components/modal';
import { cn } from '@/lib/utils';
import './rich-text-editor.css';

export type RichTextDocument = JSONContent;
export const emptyRichTextDocument: RichTextDocument = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};
export function safeRichTextHref(value: string): string | undefined {
  if (
    Array.from(value).some(
      (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    )
  )
    return undefined;
  const href = value.trim();
  if (!href) return undefined;
  try {
    return ['http:', 'https:', 'mailto:'].includes(new URL(href, 'https://aegis.invalid').protocol)
      ? href
      : undefined;
  } catch {
    return undefined;
  }
}
const extensions = [
  StarterKit.configure({
    blockquote: false,
    code: false,
    codeBlock: false,
    heading: false,
    horizontalRule: false,
    strike: false,
    underline: false,
    dropcursor: false,
    gapcursor: false,
    trailingNode: false,
    link: {
      openOnClick: false,
      autolink: false,
      isAllowedUri: (href) => Boolean(safeRichTextHref(href)),
      HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer nofollow' },
    },
  }),
];
const schema = getSchema(extensions);
/** Validate against the actual installed editor schema and reject unsafe link destinations. */
export function normalizeRichTextDocument(value: RichTextDocument): RichTextDocument {
  if (value.type !== 'doc') throw new TypeError('RichTextEditor requires a doc node.');
  const document = schema.nodeFromJSON(value);
  document.check();
  document.descendants((node) => {
    for (const mark of node.marks)
      if (mark.type.name === 'link' && !safeRichTextHref(String(mark.attrs.href ?? '')))
        throw new TypeError('RichTextEditor links require HTTP(S), mailto or relative URLs.');
  });
  return document.toJSON();
}
export interface RichTextEditorHandle {
  focus: () => void;
  getDocument: () => RichTextDocument;
}
export interface RichTextEditorProps {
  label?: string;
  value?: RichTextDocument;
  defaultValue?: RichTextDocument;
  onValueChange?: (document: RichTextDocument) => void;
  id?: string;
  name?: string;
  form?: string;
  disabled?: boolean;
  readOnly?: boolean;
  invalid?: boolean;
  required?: boolean;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  className?: string;
  showToolbar?: boolean;
}
/** Schema-based rich text with Tiptap/ProseMirror selection, editing, clipboard and history. */
export const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(
  function RichTextEditor(
    {
      label,
      value,
      defaultValue = emptyRichTextDocument,
      onValueChange,
      id,
      name,
      form,
      disabled,
      readOnly = false,
      invalid,
      required,
      'aria-label': ariaLabel,
      'aria-labelledby': labelledBy,
      'aria-describedby': describedBy,
      className,
      showToolbar = true,
    },
    ref,
  ) {
    const labelId = `aegis-rich-text-label-${useId()}`;
    const control = useFieldControl({
      id,
      disabled,
      invalid,
      required,
      'aria-labelledby': labelledBy ?? (label ? labelId : undefined),
      'aria-describedby': describedBy,
    });
    const {
      id: controlId,
      disabled: controlDisabled,
      required: controlRequired,
      'aria-invalid': controlInvalid,
      'aria-labelledby': controlLabelledBy,
      'aria-describedby': controlDescribedBy,
    } = control;
    const initial = useRef(normalizeRichTextDocument(value ?? defaultValue));
    const controlled =
      value === undefined ? undefined : JSON.stringify(normalizeRichTextDocument(value));
    const [linkOpen, setLinkOpen] = useState(false);
    const [linkHref, setLinkHref] = useState('');
    const [linkError, setLinkError] = useState<string>();
    const blocked = Boolean(controlDisabled || readOnly);
    const editor = useEditor({
      extensions,
      content: initial.current,
      immediatelyRender: false,
      editable: !blocked,
      onUpdate: ({ editor: active }) => onValueChange?.(active.getJSON()),
    });
    const state = useEditorState({
      editor,
      selector: ({ editor: active }) =>
        active
          ? {
              json: JSON.stringify(active.getJSON()),
              bold: active.isActive('bold'),
              italic: active.isActive('italic'),
              bulletList: active.isActive('bulletList'),
              orderedList: active.isActive('orderedList'),
              link: active.isActive('link'),
              undo: active.can().undo(),
              redo: active.can().redo(),
            }
          : null,
    });
    useEffect(() => {
      if (editor && controlled !== undefined && JSON.stringify(editor.getJSON()) !== controlled)
        editor
          .chain()
          .setContent(JSON.parse(controlled), { emitUpdate: false })
          .setMeta('addToHistory', false)
          .run();
    }, [editor, controlled, state?.json]);
    useEffect(() => {
      editor?.setEditable(!blocked, false);
      editor?.setOptions({
        editorProps: {
          attributes: {
            id: controlId,
            class: 'aegis-rich-text-content',
            role: 'textbox',
            'aria-multiline': 'true',
            'aria-label': ariaLabel ?? '',
            'aria-labelledby': controlLabelledBy ?? '',
            'aria-describedby': controlDescribedBy ?? '',
            'aria-invalid': String(Boolean(controlInvalid)),
            'aria-required': String(Boolean(controlRequired)),
            'aria-readonly': String(readOnly),
            'aria-disabled': String(Boolean(controlDisabled)),
            tabindex: controlDisabled ? '-1' : '0',
          },
        },
      });
    }, [
      editor,
      blocked,
      ariaLabel,
      controlId,
      controlLabelledBy,
      controlDescribedBy,
      controlInvalid,
      controlRequired,
      controlDisabled,
      readOnly,
    ]);
    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          editor?.commands.focus();
        },
        getDocument: () => editor?.getJSON() ?? initial.current,
      }),
      [editor],
    );
    const applyLink = () => {
      if (!editor || blocked) return;
      const href = safeRichTextHref(linkHref);
      if (linkHref.trim() && !href) {
        setLinkError('Use an HTTP(S), mailto or relative URL.');
        return;
      }
      const chain = editor.chain().focus().extendMarkRange('link');
      if (href) chain.setLink({ href }).run();
      else chain.unsetLink().run();
      setLinkOpen(false);
    };
    const toolbarButton = (
      title: string,
      action: () => void,
      pressed?: boolean,
      inactive = false,
    ) => (
      <Toolbar.Button
        key={title}
        disabled={blocked || !editor || inactive}
        aria-pressed={pressed}
        render={<Button size="sm" emphasis={pressed ? 'secondary' : 'ghost'} />}
        onMouseDown={(event) => event.preventDefault()}
        onClick={action}
      >
        {title}
      </Toolbar.Button>
    );
    return (
      <div
        className={cn('aegis-rich-text-editor', className)}
        data-disabled={controlDisabled || undefined}
        data-invalid={controlInvalid || undefined}
      >
        {label && (
          <label id={labelId} htmlFor={controlId} className="aegis-rich-text-label">
            {label}
          </label>
        )}
        {showToolbar && (
          <Toolbar.Root className="aegis-rich-text-toolbar" aria-label="Text formatting">
            {toolbarButton(
              'Bold',
              () => {
                editor?.chain().focus().toggleBold().run();
              },
              state?.bold,
            )}
            {toolbarButton(
              'Italic',
              () => {
                editor?.chain().focus().toggleItalic().run();
              },
              state?.italic,
            )}
            {toolbarButton(
              'Bullet list',
              () => {
                editor?.chain().focus().toggleBulletList().run();
              },
              state?.bulletList,
            )}
            {toolbarButton(
              'Numbered list',
              () => {
                editor?.chain().focus().toggleOrderedList().run();
              },
              state?.orderedList,
            )}
            {toolbarButton(
              'Link',
              () => {
                setLinkHref(editor?.getAttributes('link').href ?? '');
                setLinkError(undefined);
                setLinkOpen(true);
              },
              state?.link,
            )}
            {toolbarButton(
              'Undo',
              () => {
                editor?.chain().focus().undo().run();
              },
              undefined,
              !state?.undo,
            )}
            {toolbarButton(
              'Redo',
              () => {
                editor?.chain().focus().redo().run();
              },
              undefined,
              !state?.redo,
            )}
          </Toolbar.Root>
        )}
        <EditorContent editor={editor} />
        {name && (
          <input
            type="hidden"
            name={name}
            form={form}
            disabled={controlDisabled}
            value={state?.json ?? JSON.stringify(initial.current)}
          />
        )}
        <Modal
          open={linkOpen}
          onOpenChange={setLinkOpen}
          title="Edit link"
          description="Apply a link to the selected text. Leave the URL empty to remove the link."
          footer={
            <>
              <Button onClick={applyLink} disabled={blocked}>
                Apply link
              </Button>
              <Button emphasis="secondary" onClick={() => setLinkOpen(false)}>
                Cancel
              </Button>
            </>
          }
        >
          <Field label="Link URL" error={linkError}>
            <TextInput
              value={linkHref}
              onValueChange={(next) => {
                setLinkHref(next);
                setLinkError(undefined);
              }}
              disabled={blocked}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  applyLink();
                }
              }}
            />
          </Field>
        </Modal>
      </div>
    );
  },
);
