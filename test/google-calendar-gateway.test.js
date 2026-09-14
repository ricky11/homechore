import assert from 'node:assert/strict'
import test from 'node:test'
import { DatabaseSync } from 'node:sqlite'
import { createGoogleCalendarGateway, createGoogleProvider, googleCalendarReadOnlyScope, googleCalendarRedirectUri } from '../server/google-calendar.js'

const clientId = 'client-id.apps.googleusercontent.com'
const clientSecret = 'client-secret'
const encryptionKey = 'encryption-key'

function createFakeProvider() {
  return {
    authorizationUrl: ({ state }) => `https://accounts.example.test/authorize?state=${state}`,
    exchangeCode: async (code, codeVerifier) => {
      if (code === 'bad-code') throw new Error('Google rejected the authorization code.')
      if (!codeVerifier) throw new Error('Google requires a PKCE verifier.')
      return { refreshToken: 'refresh-token' }
    },
    listCalendars: async () => [
      { id: 'family', summary: 'Family calendar', primary: false },
      { id: 'shared', summary: 'Shared calendar', primary: false },
    ],
  }
}

test('requests only offline read-only Google Calendar access', () => {
  const authorizationUrl = new URL(createGoogleProvider(clientId, clientSecret).authorizationUrl({ state: 'csrf-state', codeChallenge: 'code-challenge' }))

  assert.equal(authorizationUrl.searchParams.get('access_type'), 'offline')
  assert.equal(authorizationUrl.searchParams.get('scope'), googleCalendarReadOnlyScope)
  assert.equal(authorizationUrl.searchParams.get('state'), 'csrf-state')
  assert.equal(authorizationUrl.searchParams.get('code_challenge'), 'code-challenge')
  assert.equal(authorizationUrl.searchParams.get('code_challenge_method'), 'S256')
  assert.equal(authorizationUrl.searchParams.get('redirect_uri'), googleCalendarRedirectUri)
})

test('persists an encrypted read-only Google Calendar connection and selected calendar', async () => {
  const database = new DatabaseSync(':memory:')
  const gateway = createGoogleCalendarGateway({ database, clientId, clientSecret, encryptionKey, provider: createFakeProvider() })

  const authorization = gateway.startConnection()
  assert.match(authorization.url, /^https:\/\/accounts\.example\.test\/authorize\?state=/)
  await gateway.completeConnection({ code: 'valid-code', state: authorization.state })

  assert.deepEqual(gateway.status(), { available: true, status: 'connected', message: 'Choose a Google Calendar to share with HomeChore.' })
  assert.deepEqual(await gateway.listCalendars(), [
    { id: 'family', summary: 'Family calendar', primary: false },
    { id: 'shared', summary: 'Shared calendar', primary: false },
  ])

  await gateway.selectCalendar('shared')
  assert.deepEqual(gateway.status(), {
    available: true,
    status: 'ready',
    message: 'Google Calendar is connected.',
    calendar: { id: 'shared', summary: 'Shared calendar' },
  })
  assert.doesNotMatch(database.prepare('SELECT connection_json FROM google_calendar_connection WHERE id = 1').get().connection_json, /refresh-token/)

  const restartedGateway = createGoogleCalendarGateway({ database, clientId, clientSecret, encryptionKey, provider: createFakeProvider() })
  assert.deepEqual(restartedGateway.status(), {
    available: true,
    status: 'ready',
    message: 'Google Calendar is connected.',
    calendar: { id: 'shared', summary: 'Shared calendar' },
  })
  assert.equal((await restartedGateway.listCalendars()).length, 2)

  const wrongKeyGateway = createGoogleCalendarGateway({
    database,
    clientId,
    clientSecret,
    encryptionKey: 'different-encryption-key',
    provider: createFakeProvider(),
  })
  await assert.rejects(wrongKeyGateway.listCalendars())

  restartedGateway.disconnect()
  assert.deepEqual(restartedGateway.status(), { available: true, status: 'disconnected', message: 'Google Calendar is ready to connect on this host.' })
})

test('rejects an invalid OAuth state and provider failures without storing a connection', async () => {
  const database = new DatabaseSync(':memory:')
  const gateway = createGoogleCalendarGateway({ database, clientId, clientSecret, encryptionKey, provider: createFakeProvider() })
  const authorization = gateway.startConnection()

  await assert.rejects(gateway.completeConnection({ code: 'bad-code', state: authorization.state }), /Google rejected/)
  await assert.rejects(gateway.completeConnection({ code: 'valid-code', state: 'wrong-state' }), /state/)
  assert.deepEqual(gateway.status(), { available: true, status: 'disconnected', message: 'Google Calendar is ready to connect on this host.' })
})
