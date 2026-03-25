import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier/recommended';

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      '**/node_modules/**',
      '**/cdk.out/**',
      '**/dist/**',
      '**/coverage/**',
      '**/backend/lib/gql-functions/**',
      '**/frontend/**',
      '**/.angular/**',
      '**/.dart_tool/**',
      '**/.flutter*',
      '**/build/**',
    ],
  },

  // Base config for all files
  js.configs.recommended,

  // TypeScript files
  {
    files: ['**/*.ts'],
    extends: [...tseslint.configs.recommended, prettier],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrors: 'none',
        },
      ],
      // Disable new strict rules from ESLint 10+
      'no-useless-assignment': 'off',
      'no-unassigned-vars': 'off',
      'preserve-caught-error': 'off',
    },
  },

  // Test files - allow any types for mocking
  {
    files: ['**/*.spec.ts', '**/*.test.ts', '**/vitest.setup.ts', '**/test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // Angular components - need regular imports for DI
  {
    files: ['join_page/**/*.ts', 'profile_cards/**/*.ts', 'competitors_page/**/*.ts'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },

  // JavaScript/CommonJS files
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    extends: [prettier],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        TextDecoder: 'readonly',
        TextEncoder: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrors: 'none',
        },
      ],
      // Disable new strict rules from ESLint 10+
      'no-useless-assignment': 'off',
      'preserve-caught-error': 'off',
    },
  },

  // CommonJS specific
  {
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
    },
  },
);
