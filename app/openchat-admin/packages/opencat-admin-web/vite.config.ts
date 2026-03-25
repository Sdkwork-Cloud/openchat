import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import {
  remapWorktreeWorkspaceImport,
  resolveWorkspacePackageEntry,
} from './viteWorkspaceResolver';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function workspacePackageResolver(packagesRootDir: string) {
  return {
    name: 'workspace-package-resolver',
    enforce: 'pre' as const,
    resolveId(source: string, importer?: string) {
      return (
        resolveWorkspacePackageEntry(source, packagesRootDir) ??
        remapWorktreeWorkspaceImport(source, importer, packagesRootDir)
      );
    },
  };
}

export default defineConfig(() => {
  const workspaceRoot = path.resolve(__dirname, '../..');
  const packagesRootDir = path.resolve(__dirname, '../../packages');

  return {
    plugins: [workspacePackageResolver(packagesRootDir), react(), tailwindcss()],
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: [{ find: '@', replacement: path.resolve(__dirname, '.') }],
    },
    server: {
      port: 3001,
      host: true,
      fs: {
        allow: [workspaceRoot],
      },
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          rewrite: (value) => value.replace(/^\/api/, ''),
        },
      },
    },
  };
});
