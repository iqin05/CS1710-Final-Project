import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// Static build for GitHub Pages. The site is served from /CS1710-Final-Project/,
			// so CI sets BASE_PATH; local dev and preview run at the root.
			adapter: adapter(),
			paths: { base: process.env.BASE_PATH ?? '' },
			// The nav's #section anchors only exist after the data loads in the browser.
			prerender: { handleMissingId: 'ignore' }
		})
	]
});
