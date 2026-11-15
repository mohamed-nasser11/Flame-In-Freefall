import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, loadEnv, type Plugin } from 'vite'

/**
 * Serves the functions in /api during `npm run dev`, so the assistant works locally
 * without the Vercel CLI. Production uses Vercel's own runtime for the same files.
 */
function apiRoutes(): Plugin {
  return {
    name: 'zerog-flame-api-routes',
    configureServer(server) {
      server.middlewares.use('/api', async (req: IncomingMessage, res: ServerResponse, next) => {
        const name = (req.url ?? '').split('?')[0].replace(/^\//, '')
        if (!/^[a-z-]+$/.test(name)) return next()
        try {
          const chunks: Buffer[] = []
          for await (const chunk of req) chunks.push(chunk as Buffer)
          const raw = Buffer.concat(chunks).toString('utf8')
          const mod = await server.ssrLoadModule(`/api/${name}.ts`)
          const vreq = Object.assign(req, { body: raw ? JSON.parse(raw) : undefined })
          const vres = Object.assign(res, {
            status(code: number) {
              res.statusCode = code
              return vres
            },
            json(body: unknown) {
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(body))
              return vres
            },
          })
          await mod.default(vreq, vres)
        } catch (err) {
          server.config.logger.error(String(err))
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'Local API error' }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))
  return {
    plugins: [react(), tailwindcss(), apiRoutes()],
  }
})
