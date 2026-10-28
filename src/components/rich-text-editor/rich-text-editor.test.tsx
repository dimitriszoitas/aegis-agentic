import { describe, expect, it } from 'vitest';
import { normalizeRichTextDocument, safeRichTextHref } from './rich-text-editor';
describe('RichTextEditor installed schema boundary', () => {
  it('accepts paragraphs, emphasis, links and real list structure', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: 'Linked',
                      marks: [
                        { type: 'bold' },
                        { type: 'link', attrs: { href: 'https://example.com' } },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(normalizeRichTextDocument(doc).content?.[0].type).toBe('bulletList');
  });
  it('rejects unsupported content, malformed nesting and unsafe links before accepting controlled state', () => {
    const invalid = [
      { type: 'paragraph' },
      { type: 'doc', content: [{ type: 'image', attrs: { src: 'x' } }] },
      { type: 'doc', content: [{ type: 'text', text: 'Unwrapped' }] },
      {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Unsafe',
                marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }],
              },
            ],
          },
        ],
      },
    ];
    for (const value of invalid) expect(() => normalizeRichTextDocument(value)).toThrow();
  });
  it('rejects executable protocols and control-character obfuscation', () => {
    for (const href of ['javascript:alert(1)', 'data:text/html,hello', 'java\nscript:alert(1)', ''])
      expect(safeRichTextHref(href)).toBeUndefined();
    for (const href of ['https://example.com', '/help', 'mailto:help@example.com'])
      expect(safeRichTextHref(href)).toBe(href);
  });
});
