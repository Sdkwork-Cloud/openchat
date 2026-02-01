/**
 * Vite 构建配置
 *
 * 职责：优化构建输出，提升应用性能
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { compression } from 'vite-plugin-compression2';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react({
      babel: {
        plugins: [
          // React Compiler 优化（生产环境）
          ...(mode === 'production' ? [['babel-plugin-react-compiler', {}]] : []),
        ],
      },
    }),
    // 包体积分析（analyze 模式）
    mode === 'analyze' &&
      visualizer({
        open: true,
        gzipSize: true,
        brotliSize: true,
        filename: 'dist/stats.html',
      }),
    // Brotli 压缩
    mode === 'production' &&
      compression({
        algorithm: 'brotliCompress',
        exclude: [/\.(br)$/, /\.(gz)$/],
      }),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    port: 5173,
    strictPort: false,
    // HTTPS 配置 - 如需启用请取消下面注释并配置证书
    // https: true,
  },

  build: {
    target: 'esnext',
    outDir: 'dist',
    sourcemap: mode !== 'production',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
        pure_funcs: mode === 'production' ? ['console.log', 'console.info'] : [],
      },
      format: {
        comments: false,
      },
    },
    rollupOptions: {
      external: ['easyjssdk'],
      output: {
        // 代码分割策略
        manualChunks: {
          // React 核心
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // 状态管理
          'vendor-state': ['zustand', 'immer', '@tanstack/react-query', '@tanstack/react-virtual'],
          // UI 组件
          'vendor-ui': ['@tiptap/react', '@tiptap/starter-kit', '@tiptap/extension-placeholder'],
          // Markdown
          'vendor-markdown': ['react-markdown', 'remark-gfm', 'remark-breaks'],
          // 代码高亮
          'vendor-syntax': ['react-syntax-highlighter', 'highlight.js'],
          // 国际化
          'vendor-i18n': ['react-i18next', 'i18next', 'i18next-browser-languagedetector'],
          // 工具库
          'vendor-utils': ['lodash-es', 'date-fns', 'clsx', 'tailwind-merge'],
        },
        // 资源文件名格式
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name || '';
          if (info.endsWith('.css')) {
            return 'assets/[name]-[hash][extname]';
          }
          if (/(png|jpe?g|gif|svg|webp|ico)$/.test(info)) {
            return 'assets/images/[name]-[hash][extname]';
          }
          if (/(woff2?|ttf|otf|eot)$/.test(info)) {
            return 'assets/fonts/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
    // 资源内联阈值
    assetsInlineLimit: 4096,
    // 代码分割大小警告
    chunkSizeWarningLimit: 500,
    // CSS 代码分割
    cssCodeSplit: true,
    // 预加载 polyfill
    polyfillModulePreload: true,
  },

  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'zustand',
      '@tanstack/react-query',
    ],
    exclude: [
      // 大型依赖延迟加载
      'xterm',
      'xterm-addon-fit',
      // 外部依赖（通过CDN加载）
      'easyjssdk',
    ],
  },

  // 预览配置
  preview: {
    port: 4173,
    strictPort: false,
  },
}));
