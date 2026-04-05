import typescript from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy';
export default {
    input: 'src/index.ts',
    output: [
        {
            dir: 'dist',
            format: 'esm',
            sourcemap: true,
            preserveModules: true,
            preserveModulesRoot: 'src',
        },
    ],
    plugins: [
        typescript(),
        copy({
            targets: [{src: 'src/asset*', dest: 'dist/asset'}],
        }),
    ],
    external: [
        '@playwright/test',
        '@mattermost/client',
        '@mattermost/types/config',
        '@axe-core/playwright',
        '@percy/playwright',
        'dotenv',
        'luxon',
        'node:fs/promises',
        'node:path',
        'node:fs',
        'node:os',
        'mime-types',
        'uuid',
        'async-wait-until',
        'chalk',
        'deepmerge',
    ],
};