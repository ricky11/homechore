import { networkInterfaces } from 'node:os'
import { serve } from '@hono/node-server'
import multicastDns from 'multicast-dns'
import { app, database, databasePath } from './app.js'

const port = Number(process.env.PORT ?? 8787)
const mdnsHostname = 'chores.local'
const lanAddresses = Object.values(networkInterfaces())
  .flat()
  .filter((address) => address?.family === 'IPv4' && !address.internal)
  .map((address) => address.address)
const mdnsAnswers = lanAddresses.map((address) => ({
  name: mdnsHostname,
  type: 'A',
  ttl: 120,
  data: address,
}))

function startMdnsResponder() {
  if (!mdnsAnswers.length) return null
  try {
    const responder = multicastDns()
    responder.on('error', (error) => {
      console.warn(`  mDNS unavailable: ${error.message}`)
      responder.destroy()
      if (mdnsResponder === responder) mdnsResponder = null
    })
    responder.on('query', (query) => {
      const requested = query.questions.some((question) =>
        question.type === 'A' && question.name.replace(/\.$/, '').toLowerCase() === mdnsHostname,
      )
      if (requested) responder.respond({ answers: mdnsAnswers })
    })
    responder.respond({ answers: mdnsAnswers })
    return responder
  } catch (error) {
    console.warn(`  mDNS unavailable: ${error.message}`)
    return null
  }
}

let mdnsResponder
const server = serve({ fetch: app.fetch, hostname: '0.0.0.0', port }, () => {
  console.log('HomeChore server')
  console.log(`  Local:   http://localhost:${port}/`)
  for (const address of lanAddresses) console.log(`  Network: http://${address}:${port}/`)

  console.log(`  Database: ${databasePath}`)
  mdnsResponder = startMdnsResponder()
  console.log(mdnsResponder ? `  mDNS:    http://${mdnsHostname}:${port}/` : '  mDNS:    unavailable; use a Network URL above')
})

function shutdown() {
  mdnsResponder?.destroy()
  server.close(() => {
    database.close()
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)