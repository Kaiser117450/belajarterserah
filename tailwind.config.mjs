import starlightPlugin from '@astrojs/starlight-tailwind';

// Generated color palettes
const accent = { 200: '#a5cbff', 600: '#0067d2', 900: '#003068', 950: '#00224e' };
const gray = { 100: '#f4f7f8', 200: '#eaeef0', 300: '#bec3c5', 400: '#848d92', 500: '#515a5e', 700: '#313a3e', 800: '#20282c', 900: '#15191b' };

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			colors: { accent, gray },
		},
	},
	plugins: [starlightPlugin()],
};