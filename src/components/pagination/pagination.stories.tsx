import { useArgs } from 'storybook/preview-api';
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Pagination } from './pagination';
const meta = {
  id: 'components-navigation-pagination',
  title: 'Components/Navigation/Pagination',
  component: Pagination,
  tags: ['autodocs'],
  args: { page: 1, pageSize: 25, total: 150, onPageChange: () => undefined },
} satisfies Meta<typeof Pagination>;
export default meta;
type Story = StoryObj<typeof meta>;
function PaginationDemo({ total = 150, startPage = 1 }: { total?: number; startPage?: number }) {
  const [page, setPage] = useState(startPage);
  const [pageSize, setPageSize] = useState(25);
  return (
    <div className="story-layout">
      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        noun="records"
      />
    </div>
  );
}
export const Interactive: Story = { render: () => <PaginationDemo /> };
export const ManyPages: Story = { render: () => <PaginationDemo total={12840} startPage={16} /> };
export const States: Story = {
  render: () => (
    <div className="stack">
      <PaginationDemo total={0} />
      <PaginationDemo total={12} />
      <PaginationDemo total={150} startPage={6} />
      <div className="story-layout">
        <Pagination
          page={3}
          pageSize={25}
          total={150}
          onPageChange={() => undefined}
          onPageSizeChange={() => undefined}
          disabled
          noun="records"
        />
      </div>
    </div>
  ),
};

export const Playground: Story = {
  args: {
    page: 1,
    pageSize: 25,
    total: 150,
    pageSizeOptions: [10, 25, 50, 100],
    disabled: false,
    noun: 'projects',
  },
  argTypes: {
    page: { control: { type: 'number', min: 1, max: 1000, step: 1 } },
    pageSize: { control: 'select', options: [10, 25, 50, 100] },
    total: { control: { type: 'number', min: 0, max: 100000, step: 1 } },
    pageSizeOptions: { control: 'object' },
    disabled: { control: 'boolean' },
    noun: { control: 'text' },
  },
  render: function PaginationPlayground(args) {
    const [, updateArgs] = useArgs();
    return (
      <Pagination
        {...args}
        onPageChange={(page) => updateArgs({ page })}
        onPageSizeChange={(pageSize) => updateArgs({ pageSize, page: 1 })}
      />
    );
  },
};
