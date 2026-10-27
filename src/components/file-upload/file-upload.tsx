import { useInputFocusModality } from '@/lib/use-input-focus';
import { componentToken } from '@/lib/component-design-tokens';
import { useEffect, useId, useRef, useState, type ComponentProps } from 'react';
import { ArrowUp, CircleCheck, Paperclip, RefreshCw, X } from '@/components/icon';
import { Button } from '@/components/button';
import { IconButton } from '@/components/icon-button';
import { ProgressBar } from '@/components/progress-bar';
import { cn } from '@/lib/utils';
import './file-upload.css';

export interface FileUploadItem {
  id: string;
  file: File;
  status: 'ready' | 'uploading' | 'complete' | 'error';
  /** Upload progress from 0 to 100. Omit for an indeterminate operation. */
  progress?: number;
  error?: string;
}
export interface FileUploadContext {
  signal: AbortSignal;
  onProgress: (percent: number) => void;
}
export interface FileUploadProps extends Omit<
  ComponentProps<'section'>,
  'onChange' | 'defaultValue' | 'onError'
> {
  label?: string;
  description?: string;
  value?: FileUploadItem[];
  defaultValue?: FileUploadItem[];
  onValueChange?: (items: FileUploadItem[]) => void;
  /** Native file accept syntax: extensions, MIME types, or type wildcards. */
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSizeBytes?: number;
  disabled?: boolean;
  invalid?: boolean;
  /** Supply your transport. Without one, accepted files remain ready on this device. */
  onUpload?: (file: File, context: FileUploadContext) => Promise<void>;
}
function formatBytes(bytes: number) {
  return bytes < 1024
    ? `${bytes} B`
    : bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function acceptsFile(file: File, accept?: string) {
  if (!accept?.trim()) return true;
  return accept
    .split(',')
    .map((type) => type.trim().toLowerCase())
    .filter(Boolean)
    .some((type) =>
      type.startsWith('.')
        ? file.name.toLowerCase().endsWith(type)
        : type.endsWith('/*')
          ? file.type.toLowerCase().startsWith(type.slice(0, -1))
          : file.type.toLowerCase() === type,
    );
}
/** Accessible local selection and validation, with an optional cancellable upload adapter. */
export function FileUpload({
  label = 'Attachments',
  description = 'Choose files or drop them here.',
  value,
  defaultValue = [],
  onValueChange,
  accept,
  multiple = true,
  maxFiles = 5,
  maxSizeBytes = 10 * 1024 * 1024,
  disabled = false,
  invalid = false,
  onUpload,
  className,
  ...props
}: FileUploadProps) {
  useInputFocusModality();
  const [internal, setInternal] = useState(defaultValue);
  const items = value ?? internal;
  const current = useRef(items);
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLElement>(null);
  const tasks = useRef(new Map<string, AbortController>());
  const depth = useRef(0);
  const id = useId();
  const limit = multiple ? Math.max(1, Math.floor(Number.isFinite(maxFiles) ? maxFiles : 5)) : 1;
  const sizeLimit = Number.isFinite(maxSizeBytes) ? Math.max(0, maxSizeBytes) : Infinity;
  useEffect(() => {
    current.current = items;
    for (const [key, task] of tasks.current)
      if (!items.some((item) => item.id === key)) {
        task.abort();
        tasks.current.delete(key);
      }
  }, [items]);
  useEffect(() => {
    const active = tasks.current;
    return () => {
      for (const task of active.values()) task.abort();
      active.clear();
    };
  }, []);
  function commit(next: FileUploadItem[]) {
    current.current = next;
    if (value === undefined) setInternal(next);
    onValueChange?.(next);
  }
  function addFiles(incoming: File[]) {
    if (disabled) return;
    let next = multiple ? [...current.current] : [];
    const failures: string[] = [];
    for (const file of incoming) {
      if (!acceptsFile(file, accept)) {
        failures.push(`${file.name}: this file type is not accepted.`);
        continue;
      }
      if (file.size > sizeLimit) {
        failures.push(`${file.name}: exceeds ${formatBytes(sizeLimit)}.`);
        continue;
      }
      if (
        next.some(
          (item) =>
            item.file.name === file.name &&
            item.file.size === file.size &&
            item.file.lastModified === file.lastModified,
        )
      ) {
        failures.push(`${file.name}: already selected.`);
        continue;
      }
      if (next.length >= limit) {
        failures.push(`You can select up to ${limit} ${limit === 1 ? 'file' : 'files'}.`);
        break;
      }
      next.push({ id: crypto.randomUUID(), file, status: 'ready' });
    }
    // An invalid replacement must not remove the existing valid file.
    if (!multiple && !next.length) next = [...current.current];
    const added = next.filter(
      (item) => !current.current.some((previous) => previous.id === item.id),
    ).length;
    if (added) {
      commit(next);
      setMessage(`${added} ${added === 1 ? 'file' : 'files'} ready on this device.`);
    }
    setErrors([...new Set(failures)]);
    if (input.current) input.current.value = '';
  }
  function patch(key: string, change: Partial<FileUploadItem>) {
    commit(current.current.map((item) => (item.id === key ? { ...item, ...change } : item)));
  }
  function transitionItem(key: string, change: Partial<FileUploadItem>) {
    const findRow = () =>
      [...(root.current?.querySelectorAll<HTMLElement>('[data-file-id]') ?? [])].find(
        (element) => element.dataset.fileId === key,
      );
    const restore = findRow()?.contains(root.current?.ownerDocument.activeElement ?? null);
    patch(key, change);
    if (restore)
      requestAnimationFrame(() =>
        findRow()?.querySelector<HTMLButtonElement>('button:not([disabled])')?.focus(),
      );
  }
  async function upload(item: FileUploadItem) {
    if (!onUpload || disabled || tasks.current.has(item.id)) return;
    const controller = new AbortController();
    tasks.current.set(item.id, controller);
    transitionItem(item.id, { status: 'uploading', progress: undefined, error: undefined });
    try {
      await onUpload(item.file, {
        signal: controller.signal,
        onProgress: (percent) => {
          if (
            tasks.current.get(item.id) !== controller ||
            controller.signal.aborted ||
            !Number.isFinite(percent)
          )
            return;
          patch(item.id, { progress: Math.min(100, Math.max(0, percent)) });
        },
      });
      if (controller.signal.aborted || tasks.current.get(item.id) !== controller) return;
      transitionItem(item.id, { status: 'complete', progress: 100 });
      setMessage(`${item.file.name} uploaded.`);
    } catch (error) {
      if (controller.signal.aborted || tasks.current.get(item.id) !== controller) return;
      const reason = error instanceof Error ? error.message : 'Upload failed. Try again.';
      transitionItem(item.id, { status: 'error', error: reason, progress: undefined });
      setMessage(`${item.file.name}: ${reason}`);
    } finally {
      if (tasks.current.get(item.id) === controller) tasks.current.delete(item.id);
    }
  }
  function cancel(item: FileUploadItem) {
    tasks.current.get(item.id)?.abort();
    tasks.current.delete(item.id);
    transitionItem(item.id, { status: 'ready', progress: undefined, error: undefined });
    setMessage(`${item.file.name} upload cancelled.`);
  }
  function remove(item: FileUploadItem) {
    tasks.current.get(item.id)?.abort();
    tasks.current.delete(item.id);
    commit(current.current.filter((file) => file.id !== item.id));
    setMessage(`${item.file.name} removed.`);
    setErrors([]);
    requestAnimationFrame(() =>
      root.current?.querySelector<HTMLButtonElement>('[data-choose-files]')?.focus(),
    );
  }
  return (
    <section
      {...props}
      ref={root}
      className={cn('aegis-file-upload', className)}
      aria-labelledby={`${id}-label`}
      data-disabled={disabled || undefined}
      data-invalid={invalid || errors.length > 0 || undefined}
    >
      <div className="aegis-file-upload-heading">
        <h3 id={`${id}-label`}>{label}</h3>
        <span>
          {items.length} / {limit}
        </span>
      </div>
      <div
        className="aegis-file-upload-dropzone"
        data-dragging={dragging || undefined}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled) {
            depth.current++;
            setDragging(true);
          }
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          depth.current = Math.max(0, depth.current - 1);
          if (!depth.current) setDragging(false);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = disabled ? 'none' : 'copy';
        }}
        onDrop={(event) => {
          event.preventDefault();
          depth.current = 0;
          setDragging(false);
          addFiles([...event.dataTransfer.files]);
        }}
      >
        <span className="aegis-file-upload-symbol" aria-hidden="true">
          <ArrowUp size={componentToken('input.icon-brand')} />
        </span>
        <div className="aegis-file-upload-copy">
          <p id={`${id}-description`}>{description}</p>
          <small>
            {accept ? `${accept} · ` : ''}
            {Number.isFinite(sizeLimit)
              ? `Up to ${formatBytes(sizeLimit)} per file`
              : 'No file size limit'}
          </small>
        </div>
        <Button
          data-choose-files
          emphasis="tertiary"
          disabled={disabled}
          aria-describedby={`${id}-description${errors.length ? ` ${id}-errors` : ''}`}
          onClick={() => input.current?.click()}
        >
          Choose files
        </Button>
        <input
          ref={input}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          tabIndex={-1}
          aria-invalid={invalid || errors.length > 0 || undefined}
          aria-describedby={`${id}-description${errors.length ? ` ${id}-errors` : ''}`}
          className="sr-only"
          aria-label={`Choose ${label.toLowerCase()}`}
          onChange={(event) => addFiles([...(event.target.files ?? [])])}
        />
      </div>
      {errors.length > 0 && (
        <div id={`${id}-errors`} className="aegis-file-upload-errors" role="alert">
          <ul>
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      {items.length > 0 && (
        <ul className="aegis-file-upload-list">
          {items.map((item) => (
            <li key={item.id} data-file-id={item.id} data-status={item.status}>
              <span className="aegis-file-upload-item-icon" aria-hidden="true">
                {item.status === 'complete' ? (
                  <CircleCheck size={componentToken('input.icon-lg')} />
                ) : (
                  <Paperclip size={componentToken('input.icon-lg')} />
                )}
              </span>
              <div className="aegis-file-upload-item-copy">
                <strong title={item.file.name}>{item.file.name}</strong>
                <span>
                  {formatBytes(item.file.size)} ·{' '}
                  {item.status === 'ready'
                    ? 'Ready locally'
                    : item.status === 'uploading'
                      ? 'Uploading'
                      : item.status === 'complete'
                        ? 'Uploaded'
                        : 'Upload failed'}
                </span>
                {item.status === 'uploading' && (
                  <ProgressBar
                    label={`Uploading ${item.file.name}`}
                    value={item.progress}
                    size="sm"
                  />
                )}
                {item.error && <p className="aegis-file-upload-item-error">{item.error}</p>}
              </div>
              <div className="aegis-file-upload-actions">
                {onUpload && (item.status === 'ready' || item.status === 'error') && (
                  <IconButton
                    aria-label={`${item.status === 'error' ? 'Retry' : 'Upload'} ${item.file.name}`}
                    size="sm"
                    emphasis="ghost"
                    disabled={disabled}
                    onClick={() => void upload(item)}
                  >
                    {item.status === 'error' ? (
                      <RefreshCw size={componentToken('input.icon-inline')} />
                    ) : (
                      <ArrowUp size={componentToken('input.icon-inline')} />
                    )}
                  </IconButton>
                )}
                {item.status === 'uploading' ? (
                  <Button
                    size="sm"
                    emphasis="ghost"
                    disabled={disabled}
                    onClick={() => cancel(item)}
                  >
                    Cancel
                  </Button>
                ) : (
                  <IconButton
                    aria-label={`Remove ${item.file.name}`}
                    size="sm"
                    emphasis="ghost"
                    disabled={disabled}
                    onClick={() => remove(item)}
                  >
                    <X size={componentToken('input.icon-inline')} />
                  </IconButton>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="sr-only" role="status" aria-live="polite">
        {message}
      </p>
    </section>
  );
}
