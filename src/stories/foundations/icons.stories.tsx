import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { IconGallery, iconCounts, iconPageSize, hasLocalUntitledIcons } from './icon-gallery';

const meta = {
  id: 'foundations-icons',
  title: 'Foundations/Iconography',
  component: IconGallery,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Browse Hugeicons with search, paging, adjustable size and stroke width, and copyable imports. Counts include named exports and compatibility aliases. Local development additionally offers the installed Untitled UI reference pack; that pack and its selector are excluded from production builds. Application components use individual Hugeicons icons.',
      },
    },
  },
} satisfies Meta<typeof IconGallery>;
export default meta;
type Story = StoryObj<typeof meta>;
export const AllIcons: Story = {};
export const LibraryPreview: Story = {
  args: { initialLibrary: hasLocalUntitledIcons ? 'untitled' : 'hugeicons' },
};
export const SearchAndBrowse: Story = {
  args: { initialLibrary: 'hugeicons' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup();
    const search = canvas.getByRole('searchbox', { name: 'Search icons' });
    await step('Browse the next page from the keyboard', async () => {
      await expect(canvas.getByRole('list', { name: 'Available icons' }).children).toHaveLength(
        iconPageSize,
      );
      canvas.getByRole('button', { name: 'Next page' }).focus();
      await user.keyboard('{Enter}');
      await expect(canvas.getByRole('button', { name: 'Page 2' })).toHaveAttribute(
        'aria-current',
        'page',
      );
      await expect(
        canvas.getByText(`97–192 of ${iconCounts.hugeicons.toLocaleString()} icons`),
      ).toBeVisible();
    });
    await step('Search across the whole pack and select a named icon', async () => {
      await user.type(search, 'shield check');
      await expect(canvas.getByRole('button', { name: 'ShieldCheckIcon icon' })).toBeVisible();
      await expect(canvas.getByRole('button', { name: 'Previous page' })).toBeDisabled();
      const icon = canvas.getByRole('button', { name: 'ShieldCheckIcon icon' });
      icon.focus();
      await user.keyboard('{Enter}');
      await expect(icon).toHaveAttribute('aria-pressed', 'true');
      await expect(canvas.getByRole('img', { name: 'ShieldCheckIcon icon preview' })).toBeVisible();
      await expect(
        canvas.getByRole('button', { name: 'Copy ShieldCheckIcon import' }),
      ).toBeVisible();
    });
    await step('Recover from an empty search without losing keyboard focus', async () => {
      await user.clear(search);
      await user.type(search, 'no matching aegis icon');
      await expect(
        canvas.getByRole('heading', { name: 'No icons match this search' }),
      ).toBeVisible();
      canvas.getByRole('button', { name: 'Clear search' }).focus();
      await user.keyboard('{Enter}');
      await expect(search).toHaveFocus();
      await expect(search).toHaveValue('');
      await expect(canvas.getByRole('list', { name: 'Available icons' }).children).toHaveLength(
        iconPageSize,
      );
    });
  },
};
export const NoResults: Story = { args: { initialQuery: 'no matching aegis icon' } };

export const LibrarySwitching: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement),
      page = within(canvasElement.ownerDocument.body);
    if (hasLocalUntitledIcons) {
      await expect(canvas.getByRole('combobox', { name: 'Icon library' })).toHaveTextContent(
        'Hugeicons',
      );
      await expect(
        canvas.getByText(`1–96 of ${iconCounts.hugeicons.toLocaleString()} icons`),
      ).toBeVisible();
      await userEvent.click(canvas.getByRole('combobox', { name: 'Icon library' }));
      await userEvent.click(await page.findByRole('option', { name: 'Untitled UI' }));
      await waitFor(() =>
        expect(canvas.getByRole('combobox', { name: 'Icon library' })).toHaveFocus(),
      );
      await expect(
        canvas.getByText(`1–96 of ${iconCounts.untitled.toLocaleString()} icons`),
      ).toBeVisible();
      await userEvent.click(canvas.getByRole('combobox', { name: 'Icon library' }));
      await userEvent.click(await page.findByRole('option', { name: 'Hugeicons' }));
      await waitFor(() =>
        expect(canvas.getByRole('combobox', { name: 'Icon library' })).toHaveFocus(),
      );
    } else {
      await expect(
        canvas.queryByRole('combobox', { name: 'Icon library' }),
      ).not.toBeInTheDocument();
      await expect(
        canvas.getByText(`1–96 of ${iconCounts.hugeicons.toLocaleString()} icons`),
      ).toBeVisible();
    }
    await userEvent.type(canvas.getByRole('searchbox', { name: 'Search icons' }), 'Activity01Icon');
    await userEvent.click(canvas.getByRole('button', { name: 'Activity01Icon icon' }));
    await expect(canvas.getByRole('img', { name: 'Activity01Icon icon preview' })).toBeVisible();
    await expect(
      canvas.getByText(/import \{ Activity01Icon \} from '@hugeicons\/core-free-icons'/),
    ).toBeVisible();
  },
};
