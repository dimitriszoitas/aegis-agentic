import type { StorybookConfig } from '@storybook/react-vite';
import { fileURLToPath } from 'node:url';
import { mergeConfig } from 'vite';
import remarkGfm from 'remark-gfm';
const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
  staticDirs: ['../public'],
  addons: [
    {
      name: '@storybook/addon-docs',
      options: {
        mdxPluginOptions: {
          mdxCompileOptions: { remarkPlugins: [remarkGfm] },
        },
      },
    },
    '@storybook/addon-themes',
    '@storybook/addon-a11y',
  ],
  framework: '@storybook/react-vite',
  core: { disableTelemetry: true },
  // Keep browsing, theme controls, live examples and opt-in inspection panels.
  // These supported feature flags remove duplicate visual tools and setup/review chrome.
  features: {
    backgrounds: false,
    measure: false,
    outline: false,
    sidebarOnboardingChecklist: false,
    menuOnboardingChecklist: false,
    changeDetection: false,
    experimentalReview: false,
  },
  viteFinal(config, { configType }) {
    if (configType !== 'PRODUCTION') return config;
    return mergeConfig(config, {
      resolve: {
        alias: {
          '@untitledui/icons': fileURLToPath(new URL('./public-icon-pack.ts', import.meta.url)),
        },
      },
      plugins: [
        {
          name: 'aegis-public-icon-license-guard',
          generateBundle(_options, bundle) {
            for (const output of Object.values(bundle)) {
              if (output.type !== 'chunk') continue;
              const restricted = Object.keys(output.modules).find(
                (id) => id.includes('node_modules') && id.includes('@untitledui'),
              );
              if (restricted)
                this.error(`Restricted local icon pack reached the public bundle: ${restricted}`);
            }
          },
        },
      ],
    });
  },
};
export default config;
