import { defineConfig, loadEnv } from 'vite'
import { transitPlugin } from './server/transitPlugin'

export default defineConfig(({ mode }) => {
  // Reads .env.local (git-ignored). Only the dev server sees these; nothing is exposed to the browser.
  const env = loadEnv(mode, process.cwd(), '')
  return {
    // MapLibre 6 runs its worker as an ES module.
    worker: { format: 'es' },
    plugins: [
      transitPlugin({
        key: env.TRANSIT_511_API_KEY || undefined,
        cacheDir: 'node_modules/.cache/pulse-map',
      }),
    ],
    server: {
      proxy: {
        // adsb.fi doesn't allow cross-origin browser requests, so the dev server fetches it for us.
        '/adsb': {
          target: 'https://opendata.adsb.fi',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/adsb/, ''),
        },
      },
    },
  }
})
