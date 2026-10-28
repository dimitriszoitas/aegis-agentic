import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FilePreview, formatFileSize, isPreviewImage, safeFileUrl } from './file-preview';
describe('FilePreview content boundary', () => {
  it('rejects executable and document data URLs while permitting controlled raster sources', () => {
    for (const url of [
      'javascript:alert(1)',
      'data:text/html;base64,PHNjcmlwdD4=',
      'data:image/svg+xml;base64,PHN2Zz4=',
      'java\nscript:alert(1)',
      'file:///private/secret',
      '   ',
    ])
      expect(safeFileUrl(url)).toBeUndefined();
    for (const url of [
      '/files/photo.png',
      'https://example.com/photo.png',
      'blob:https://example.com/id',
      'data:image/png;base64,AAAA',
    ])
      expect(safeFileUrl(url)).toBe(url);
  });
  it('does not embed documents, SVG, HTML or unsafe download targets', () => {
    for (const mimeType of ['application/pdf', 'image/svg+xml', 'text/html']) {
      expect(isPreviewImage(mimeType)).toBe(false);
      const html = renderToStaticMarkup(
        <FilePreview
          file={{ name: '<script>not markup</script>', mimeType, url: 'javascript:alert(1)' }}
        />,
      );
      expect(html).not.toMatch(/<(iframe|object|embed|img|a|script)\b/);
      expect(html).toContain('&lt;script&gt;');
      expect(html).toContain('role="status"');
    }
  });
  it('formats bytes without accepting invalid metadata values', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(1024)).toBe('1 KiB');
    for (const number of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])
      expect(() => formatFileSize(number)).toThrow();
  });
});
