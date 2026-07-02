import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  // Em GitHub Actions, GITHUB_REPOSITORY = "usuario/CARSIGEF"
  // Extrai só o nome do repo para usar como base path no GitHub Pages
  const ghRepo = process.env.GITHUB_REPOSITORY?.trim()
  const base = ghRepo ? `/${ghRepo.split('/')[1]}/` : '/'

  return {
    base,
    server: {
      port: 5173,
      proxy: {
        '/car-proxy': {
          target: 'https://geoserver.car.gov.br',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/car-proxy/, '/geoserver/sicar/ows'),
        },
        '/sigef-proxy': {
          target: 'https://acervofundiario.incra.gov.br',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/sigef-proxy/, '/i3geo/ogc.php'),
        },
      },
    },
  }
})
