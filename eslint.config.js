import globals from 'globals';
import pluginJs from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {languageOptions: {globals: globals.node}},
  pluginJs.configs.recommended,
  eslintConfigPrettier,
  importPlugin.flatConfigs.recommended,
  {
    files: ['**/*.{js,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      'import/no-absolute-path': 'error',  
      "import/no-duplicates": ["error", {"prefer-inline": true}],
      'import/no-dynamic-require': 'error',
      'import/no-named-default': 'error',
      'import/no-namespace': 'error',
      'import/no-webpack-loader-syntax': 'error',
    },
  }
];


