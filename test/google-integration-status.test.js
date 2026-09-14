import assert from 'node:assert/strict'
import test from 'node:test'
import { app } from '../server/app.js'

async function withGoogleConfiguration(values, callback) {
  const names = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_TOKEN_ENCRYPTION_KEY']
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]))
  for (const name of names) {
    if (values[name] === undefined) delete process.env[name]
    else process.env[name] = values[name]
  }

  try {
    await callback()
  } finally {
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name]
      else process.env[name] = previous[name]
    }
  }
}

test('reports Google Calendar as unavailable when host configuration is absent', async () => {
  await withGoogleConfiguration({}, async () => {
    const response = await app.request('/api/integrations/google')

    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), {
      available: false,
      status: 'unavailable',
      message: 'Google Calendar is not configured on this host.',
    })
  })
})

test('reports Google Calendar as ready to connect when host configuration is present', async () => {
  await withGoogleConfiguration({
    GOOGLE_CLIENT_ID: 'client-id',
    GOOGLE_CLIENT_SECRET: 'client-secret',
    GOOGLE_TOKEN_ENCRYPTION_KEY: 'encryption-key',
  }, async () => {
    const response = await app.request('/api/integrations/google')

    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), {
      available: true,
      status: 'disconnected',
      message: 'Google Calendar is ready to connect on this host.',
    })
  })
})
