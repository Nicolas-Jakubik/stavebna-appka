// Test-only server: use HTTPS so Secure cookies work in WebKit/Safari.
// Listens on loopback only and is never deployed to Vercel Production.
const fs = require('node:fs')
const https = require('node:https')
const next = require('next')

const keyPath = process.env.E2E_TLS_KEY_PATH
const certPath = process.env.E2E_TLS_CERT_PATH
if (process.env.CI !== 'true' || !keyPath || !certPath) {
  throw new Error('Local HTTPS browser smoke server requires ephemeral CI-only TLS certificates')
}
if (!process.env.ADMIN_PASSWORD || process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Browser smoke requires a synthetic admin password and NO database service-role key')
}

const port = 3443
const app = next({ dev: false, hostname: 'localhost', port })
const handler = app.getRequestHandler()

app.prepare().then(() => {
  https.createServer({
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  }, (req, res) => {
    // In production Vercel forwards HTTPS requests with this header.
    // Next.js uses it when constructing the Request URL and checking Origin.
    req.headers['x-forwarded-proto'] = 'https'
    return handler(req, res)
  })
    .listen(port, '127.0.0.1', () => {
      console.log('Isolated HTTPS browser smoke app listening on loopback')
    })
}).catch(error => {
  console.error('Could not start isolated HTTPS smoke server', error)
  process.exitCode = 1
})
