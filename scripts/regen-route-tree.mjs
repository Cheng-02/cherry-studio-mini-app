// Regenerate the TanStack Router route tree without booting Vite.
import { Generator, getConfig } from '../node_modules/.pnpm/@tanstack+router-generator@1.167.34_supports-color@8.1.1/node_modules/@tanstack/router-generator/dist/esm/index.js'

const root = process.cwd()
const config = getConfig(
  {
    target: 'react',
    autoCodeSplitting: true,
    routesDirectory: 'src/renderer/routes',
    generatedRouteTree: 'src/renderer/routeTree.gen.ts'
  },
  root
)
const generator = new Generator({ root, config })
await generator.run()
console.log('route tree regenerated')
