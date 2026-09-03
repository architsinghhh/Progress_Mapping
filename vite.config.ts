import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
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
      {
        name: 'plans-pdf-404',
        configureServer(server) {
          // Missing plan PDFs must not fall through to index.html (embeds the app in the viewer).
          server.middlewares.use((req, res, next) => {
            const url = (req.url ?? '').split('?')[0]
            if (!url.startsWith('/media/plans/') || !url.toLowerCase().endsWith('.pdf')) {
              next()
              return
            }
            const filePath = path.join(root, 'public', decodeURIComponent(url.replace(/^\//, '')))
            if (!fs.existsSync(filePath)) {
              res.statusCode = 404
              res.setHeader('Content-Type', 'text/plain; charset=utf-8')
              res.end('PDF not found')
              return
            }
            next()
          })
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(root, './src'),
      },
    },
    optimizeDeps: {
      include: ['three', '@react-three/fiber', '@react-three/drei', 'recharts'],
    },
  }
})
