import { isAbsolute, relative, resolve } from 'node:path'

/**
 * `unplugin-vue-components` hands each auto-imported component's absolute filesystem path to
 * the import string it generates. A checkout under a path with an apostrophe
 * (`/Volumes/Badry's SSD/...`) then ends that single-quoted string early, and Vite fails every
 * file that auto-imports a component. Rewriting the path to the app's `@/` alias keeps the
 * string valid, and every host that registers the app's aliases resolves the same file.
 */
export function createImportPathTransform(root: string) {
  const sourceRoot = resolve(root, 'src')
  return (path: string) => {
    if (!isAbsolute(path)) return path
    const insideSource = relative(sourceRoot, path)
    if (insideSource.startsWith('..')) return path
    return `@/${insideSource.split('\\').join('/')}`
  }
}
