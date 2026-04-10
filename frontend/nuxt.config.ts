import { resolve } from "pathe";

const nitroPrerenderCacheBase = resolve(process.cwd(), ".nuxt/cache/nitro/prerender");

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    compatibilityDate: '2024-04-03',
    devtools: {enabled: false},
    modules: ["@nuxt/ui", '@nuxt/icon', '@nuxtjs/color-mode', '@vueuse/nuxt', 'dayjs-nuxt'],
    ssr: false,
    nitro: {
        preset: 'static',
        storage: {
            // Use a direct fs driver to avoid the Windows file URL warning from @nuxt/nitro-server.
            "internal:nuxt:prerender": {
                driver: "unstorage/drivers/fs-lite",
                base: nitroPrerenderCacheBase,
            },
        },
    },
    dayjs: {
        locales: ['zh'],
        defaultLocale: 'zh'
    },
    icon: {
        clientBundle: {
            scan: {
                globInclude: ['**/*.{vue,jsx,tsx}', 'node_modules/@nuxt/ui/**/*.js'],
                globExclude: ['.*', 'coverage', 'test', 'tests', 'dist', 'build'],
            },
        },
    },
    vue: {
        compilerOptions: {
            isCustomElement: (tag:string) => ['meting-js'].includes(tag),
        },
    },
    app: {
        head: {
            meta: [
                { name: "viewport", content: "width=device-width, initial-scale=1, user-scalable=no" },
                { charset: "utf-8" },
            ],
            link: [
                {href: `/css/APlayer.min.css`, rel: 'stylesheet'},
            ],
            script: [
                {src: `/js/APlayer.min.js`, type: 'text/javascript', async: true, defer: true},
                {src: `/js/Meting.min.js`, type: 'text/javascript', async: true, defer: true},
                {src: `/js/main.js`, type: 'text/javascript', async: true, defer: true},
            ]
        }
    },
    vite: {
        server: {
            proxy: {
                "/api": {
                    target: "http://localhost:8787",
                    // changeOrigin: true,
                },
                "/r2": {
                    target: "http://localhost:8787",
                    // changeOrigin: true,
                },
                "/upload": {
                    target: "http://localhost:8787",
                    // changeOrigin: true,
                },
                "/rss": {
                    target: "http://localhost:8787",
                    // changeOrigin: true,
                },
                "/swagger": {
                    target: "http://localhost:8787",
                    // changeOrigin: true,
                },
            },
        },
        build: {
            rollupOptions: {
                output: {
                    hashCharacters: 'base36',
                    manualChunks(id: string) {
                        if (!id.includes('node_modules')) {
                            return;
                        }

                        if (id.includes('/markdown-it/')) {
                            return 'markdown-core';
                        }

                        if (id.includes('/@shikijs/langs/') || id.includes('/shiki/langs/')) {
                            const langName = id.split('/').pop()?.replace('.mjs', '') || 'misc';
                            return `shiki-lang-${langName}`;
                        }

                        if (id.includes('/@shikijs/themes/') || id.includes('/shiki/themes/')) {
                            return 'shiki-theme';
                        }

                        if (id.includes('/@shikijs/markdown-it/')) {
                            return 'shiki-markdown';
                        }

                        if (id.includes('/@shikijs/vscode-textmate/')) {
                            return 'shiki-textmate';
                        }

                        if (
                            id.includes('/@shikijs/engine-javascript/')
                        ) {
                            return 'shiki-engine-js';
                        }

                        if (
                            id.includes('/@shikijs/engine-oniguruma/')
                            || id.includes('/shiki/wasm')
                        ) {
                            return 'shiki-engine-onig';
                        }

                        if (
                            id.includes('/@shikijs/core/')
                            || id.includes('/shiki/core')
                        ) {
                            return 'shiki-core';
                        }

                        if (id.includes('/@fancyapps/ui/')) {
                            return 'media-viewer';
                        }

                        if (id.includes('/oniguruma-to-es/')) {
                            return 'shiki-oniguruma-to-es';
                        }

                        if (id.includes('/regex-recursion/')) {
                            return 'shiki-regex-recursion';
                        }

                        if (id.includes('/regex-utilities/')) {
                            return 'shiki-regex-utilities';
                        }

                        if (id.includes('/regex/')) {
                            return 'shiki-regex';
                        }

                        if (id.includes('/v-calendar/')) {
                            return 'calendar-vendor';
                        }

                        if (id.includes('/sortablejs/') || id.includes('/@vueuse/integrations/')) {
                            return 'editor-vendor';
                        }
                    }
                }
            }
        }
    }
})
