import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/internal-ai': {
            target: env.VITE_INTERNAL_AI_PROXY_TARGET || 'http://localhost:3001',
            changeOrigin: true,
          },
          '/twilio-verify': {
            target: 'https://verify3-8725-yyfcuu.twil.io',
            changeOrigin: true,
            secure: true,
            rewrite: (path) => path.replace(/^\/twilio-verify/, ''),
          },
          '/xano-api': {
            target: 'https://api1.simplyworkcrm.com',
            changeOrigin: true,
            secure: true,
            rewrite: (path) => path.replace(/^\/xano-api/, ''),
          }
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
