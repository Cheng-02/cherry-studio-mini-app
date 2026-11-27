/**
 * CI-only workaround: electron-builder's node-module walker resolves every
 * peerDependency of every installed package as if it were a regular
 * dependency, so a peer that pnpm deduped to the app root (e.g. `ai`'s zod)
 * fails the packaging walk with ENOENT.
 *
 * This script links each missing peer inside its dependent's .pnpm node_modules
 * folder to the copy already installed at the app root. Harmless when the links
 * already exist.
 */
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '../..')
const pnpmDir = path.join(root, 'node_modules', '.pnpm')
const rootModules = path.join(root, 'node_modules')

function realOrSelf(p) {
  try {
    return fs.realpathSync(p)
  } catch {
    return p
  }
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

function linkPeersInModuleDir(moduleDir) {
  let entries = []
  try {
    entries = fs.readdirSync(moduleDir, { withFileTypes: true })
  } catch {
    return 0
  }

  let linked = 0
  for (const entry of entries) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue
    let pkgDirs = []
    if (entry.name.startsWith('@')) {
      const scoped = path.join(moduleDir, entry.name)
      try {
        pkgDirs = fs
          .readdirSync(scoped, { withFileTypes: true })
          .filter((d) => d.isDirectory() || d.isSymbolicLink())
          .map((d) => path.join(scoped, d.name))
      } catch {
        continue
      }
    } else {
      pkgDirs = [path.join(moduleDir, entry.name)]
    }

    for (const pkgDir of pkgDirs) {
      const pkg = readJson(path.join(pkgDir, 'package.json'))
      if (!pkg || !pkg.peerDependencies) continue
      for (const peer of Object.keys(pkg.peerDependencies)) {
        const optional = pkg.peerDependenciesMeta?.[peer]?.optional === true
        const target = path.join(moduleDir, peer)
        const source = path.join(rootModules, peer)
        if (!fs.existsSync(source)) {
          if (optional) continue
          console.warn(`[link-peers] missing peer ${peer} for ${pkg.name} (no root copy)`)
          continue
        }
        let state = 'missing'
        try {
          fs.statSync(target)
          state = 'ok'
        } catch {
          try {
            fs.lstatSync(target)
            state = 'dangling'
          } catch {
            state = 'missing'
          }
        }
        if (state === 'ok') continue
        try {
          if (state === 'dangling') fs.unlinkSync(target)
          fs.mkdirSync(path.dirname(target), { recursive: true })
          fs.symlinkSync(realOrSelf(source), target, 'junction')
          linked++
        } catch (error) {
          console.warn(`[link-peers] failed to link ${peer} in ${moduleDir}: ${error.message}`)
        }
      }
    }
  }
  return linked
}

let total = 0
let moduleDirs = []
try {
  moduleDirs = fs
    .readdirSync(pnpmDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(pnpmDir, d.name, 'node_modules'))
} catch {
  console.warn('[link-peers] .pnpm directory not found, skipping')
  process.exit(0)
}

for (const dir of moduleDirs) total += linkPeersInModuleDir(dir)
console.log(`[link-peers] linked ${total} missing peer dependencies`)
