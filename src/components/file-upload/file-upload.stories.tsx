import { useRef } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within, waitFor } from 'storybook/test';
import { FileUpload, type FileUploadContext } from './file-upload';

const meta = {
  id: 'components-forms-fileupload',
  title: 'Components/Inputs & Selection/FileUpload',
  component: FileUpload,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Choose local files with type, size, count, and duplicate validation. No network request is made unless the application supplies onUpload. The adapter receives an AbortSignal and progress callback; cancellation and retry remain available. Files stay ready on the device in selection-only mode.',
      },
    },
  },
  args: { label: 'Attachments', accept: '.pdf,.csv,.txt', maxFiles: 3, maxSizeBytes: 1024 * 1024 },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 640 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FileUpload>;
export default meta;
type Story = StoryObj<typeof meta>;
export const LocalSelection: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText('Choose attachments');
    const file = new File(['Project scope and milestones'], 'project-brief.txt', {
      type: 'text/plain',
      lastModified: 1,
    });
    await userEvent.upload(input, file);
    await expect(canvas.getByText('project-brief.txt')).toBeVisible();
    await expect(canvas.getByText(/Ready locally/)).toBeVisible();
    await userEvent.upload(input, file);
    await expect(canvas.getByRole('alert')).toHaveTextContent('already selected');
    await userEvent.click(canvas.getByRole('button', { name: 'Remove project-brief.txt' }));
    await expect(canvas.queryByText('project-brief.txt')).not.toBeInTheDocument();
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Choose files' })).toHaveFocus());
  },
};
export const Validation: Story = {
  args: { maxSizeBytes: 12 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup({ applyAccept: false });
    await user.upload(
      canvas.getByLabelText('Choose attachments'),
      new File(['a'.repeat(24)], 'large.txt', { type: 'text/plain' }),
    );
    await expect(canvas.getByRole('alert')).toHaveTextContent('exceeds 12 B');
    await user.upload(
      canvas.getByLabelText('Choose attachments'),
      new File(['abc'], 'diagram.png', { type: 'image/png' }),
    );
    await expect(canvas.getByRole('alert')).toHaveTextContent('file type is not accepted');
  },
};
function waitForAdapter(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const cancel = () => {
      clearTimeout(timer);
      reject(new DOMException('Cancelled', 'AbortError'));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', cancel);
      resolve();
    }, 100);
    signal.addEventListener('abort', cancel, { once: true });
    if (signal.aborted) cancel();
  });
}
function AdapterDemo({ failFirst = false }: { failFirst?: boolean }) {
  const attempts = useRef(0);
  async function onUpload(_file: File, { signal, onProgress }: FileUploadContext) {
    attempts.current++;
    for (const percent of [20, 45, 70, 100]) {
      await waitForAdapter(signal);
      onProgress(percent);
    }
    if (failFirst && attempts.current === 1)
      throw new Error('The local adapter rejected this attempt. Retry to finish.');
  }
  return (
    <FileUpload
      label="Project documents"
      description="Local adapter demonstration. Files are not sent to a server."
      accept=".txt,.csv"
      onUpload={onUpload}
    />
  );
}
export const AsyncAdapter: Story = {
  render: () => <AdapterDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.upload(
      canvas.getByLabelText('Choose project documents'),
      new File(['Client,Amount\nAtlas,2400'], 'invoices.csv', { type: 'text/csv' }),
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Upload invoices.csv' }));
    await expect(canvas.getByRole('progressbar', { name: 'Uploading invoices.csv' })).toBeVisible();
    await waitFor(() => expect(canvas.getByText(/Uploaded/)).toBeVisible());
  },
};
export const RetryAndCancel: Story = {
  render: () => <AdapterDemo failFirst />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.upload(
      canvas.getByLabelText('Choose project documents'),
      new File(['Scope approval'], 'scope.txt', { type: 'text/plain' }),
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Upload scope.txt' }));
    await waitFor(() =>
      expect(
        canvas.getByText('The local adapter rejected this attempt. Retry to finish.'),
      ).toBeVisible(),
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Retry scope.txt' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Cancel' }));
    await expect(canvas.getByText(/Ready locally/)).toBeVisible();
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: 'Upload scope.txt' })).toHaveFocus(),
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Upload scope.txt' }));
    await waitFor(() => expect(canvas.getByText(/Uploaded/)).toBeVisible());
  },
};
export const Disabled: Story = { args: { disabled: true } };
export const SingleFile: Story = {
  args: {
    multiple: false,
    label: 'Profile document',
    accept: '.pdf',
    description: 'Choose one PDF to attach to this profile.',
  },
};
