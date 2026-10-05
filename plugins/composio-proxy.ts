import type { Plugin } from 'vite'

/* ============================================================================
   COMPOSIO PROXY  (server-side only)

   Composio authenticates with a *project* API key. That key grants access to
   every connected account in the project, so it must never be bundled into
   browser JavaScript or exposed through a VITE_ variable.

   This dev-server middleware is the boundary. Browser code calls the
   same-origin path /api/composio/*, and the key is attached here, in Node,
   where the user's browser can never read it.

   In production, serve the identical path from your own backend (an edge
   function or a small Node handler) and the client code needs no change — it
   only ever sees a relative URL.

   Hardening:
     · Only GET/POST/PATCH/PUT/DELETE are forwarded.
     · The upstream host is fixed; a client cannot steer it elsewhere.
     · Any client-supplied x-api-key or authorization header is dropped, so a
       caller cannot smuggle a different credential upstream.
     · The key is never logged, and never appears in a forwarded URL.
   ========================================================================== */

const MOUNT = '/api/composio'
/** Fixed by default; override only for self-hosted gateways or local tests. */
const UPSTREAM = process.env.COMPOSIO_UPSTREAM?.replace(/\/+$/, '') ?? 'https://backend.composio.dev'

const FORWARDED = new Set(['GET', 'POST', 'PATCH', 'PUT', 'DELETE'])
const DROPPED_HEADERS = new Set(['x-api-key', 'authorization', 'cookie', 'host', 'content-length'])

function key(): string | undefined {
  const k = process.env.COMPOSIO_API_KEY?.trim()
  return k && k.length ? k : undefined
}

/** Auth config ids are not secrets, but reporting them keeps setup honest. */
function missingAuthConfigs(): string[] {
  const need = ['YOUTUBE', 'INSTAGRAM', 'LINKEDIN'] as const
  return need.filter((t) => !process.env[`COMPOSIO_AUTH_CONFIG_${t}`]?.trim()).map((t) => t.toLowerCase())
}

async function readBody(req: NodeJS.ReadableStream): Promise<Uint8Array> {
  const chunks: Uint8Array[] = []
  for await (const chunk of req as AsyncIterable<Uint8Array>) chunks.push(chunk)
  const total = chunks.reduce((n, c) => n + c.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.length
  }
  return out
}

export function composioProxy(): Plugin {
  return {
    name: 'creator-os:composio-proxy',
    configureServer(server) {
      server.middlewares.use(MOUNT, async (req, res) => {
        const send = (status: number, payload: unknown) => {
          const body = JSON.stringify(payload)
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Cache-Control', 'no-store')
          res.end(body)
        }

        /* Cheap liveness probe that never leaves this process. */
        const rest = (req.url ?? '/').split('?')[0].replace(/^\/+/, '')
        if (rest === '_status') {
          return send(200, {
            transport: 'composio',
            configured: Boolean(key()),
            missingAuthConfigs: missingAuthConfigs(),
          })
        }

        const apiKey = key()
        if (!apiKey) {
          return send(503, {
            error: 'not_configured',
            hint: 'Set COMPOSIO_API_KEY in the environment running the dev server, then restart it. The key is a project key and is never sent to the browser.',
          })
        }

        const method = (req.method ?? 'GET').toUpperCase()
        if (!FORWARDED.has(method)) return send(405, { error: 'method_not_allowed' })

        const query = (req.url ?? '').includes('?') ? req.url!.slice(req.url!.indexOf('?')) : ''
        const target = `${UPSTREAM}/api/${rest}${query}`

        try {
          const headers: Record<string, string> = { Accept: 'application/json', 'x-api-key': apiKey }
          for (const [name, value] of Object.entries(req.headers)) {
            if (DROPPED_HEADERS.has(name.toLowerCase())) continue
            if (typeof value === 'string') headers[name] = value
          }

          let body: Uint8Array | undefined
          if (method !== 'GET' && method !== 'DELETE') body = await readBody(req)

          const upstream = await fetch(target, {
            method,
            headers,
            body: body && body.length ? (body as unknown as BodyInit) : undefined,
            signal: AbortSignal.timeout(30_000),
          })

          const text = await upstream.text()
          res.statusCode = upstream.status
          const contentType = upstream.headers.get('content-type')
          res.setHeader('Content-Type', contentType ?? 'application/json')
          res.setHeader('Cache-Control', 'no-store')
          res.end(text)
        } catch (err) {
          const message = err instanceof Error ? err.message : 'unknown error'
          server.config.logger.error(`[composio-proxy] ${method} /${rest} failed: ${message}`)
          send(502, { error: 'upstream_unreachable', hint: 'Could not reach backend.composio.dev from the dev server.' })
        }
      })
    },
  }
}
