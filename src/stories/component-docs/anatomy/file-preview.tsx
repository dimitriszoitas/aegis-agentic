import { FilePreview } from '@/components/file-preview';
import type { AnatomyDefinition } from './types';
export const filePreviewAnatomy: AnatomyDefinition = {
  render: () => (
    <FilePreview
      data-anatomy="file-preview"
      file={{
        name: 'Research brief.pdf',
        mimeType: 'application/pdf',
        size: 32768,
        modifiedLabel: '27 October 2026',
        url: '/example-brief.pdf',
      }}
    />
  ),
  parts: [
    {
      name: 'File name',
      description: 'Host-provided name rendered as text.',
      selector: '[data-anatomy="file-preview"] .aegis-file-preview-name',
      anchor: 'top-left',
    },
    {
      name: 'Metadata',
      description:
        'Semantic definition list for MIME type, optional byte size and host-formatted date.',
      selector: '[data-anatomy="file-preview"] dl',
      anchor: 'left',
    },
    {
      name: 'Fallback status',
      description:
        'Documents are not executed or embedded; raster images use a native image instead.',
      selector: '[data-anatomy="file-preview"] [role="status"]',
      anchor: 'right',
    },
    {
      name: 'Download action',
      description:
        'A native safe-URL link; host endpoint policy determines actual download behavior.',
      selector: '[data-anatomy="file-preview"] a',
      anchor: 'bottom',
    },
  ],
  note: 'Document fallback state. Supported raster images add a preview action opening the shared Modal lightbox.',
};
