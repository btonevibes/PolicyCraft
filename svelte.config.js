import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
               // Using the static adapter to generate a purely static site.
               // The fallback option allows dynamic routes to work as a client side app.
               // See https://kit.svelte.dev/docs/adapters for more information about adapters.
               adapter: adapter({
                       fallback: 'index.html'
               }),
               paths: {
                       base: process.env.BASE_PATH || '/PolicyCraft'
               }
       }
};

export default config;
