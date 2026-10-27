import type { Decorator } from '@storybook/react-vite';
import './console-canvas.css';

/** Leave the preview responsive; the toolbar's 1600px preset remains optional. */
export const consolePreviewGlobals = {};

export const consolePreviewParameters = {
  layout: 'fullscreen',
  viewport: {
    options: {
      'aegis-console-1600': {
        name: 'Console · 1600px',
        styles: { width: '1600px', height: '1000px' },
        type: 'desktop',
      },
    },
  },
  docs: { story: { inline: false, height: 1000 } },
};

/** Match the shipped console's available-width layout, centered above 2160px. */
export const WithConsoleCanvas: Decorator = (Story, context) => {
  if (!/^(Console\/|Patterns\/Console views\/)/.test(context.title)) return <Story />;
  return (
    <div className="aegis-story-console-viewport">
      <div className="aegis-story-console-canvas">
        <Story />
      </div>
    </div>
  );
};
