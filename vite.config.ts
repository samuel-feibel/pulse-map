import { defineConfig } from 'vite'

export default defineConfig({
  // MapLibre 6 runs its worker as an ES module.
  worker: { format: 'es' },
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
})
