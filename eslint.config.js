import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
export default tseslint.config(
 { ignores: ['dist/**', 'lib-dist/**', 'storybook-static/**', 'node_modules/**', '.pnpm-store/**', 'artifacts/**', 'test-results/**', 'coverage/**'] },
 js.configs.recommended, ...tseslint.configs.recommended,
 { files: ['**/*.{ts,tsx,js,mjs}'], languageOptions: { globals: {...globals.browser, ...globals.node} },
   plugins: {'react-hooks': hooks}, rules: {
     'react-hooks/rules-of-hooks': 'error', 'react-hooks/exhaustive-deps': 'warn',
     '@typescript-eslint/no-unused-vars': ['error', {argsIgnorePattern: '^_', varsIgnorePattern: '^_'}]
   }
 }
);
