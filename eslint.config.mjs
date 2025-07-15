import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import { dirname, resolve } from 'node:path';  
const __dirname = import.meta.dirname;
const __filename = import.meta.filename;

export default tseslint.config(
  {
    languageOptions: {
      parserOptions: {
        project: [resolve(__dirname, 'tsconfig.json')],
        tsconfigRootDir: __dirname,
        ecmaVersion: 'latest',
        sourceType: 'module'
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
        ...globals.node
      }
    },
    ignores: [
      './dist/',
      './dist-electron/',
      './node_modules/',
      '**/*.js',
      '**/*.cjs',
      '**/*.mjs'
    ]
  },

  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,

  {
    rules: {
      // 例:
      // '@typescript-eslint/no-unused-vars': 'warn',
    }
  },
  {
    files: ['eslint.config.*'],
    languageOptions: { parser: null },
    rules: { '@typescript-eslint/await-thenable': 'off' }
  },
);
