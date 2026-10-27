import { create } from 'storybook/theming';

export function managerTheme(dark: boolean) {
  return create({
    base: dark ? 'dark' : 'light',
    brandTitle:
      '<span class="aegis-storybook-brand"><img src="./aegis-mark.svg" alt="" width="32" height="32" /><span>Aegis</span></span>',
    brandUrl: '?path=/docs/foundations-welcome--docs',
    brandTarget: '_self',
    fontBase: 'Figtree, sans-serif',
    fontCode: '"JetBrains Mono", monospace',
    colorPrimary: dark ? '#7ba5ed' : '#356ac3',
    colorSecondary: dark ? '#7ba5ed' : '#356ac3',
    appBg: dark ? '#0d0d0e' : '#f7f8fa',
    appContentBg: dark ? '#0d0d0e' : '#ffffff',
    appPreviewBg: dark ? '#0d0d0e' : '#ffffff',
    appHoverBg: dark ? '#202329' : '#eaf0fa',
    appBorderColor: dark ? '#2b2c2f' : '#e1e3e8',
    appBorderRadius: 6,
    textColor: dark ? '#f2f3f5' : '#202124',
    textMutedColor: dark ? '#a6aab3' : '#626872',
    textInverseColor: dark ? '#10141c' : '#ffffff',
    barBg: dark ? '#171718' : '#ffffff',
    barTextColor: dark ? '#a6aab3' : '#626872',
    barSelectedColor: dark ? '#7ba5ed' : '#356ac3',
    inputBg: dark ? '#1c1c1e' : '#ffffff',
    inputBorder: dark ? '#34363a' : '#d1d5dc',
    inputTextColor: dark ? '#f2f3f5' : '#202124',
    inputBorderRadius: 6,
  });
}
