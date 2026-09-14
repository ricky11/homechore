import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { getOrCreateGoogleTokenKey } from '../server/google-token-key.js'

test('creates and retains a private Google token encryption key', () => {
  const directory = mkdtempSync(join(tmpdir(), 'homechore-google-key-'))
  const path = join(directory, 'google-calendar.key')

  try {
    const key = getOrCreateGoogleTokenKey(path)
    assert.match(key, /^[A-Za-z0-9_-]{43}$/)
    assert.equal(getOrCreateGoogleTokenKey(path), key)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})