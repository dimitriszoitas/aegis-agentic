import type { Meta, StoryObj } from '@storybook/react-vite';
import { useGlobals } from 'storybook/preview-api';
import { consolePreviewParameters } from '../../../.storybook/console-canvas';
import { FormaApp } from '@/product/forma-app';
const meta = {
  id: 'console-application-demo',
  title: 'Console/Application Demo',
  component: FormaApp,
  tags: ['!autodocs'],
  parameters: {
    ...consolePreviewParameters,
    docs: {
      ...consolePreviewParameters.docs,
      description: {
        component:
          'Forma is a working local product with Dashboard, Users, Products, Invoices and Settings. Explore metrics, sortable data grids, shared slide-in filters, user detail panels and creation dialogs. Changes are saved in this browser. Storybook owns the light/dark and Fundamental/Floating presentation controls; no backend is connected.',
      },
    },
  },
  render: function Render() {
    const [globals, updateGlobals] = useGlobals();
    return (
      <FormaApp
        embedded
        theme={globals.theme === 'light' ? 'light' : 'dark'}
        onThemeChange={(theme) => updateGlobals({ theme })}
      />
    );
  },
} satisfies Meta<typeof FormaApp>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Demo: Story = { name: 'Application Demo' };
