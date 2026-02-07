
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiKey = env.VITE_GEMINI_API_KEY || env.API_KEY || '';
  
  return {
    plugins: [react()],
    define: {
      // Robust replacement for process.env.API_KEY
      'process.env.API_KEY': JSON.stringify(apiKey),
      // Fallback for the process object itself to prevent ReferenceErrors
      'process.env': {
        API_KEY: apiKey
      }
    },
    server: {
      port: 5173,
      strictPort: true
    }
  };
});
