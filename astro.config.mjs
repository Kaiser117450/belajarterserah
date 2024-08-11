import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import tailwind from "@astrojs/tailwind";

import vercel from "@astrojs/vercel/serverless";

// https://astro.build/config
export default defineConfig({
  integrations: [starlight({
    title: 'Belajarin Aja',
    social: {
      github: 'https://github.com/withastro/starlight'
    },
      sidebar: [
        
        {
          label: 'Belajar BIG DATA',
          autogenerate: { directory: 'reference' },
        },
        {
          label: 'Belajar Jadi hengker',
          autogenerate: { directory: 'hack' },
        },
      ],

    
  }), 
  tailwind()],
  output: "server",
  adapter: vercel()
});