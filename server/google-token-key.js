import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'

export function getOrCreateGoogleTokenKey(path) {
  if (existsSync(path)) return readFileSync(path, 'utf8').trim()
  const key = randomBytes(32).toString('base64url')
  try { writeFileSync(path, key, { encoding: 'utf8', mode: 0o600, flag: 'wx' }) }
  catch (error) {
    if (error.code !== 'EEXIST') throw error
    return readFileSync(path, 'utf8').trim()
  }
  return key
}