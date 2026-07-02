import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Reglas del React Compiler degradadas a warning. Las que quedan exigen
      // cambios de arquitectura: los loaders llamados desde useEffect requieren
      // una data library (TanStack Query) o use(), y los warnings de
      // react-hook-form requieren migrar watch() a useWatch. Subir a error
      // cuando se haga ese refactor.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-refresh/only-export-components': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  prettierConfig,
);
