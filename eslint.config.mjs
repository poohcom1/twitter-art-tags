// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import 'eslint-plugin-only-warn';
import unusedImports from 'eslint-plugin-unused-imports';

const files = ['src/**/*.ts', 'src/**/*.tsx'];

export default [
    ...tseslint.config(
        { ...eslint.configs.recommended, files },
        ...tseslint.configs.recommended.map((config) => ({ ...config, files }))
    ),
    {
        plugins: {
            'unused-imports': unusedImports,
        },
        rules: {
            '@typescript-eslint/no-shadow': 'error',
            '@typescript-eslint/no-unused-vars': 'off',
            'unused-imports/no-unused-imports': 'error',
            'unused-imports/no-unused-vars': [
                'warn',
                {
                    vars: 'all',
                    varsIgnorePattern: '^_',
                    args: 'after-used',
                    argsIgnorePattern: '^_',
                },
            ],
        },
        files,
    },
];
