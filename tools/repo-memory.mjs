import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, extname, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { McpServer } from '@modelcontextprotocol/server'
import { serveStdio } from '@modelcontextprotocol/server/stdio'
import { z } from 'zod'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const allowedRoots = ['AGENTS.md', 'README.md', 'package.json', 'docs', 'src', 'supabase/migrations', 'e2e']
const allowedExtensions = new Set(['.md', '.json', '.ts', '.tsx', '.sql'])

export function createIndex(root = repo) {
  const cache = new Map()
  const files = () => {
    const result = []
    const walk = (path) => {
      let info
      try { info = statSync(path) } catch { return }
      if (info.isDirectory()) {
        for (const name of readdirSync(path)) {
          if (name.startsWith('.') || name === 'node_modules' || name === 'dist' || name === 'evidence') continue
          walk(resolve(path, name))
        }
      } else if (allowedExtensions.has(extname(path)) && info.size <= 1_000_000) {
        result.push(relative(root, path).split(sep).join('/'))
      }
    }
    for (const item of allowedRoots) walk(resolve(root, item))
    return result
  }
  const read = (path, maxChars = 12_000) => {
    if (!files().includes(path)) throw new Error('File is outside the repository knowledge index')
    const full = resolve(root, path)
    const info = statSync(full)
    const cached = cache.get(path)
    if (!cached || cached.mtime !== info.mtimeMs || cached.size !== info.size) {
      cache.set(path, { mtime: info.mtimeMs, size: info.size, content: readFileSync(full, 'utf8') })
    }
    return cache.get(path).content.slice(0, Math.min(maxChars, 30_000))
  }
  const search = (query, limit = 8) => {
    const terms = query.toLowerCase().split(/\s+/).filter((term) => term.length > 2)
    if (!terms.length) return []
    const matches = []
    for (const path of files()) {
      const lines = read(path, 1_000_000).split(/\r?\n/)
      for (const [offset, line] of lines.entries()) {
        const lower = line.toLowerCase()
        const score = terms.filter((term) => lower.includes(term)).length
        if (score) matches.push({ path, line: offset + 1, text: line.trim().slice(0, 200), score })
      }
    }
    return matches.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path)).slice(0, Math.min(limit, 20))
  }
  return { files, read, search }
}

function buildServer() {
  const index = createIndex()
  const server = new McpServer({ name: 'travel-repository-memory', version: '1.0.0' })
  server.registerTool('search_repository', {
    description: 'Search allowlisted travel app docs, source, migrations, and tests. Returns short line-numbered excerpts.',
    inputSchema: z.object({ query: z.string().min(3), limit: z.number().int().min(1).max(20).optional() }),
  }, async ({ query, limit }) => ({ content: [{ type: 'text', text: JSON.stringify(index.search(query, limit)) }] }))
  server.registerTool('read_repository_file', {
    description: 'Read one allowlisted travel app file with a bounded output size. Search first for the exact path.',
    inputSchema: z.object({ path: z.string(), maxChars: z.number().int().min(500).max(30_000).optional() }),
  }, async ({ path, maxChars }) => ({ content: [{ type: 'text', text: index.read(path, maxChars) }] }))
  return server
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void serveStdio(buildServer)
}
