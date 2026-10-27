import type { Meta, StoryObj } from '@storybook/react-vite';
import { useGlobals } from 'storybook/preview-api';
import { consolePreviewParameters } from '../../../.storybook/console-canvas';
import { defaultLayoutTheme, normalizeLayoutTheme } from '@/lib/layout-theme';
import { BusinessApp } from './business-app';
const meta = {
  title: 'Console/Application Demo',
  component: BusinessApp,
  tags: ['!autodocs'],
  parameters: {
    ...consolePreviewParameters,
    docs: {
      ...consolePreviewParameters.docs,
      description: {
        component:
          'Northstar is a connected B2B workspace for projects, customers, invoices, and people. Explore dashboards, sortable data grids, editable details, member profiles, activity, and Aegis AI. Sample changes remain in the session. Both Fundamental themes support light and dark modes.',
      },
    },
  },
  render: function Render(args, context) {
    const [, updateGlobals] = useGlobals();
    return (
      <BusinessApp
        {...args}
        theme={context.globals.theme === 'dark' ? 'dark' : 'light'}
        onThemeChange={(theme) => updateGlobals({ theme })}
        layoutTheme={normalizeLayoutTheme(context.globals.layoutTheme) ?? defaultLayoutTheme}
        onLayoutThemeChange={(layoutTheme) => updateGlobals({ layoutTheme })}
      />
    );
  },
} satisfies Meta<typeof BusinessApp>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Demo: Story = { name: 'Application Demo' };
