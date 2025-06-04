import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

const base = process.env.BASE_PATH || '/PolicyCraft/';

export default defineConfig({
        plugins: [sveltekit()],
        base
});
