import assert from 'node:assert/strict'
import test from 'node:test'
import { app } from '../server/app.js'

test('reports Google Calendar status without Household configuration', async () => {
  const response = await app.request('/api/integrations/google')
  const status = await response.json()

  assert.equal(response.status, 200)
  assert.equal(status.available, true)
  assert.ok(['disconnected', 'connecting', 'connected', 'ready'].includes(status.status))
  assert.equal('refreshToken' in status, false)
  assert.equal('clientSecret' in status, false)
})

test('does not allow a remote client to manage Google Calendar', async () => {
  const requests = [
    { path: '/api/integrations/google/connect' },
    { path: '/api/integrations/google/calendars' },
    { path: '/api/integrations/google/calendar', method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ calendarId: 'shared' }) },
    { path: '/api/integrations/google', method: 'DELETE' },
  ]

  for (const request of requests) {
    const response = await app.request(request.path, { ...request, headers: { ...request.headers, Host: '192.168.1.20:8787' } })
    assert.equal(response.status, 403)
    assert.match((await response.json()).error, /host computer/)
  }
})
