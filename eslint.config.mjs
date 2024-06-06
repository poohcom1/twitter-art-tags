// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

const files = ['./src**/*.ts'];

export default tseslint.config(
    { ...eslint.configs.recommended, files },
    ...tseslint.configs.recommended.map((config) => ({ ...config, files })),
    {
        rules: {
            'no-shadow': 'error',
        },
        files,
    }
);
