import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// 后端端口与 server.js 的 config.port 保持一致（可用 VITE_BACKEND 覆盖）
const BACKEND = process.env.VITE_BACKEND || 'http://127.0.0.1:3123';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // 与 tsconfig.json 的 paths 保持一致
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // public/ 目录里放的是旧的零依赖控制台（legacy 回退页），
  // 关闭 publicDir 拷贝，避免它的 index.html 与 Vite 入口冲突。
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1200,
  },
  server: {
    port: 5173,
    // 开发时前端跑 5173，API 必须打到 3123 的 server.js
    proxy: {
      '/api': { target: BACKEND, changeOrigin: true },
      '/v1': { target: BACKEND, changeOrigin: true },
    },
  },
});
