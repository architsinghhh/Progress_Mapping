import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'
import { driveModelPlugin, readDriveModelEnv } from './vite-plugin-drive-model.ts'

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, root, '')
  const drive = readDriveModelEnv(env)

  return {
    plugins: [
      react(),
      tailwindcss(),
      driveModelPlugin({
        root,
        fileIdOrUrl: drive.fileIdOrUrl,
        apiKey: drive.apiKey,
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(root, './src'),
      },
    },
    server: {
      // Large GLB streams from Drive can take a while
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  }
})
