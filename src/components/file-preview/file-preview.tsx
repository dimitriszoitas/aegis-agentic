import { useState, type HTMLAttributes } from 'react';
import { Button } from '@/components/button';
import { Link } from '@/components/link';
import { Modal } from '@/components/modal';
import { cn } from '@/lib/utils';
import './file-preview.css';

export interface PreviewFile {
  name: string;
  url: string;
  mimeType: string;
  size?: number;
  /** Host-formatted modification date; no timezone is inferred. */
  modifiedLabel?: string;
}
export interface FilePreviewProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  file: PreviewFile;
  imageAlt?: string;
  preview?: boolean;
  download?: boolean;
  previewLabel?: string;
  downloadLabel?: string;
  unavailableLabel?: string;
}
export function isPreviewImage(mimeType: string): boolean {
  return /^image\/(?:png|jpeg|gif|webp|avif|bmp)$/i.test(mimeType.trim());
}
/** URL policy, not file-content verification. Relative, HTTP(S), blob and raster data URLs only. */
export function safeFileUrl(value: string): string | undefined {
  if (
    !value ||
    Array.from(value).some(
      (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    )
  )
    return undefined;
  const url = value.trim();
  if (!url) return undefined;
  if (/^data:/i.test(url))
    return /^data:image\/(?:png|jpeg|gif|webp|avif|bmp);base64,[a-z0-9+/=]+$/i.test(url)
      ? url
      : undefined;
  try {
    const parsed = new URL(url, 'https://aegis.invalid');
    return ['http:', 'https:', 'blob:'].includes(parsed.protocol) ? url : undefined;
  } catch {
    return undefined;
  }
}
export function formatFileSize(bytes: number): string {
  if (!Number.isSafeInteger(bytes) || bytes < 0)
    throw new TypeError('File size must be a nonnegative safe integer.');
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KiB', 'MiB', 'GiB', 'TiB'];
  let amount = bytes / 1024;
  let index = 0;
  while (amount >= 1024 && index < units.length - 1) {
    amount /= 1024;
    index++;
  }
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(amount)} ${units[index]}`;
}
/** Images render only through img; every document type receives metadata and a download fallback. */
export function FilePreview({
  file,
  imageAlt = file.name,
  preview = true,
  download = true,
  previewLabel = 'Open image preview',
  downloadLabel = 'Download file',
  unavailableLabel = 'Preview unavailable. Use the file download if available.',
  className,
  ...props
}: FilePreviewProps) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const url = safeFileUrl(file.url);
  const image = preview && isPreviewImage(file.mimeType) && url && failedUrl !== url;
  return (
    <div {...props} className={cn('aegis-file-preview', className)}>
      <p className="aegis-file-preview-name">{file.name}</p>
      <dl className="aegis-file-preview-metadata">
        <div>
          <dt>File type</dt>
          <dd>{file.mimeType || 'Unknown'}</dd>
        </div>
        {file.size !== undefined && (
          <div>
            <dt>Size</dt>
            <dd>{formatFileSize(file.size)}</dd>
          </div>
        )}
        {file.modifiedLabel && (
          <div>
            <dt>Modified</dt>
            <dd>{file.modifiedLabel}</dd>
          </div>
        )}
      </dl>
      {image ? (
        <img
          className="aegis-file-preview-image"
          src={url}
          alt={imageAlt}
          onError={() => setFailedUrl(url)}
        />
      ) : (
        <p className="aegis-file-preview-fallback" role="status">
          {unavailableLabel}
        </p>
      )}
      <div className="aegis-file-preview-actions">
        {image && (
          <Modal
            title={file.name}
            description="Image preview"
            size="large"
            trigger={<Button emphasis="secondary">{previewLabel}</Button>}
          >
            <img className="aegis-file-preview-image" src={url} alt={imageAlt} />
          </Modal>
        )}
        {download && url && (
          <Link href={url} download={file.name} external>
            {downloadLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
