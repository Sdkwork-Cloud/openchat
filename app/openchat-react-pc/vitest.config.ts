/**
 * Vitest 测试配置
 * 
 * 职责：配置单元测试和集成测试环境
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

const modulePackageNames = [
  'agent',
  'appstore',
  'auth',
  'commerce',
  'contacts',
  'creation',
  'device',
  'discover',
  'drive',
  'im',
  'notification',
  'rtc',
  'search',
  'settings',
  'skill',
  'social',
  'terminal',
  'tool',
  'tools',
  'video',
  'wallet',
  'commons',
  'ui',
  'kernel',
  'contracts',
] as const;

const workspacePackageAlias = Object.fromEntries(
  modulePackageNames.map((name) => [
    `@sdkwork/openchat-pc-${name}`,
    path.resolve(__dirname, `./packages/sdkwork-openchat-pc-${name}/src/index.ts`),
  ])
);

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: [
      'src/tests/**/*.{test,spec}.{ts,tsx}',
      'tests/**/*.{test,spec}.{ts,tsx}',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
    // 测试超时
    testTimeout: 10000,
    // 钩子超时
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      ...workspacePackageAlias,
    },
  },
});
