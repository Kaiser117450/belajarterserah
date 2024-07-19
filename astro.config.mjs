import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import tailwind from "@astrojs/tailwind";

import netlify from "@astrojs/netlify";

// https://astro.build/config
export default defineConfig({
  integrations: [starlight({
    title: 'Belajarin Aja',
    social: {
      github: 'https://github.com/withastro/starlight'
    },
    sidebar: [{
      label: 'Belajar BIG DATA',
      autogenerate: {
        directory: 'reference'
      }
    }]
  }), tailwind()],
  output: "server",
  adapter: netlify()
});