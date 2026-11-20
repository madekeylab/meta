import { defineConfig } from 'vite';

// 개발 중에는 화면은 Vite(5173), 실시간 서버는 wrangler dev(8787)가 맡는다.
export default defineConfig({
  server: {
    proxy: {
      '/ws': { target: 'ws://127.0.0.1:8787', ws: true },
      '/api': 'http://127.0.0.1:8787',
    },
  },
  build: { target: 'es2020' },
});
