import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { google } from 'googleapis'

export const googleCalendarReadOnlyScope = 'https://www.googleapis.com/auth/calendar.readonly'
export const googleCalendarRedirectUri = 'http://127.0.0.1:8787/api/integrations/google/callback'
const connectionId = 1

function tokenEncryptionKey(value) {
  return createHash('sha256').update(value).digest()
}

function encrypt(value, key) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', tokenEncryptionKey(key), iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url')
}

function decrypt(value, key) {
  const bytes = Buffer.from(value, 'base64url')
  const decipher = createDecipheriv('aes-256-gcm', tokenEncryptionKey(key), bytes.subarray(0, 12))
  decipher.setAuthTag(bytes.subarray(12, 28))
  return Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8')
}

export function createGoogleProvider(clientId, clientSecret) {
  const createClient = () => new google.auth.OAuth2({
    clientId,
    clientSecret,
    redirectUri: googleCalendarRedirectUri,
  })
  return {
    authorizationUrl: ({ state, codeChallenge }) => createClient().generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: [googleCalendarReadOnlyScope], state, code_challenge: codeChallenge, code_challenge_method: 'S256' }),
    async exchangeCode(code, codeVerifier) {
      let tokens
      try { ({ tokens } = await createClient().getToken({ code, codeVerifier })) }
      catch (error) {
        const description = error.response?.data?.error_description
        throw new Error(typeof description === 'string' ? description.slice(0, 240) : 'Google could not complete the authorization request.')
      }
      if (!tokens.refresh_token) throw new Error('Google did not provide offline access. Try connecting again and approve the requested access.')
      return { refreshToken: tokens.refresh_token }
    },
    async listCalendars({ refreshToken }) {
      const auth = createClient()
      auth.setCredentials({ refresh_token: refreshToken })
      const response = await google.calendar({ version: 'v3', auth }).calendarList.list({ minAccessRole: 'reader' })
      return (response.data.items ?? []).map((calendar) => ({ id: calendar.id, summary: calendar.summary ?? calendar.id, primary: Boolean(calendar.primary) }))
    },
    async listEvents({ refreshToken, calendarId, start, end }) {
      const auth = createClient()
      auth.setCredentials({ refresh_token: refreshToken })
      const response = await google.calendar({ version: 'v3', auth }).events.list({
        calendarId,
        timeMin: `${start}T00:00:00.000Z`,
        timeMax: `${end}T00:00:00.000Z`,
        singleEvents: true,
        orderBy: 'startTime',
      })
      return (response.data.items ?? []).flatMap((event) => {
        const startValue = event.start?.dateTime ?? event.start?.date
        const endValue = event.end?.dateTime ?? event.end?.date
        return event.id && startValue && endValue
          ? [{ id: event.id, title: event.summary ?? 'Untitled event', start: startValue, end: endValue, allDay: Boolean(event.start?.date) }]
          : []
      })
    },
  }
}

export function createGoogleCalendarGateway({ database, clientId, clientSecret, encryptionKey, provider = createGoogleProvider(clientId, clientSecret) }) {
  database.exec(`CREATE TABLE IF NOT EXISTS google_calendar_connection (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    connection_json TEXT NOT NULL
  );`)
  const read = database.prepare('SELECT connection_json FROM google_calendar_connection WHERE id = ?')
  const write = database.prepare('INSERT OR REPLACE INTO google_calendar_connection (id, connection_json) VALUES (?, ?)')
  const remove = database.prepare('DELETE FROM google_calendar_connection WHERE id = ?')
  const stored = () => {
    const row = read.get(connectionId)
    return row ? JSON.parse(row.connection_json) : null
  }
  const save = (value) => write.run(connectionId, JSON.stringify(value))
  const activeConnection = () => {
    const value = stored()
    return value?.refreshToken ? { ...value, refreshToken: decrypt(value.refreshToken, encryptionKey) } : null
  }

  function status() {
    if (!clientId) return { available: false, status: 'unavailable', message: 'Google Calendar is not included in this HomeChore release.' }
    const value = stored()
    if (value?.pendingState) return { available: true, status: 'connecting', message: 'Waiting for Google Calendar authorization.' }
    if (!value?.refreshToken) return { available: true, status: 'disconnected', message: 'Google Calendar is ready to connect on this host.' }
    return value.calendarId
      ? { available: true, status: 'ready', message: 'Google Calendar is connected.', calendar: { id: value.calendarId, summary: value.calendarSummary } }
      : { available: true, status: 'connected', message: 'Choose a Google Calendar to share with HomeChore.' }
  }

  function startConnection() {
    if (!clientId) throw new Error('Google Calendar is not included in this HomeChore release.')
    const state = randomBytes(32).toString('base64url')
    const codeVerifier = randomBytes(32).toString('base64url')
    const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url')
    save({ pendingState: state, pendingVerifier: encrypt(codeVerifier, encryptionKey) })
    return { state, url: provider.authorizationUrl({ state, codeChallenge }) }
  }

  async function completeConnection({ code, state }) {
    const value = stored()
    const expectedState = Buffer.from(value?.pendingState ?? '')
    const receivedState = Buffer.from(typeof state === 'string' ? state : '')
    if (!value?.pendingState || expectedState.length !== receivedState.length || !timingSafeEqual(expectedState, receivedState)) {
      remove.run(connectionId)
      throw new Error('Google authorization state did not match. Start the connection again.')
    }
    try {
      const tokens = await provider.exchangeCode(code, decrypt(value.pendingVerifier, encryptionKey))
      save({ refreshToken: encrypt(tokens.refreshToken, encryptionKey) })
    } catch (error) {
      remove.run(connectionId)
      throw error
    }
  }

  async function listCalendars() {
    const value = activeConnection()
    if (!value) throw new Error('Google Calendar is not connected.')
    return provider.listCalendars({ refreshToken: value.refreshToken })
  }

  async function selectCalendar(calendarId) {
    const calendars = await listCalendars()
    const calendar = calendars.find((item) => item.id === calendarId)
    if (!calendar) throw new Error('Select a readable Google Calendar.')
    const value = stored()
    save({ ...value, calendarId: calendar.id, calendarSummary: calendar.summary })
  }

  async function listEvents({ start, end }) {
    const value = activeConnection()
    if (!value?.calendarId) throw new Error('Choose a Google Calendar before viewing Calendar Events.')
    const events = await provider.listEvents({ refreshToken: value.refreshToken, calendarId: value.calendarId, start, end })
    return events.map(({ calendarId, ...event }) => event)
  }

  function disconnect() { remove.run(connectionId) }

  return { status, startConnection, completeConnection, listCalendars, selectCalendar, listEvents, disconnect }
}
