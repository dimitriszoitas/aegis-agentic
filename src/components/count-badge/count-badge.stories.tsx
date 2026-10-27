import type { Meta, StoryObj } from '@storybook/react-vite';
import { CountBadge } from './count-badge';
export default {
  id: 'components-tags-countbadge',
  title: 'Components/Data Display/CountBadge',
  component: CountBadge,
} satisfies Meta<typeof CountBadge>;
export const Matrix: StoryObj<typeof CountBadge> = {
  render: () => (
    <div className="stack">
      {(['default', 'inverted'] as const).map((variant) => (
        <section className="stack" key={variant}>
          <h3>{variant === 'default' ? 'Default' : 'Inverted'}</h3>
          <div className="row">
            {[0, 8, 48, 150].map((count) => (
              <CountBadge count={count} label="open records" variant={variant} key={count} />
            ))}
          </div>
        </section>
      ))}
    </div>
  ),
};
export const Inverted: StoryObj<typeof CountBadge> = {
  args: { count: 48, label: 'open records', variant: 'inverted' },
};
export const Small: StoryObj<typeof CountBadge> = {
  render: () => (
    <div className="row">
      {[1, 8, 48, 150].map((count) => (
        <CountBadge
          count={count}
          label="unread notifications"
          size="sm"
          variant="inverted"
          key={count}
        />
      ))}
    </div>
  ),
};
