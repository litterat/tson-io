// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import rehypeTableScroll from './src/lib/rehypeTableScroll.mjs';

export default defineConfig({
  site: 'https://tson.io',
  markdown: {
    rehypePlugins: [rehypeTableScroll],
  },
  vite: {
    plugins: [tailwindcss()],
  },
});