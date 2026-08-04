// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import rehypeTables from './src/lib/rehypeTables.mjs';

export default defineConfig({
  site: 'https://tson.io',
  markdown: {
    rehypePlugins: [rehypeTables],
  },
  vite: {
    plugins: [tailwindcss()],
  },
});