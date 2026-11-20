import { strict as assert } from 'node:assert'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { createIndex } from './repo-memory.mjs'

test('knowledge search is bounded, cached, and excludes secret files', () => {
  const root = mkdtempSync(join(tmpdir(), 'travel-memory-'))
  mkdirSync(join(root, 'docs'))
  writeFileSync(join(root, 'docs', 'ARCHITECTURE.md'), 'Chat messages use RLS.\nFeed posts use RLS.')
  writeFileSync(join(root, '.env.local'), 'SECRET=never-return-me')
  const index = createIndex(root)
  assert.equal(index.search('RLS', 1).length, 1)
  assert.match(index.read('docs/ARCHITECTURE.md'), /Chat messages/)
  assert.throws(() => index.read('.env.local'))
  assert.throws(() => index.read('../outside.md'))
  writeFileSync(join(root, 'docs', 'ARCHITECTURE.md'), 'Updated architecture with read receipts')
  assert.match(index.read('docs/ARCHITECTURE.md'), /Updated architecture/)
})
