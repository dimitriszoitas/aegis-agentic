import type { Meta, StoryObj } from '@storybook/react-vite';
import { ShieldCheck, Clock3 } from '@/components/icon';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card';

const meta = {
  id: 'components-surfaces-card',
  title: 'Components/Surfaces/Card',
  component: Card,
  subcomponents: { CardHeader, CardTitle, CardDescription, CardContent, CardFooter },
  parameters: {
    docs: {
      description: {
        component:
          "Composition slots inherit the native props of their rendered element, including `children`, `className`, `style`, `id`, event handlers and ARIA attributes. They add spacing and typography; no extra state is required.\n\n| Component | Native props | Purpose |\n| --- | --- | --- |\n| CardHeader | `ComponentProps<'header'>` | Heading and supporting content |\n| CardTitle | `ComponentProps<'h3'>` | Surface heading |\n| CardDescription | `ComponentProps<'p'>` | Supporting text |\n| CardContent | `ComponentProps<'div'>` | Main content |\n| CardFooter | `ComponentProps<'footer'>` | Metadata and actions |\n",
      },
    },
  },
  tags: ['autodocs'],
  args: { elevation: 'raised' },
} satisfies Meta<typeof Card>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Elevations: Story = {
  render: () => (
    <div className="story-grid">
      {(['flat', 'raised', 'floating'] as const).map((elevation) => (
        <Card key={elevation} elevation={elevation}>
          <CardHeader>
            <div
              className="row"
              style={{ color: 'var(--color-success-fg)', marginBottom: 'var(--space-2)' }}
            >
              <ShieldCheck size={20} />
              <span>Milestone completion</span>
            </div>
            <CardTitle>{elevation[0].toUpperCase() + elevation.slice(1)} surface</CardTitle>
            <CardDescription>Customer onboarding progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              style={{
                fontSize: 'var(--text-3xl)',
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              98.4<span style={{ fontSize: 'var(--text-md)' }}>%</span>
            </div>
            <p className="muted" style={{ marginBottom: 0 }}>
              126 of 128 onboarding tasks are complete.
            </p>
          </CardContent>
          <CardFooter>
            <span className="row muted">
              <Clock3 size={14} /> Evaluated 2 minutes ago
            </span>
          </CardFooter>
        </Card>
      ))}
    </div>
  ),
};
export const ProjectSummary: Story = {
  render: (args) => (
    <Card {...args} style={{ maxWidth: 440 }}>
      <CardHeader>
        <CardTitle>Customer portal redesign</CardTitle>
        <CardDescription>Project · Customer experience</CardDescription>
      </CardHeader>
      <CardContent>
        <p>
          The updated customer portal is ready for design review. Confirm the onboarding flow and
          accessibility requirements before the next milestone.
        </p>
        <code style={{ fontSize: 'var(--text-xs)' }}>PRJ-0042 · Design review</code>
      </CardContent>
      <CardFooter>
        <span className="muted">Assigned to Eleni Papadopoulos</span>
      </CardFooter>
    </Card>
  ),
};
