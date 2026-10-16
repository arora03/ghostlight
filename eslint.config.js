import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': 'allow-with-description',
          'ts-nocheck': true,
          'ts-check': false,
          minimumDescriptionLength: 3,
        },
      ],
    },
  },
  {
    files: ['packages/core/**'],
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'window',
          message:
            'Core purity violation: window is not allowed in packages/core (see AGENTS.md rule 1).',
        },
        {
          name: 'document',
          message:
            'Core purity violation: document is not allowed in packages/core (see AGENTS.md rule 1).',
        },
        {
          name: 'navigator',
          message:
            'Core purity violation: navigator is not allowed in packages/core (see AGENTS.md rule 1).',
        },
        {
          name: 'process',
          message:
            'Core purity violation: process is not allowed in packages/core (see AGENTS.md rule 1).',
        },
        {
          name: 'Buffer',
          message:
            'Core purity violation: Buffer is not allowed in packages/core (see AGENTS.md rule 1).',
        },
        {
          name: 'performance',
          message:
            'Core purity violation: performance is not allowed in packages/core (see AGENTS.md rule 1).',
        },
        {
          name: 'setTimeout',
          message:
            'Core purity violation: setTimeout is not allowed in packages/core (see AGENTS.md rule 1).',
        },
        {
          name: 'setInterval',
          message:
            'Core purity violation: setInterval is not allowed in packages/core (see AGENTS.md rule 1).',
        },
        {
          name: 'requestAnimationFrame',
          message:
            'Core purity violation: requestAnimationFrame is not allowed in packages/core (see AGENTS.md rule 1).',
        },
        {
          name: 'fetch',
          message:
            'Core purity violation: fetch is not allowed in packages/core (see AGENTS.md rule 1).',
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message:
            'Determinism violation: Math.random() is forbidden in packages/core. Use a seeded pseudo-random generator passed as a parameter (see AGENTS.md rule 2).',
        },
        {
          object: 'Date',
          property: 'now',
          message:
            'Determinism/Purity violation: Date.now() is forbidden in packages/core (see AGENTS.md rule 1 and rule 2).',
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message:
            'Determinism/Purity violation: new Date() without arguments is forbidden in packages/core (see AGENTS.md rule 1 and rule 2).',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['node:*', 'fs', 'path', 'os', 'crypto'],
              message:
                'Core purity violation: Node built-in imports are forbidden in packages/core (see AGENTS.md rule 1).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.js'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**'],
  },
);
