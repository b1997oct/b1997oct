// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({

  devToolbar: {
    enabled: false,
  },
  output: 'server',
  server: {
    port: 3000,
  },
  integrations: [react()],

  vite: {
    plugins: [tailwindcss()]
  },
  env: {
    schema: {
      GOOGLE_API_KEY: {
        context: 'server',
        access: 'secret',
        type: 'string',
        optional: true,
      },
      GROQ_API_KEY: {
        context: 'server',
        access: 'secret',
        type: 'string',
        optional: true,
      },
      SLACK_WEBHOOK_URL: {
        context: 'server',
        access: 'secret',
        type: 'string',
        optional: true,
      },
    }
  },

  adapter: vercel()
});