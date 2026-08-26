import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        app: resolve(__dirname, 'app.html'),
        'Editorial-writingpad': resolve(__dirname, 'Editorial-writingpad.html'),
        checkout: resolve(__dirname, 'checkout.html'),
        terms: resolve(__dirname, 'terms.html'),
        privacy: resolve(__dirname, 'privacy.html'),
        
        // New Creator Funnel Pages
        creators: resolve(__dirname, 'creators.html'),
        checkoutCreators: resolve(__dirname, 'checkout-creators.html'),
        creatorsIndex: resolve(__dirname, 'creators-index.html')
      },
    },
  },
});