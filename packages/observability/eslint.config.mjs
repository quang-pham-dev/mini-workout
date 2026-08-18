import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default [
  { ignores: ['dist/**', '.turbo/**'] },
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,
];
