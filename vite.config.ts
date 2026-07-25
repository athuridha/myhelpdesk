import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import devServer from '@hono/vite-dev-server'
import nodeAdapter from '@hono/vite-dev-server/node'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  Object.assign(process.env, env)

  return {
    plugins: [
      react(),
      tailwindcss(),
      devServer({
        adapter: nodeAdapter,
        entry: 'api/index.ts',
        exclude: [/^(?!\/api).*/],
      }),
    ],
    resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  }
})
