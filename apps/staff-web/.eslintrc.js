/**
 * ESLint config for staff-web.
 *
 * Inlines the shared @dms/config-eslint preset so workspace-package
 * resolution doesn't trip eslint's `extends` lookup. Mirrors the shape
 * at packages/config-eslint/index.js.
 *
 * The `plugin:react-hooks/recommended` extends bundle includes:
 *   - react-hooks/rules-of-hooks: 'error'  ← catches "useMemo after early return"
 *   - react-hooks/exhaustive-deps: 'warn'
 *
 * That first rule would have caught the bug in shoot-detail-view.tsx
 * (commit 87c04ad → fix in this commit) at lint time instead of at
 * runtime in dev. Wiring this up is a small infrastructure win for
 * future drift.
 */
module.exports = {
  root: true,
  env: { es2022: true, node: true, browser: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'next/core-web-vitals',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  settings: { react: { version: 'detect' } },
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    // Keep noise low — these only trip on genuine bugs
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
  ignorePatterns: ['.next/**', 'node_modules/**', '*.config.*', 'next-env.d.ts'],
};
