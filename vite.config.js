import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';

export default defineConfig({
    plugins: [
        laravel({
            input: [
                'resources/css/site.css',
                'resources/js/site.js',
                'resources/css/cp/bard-preview.css',
            ],
            refresh: true,
        }),
    ],
    css: {
        postcss: './postcss.config.js',
    },
    server: {
        watch: {
            ignored: [
                '**/storage/framework/views/**',
                '**/storage/statamic/**',
            ],
        },
    },
});
