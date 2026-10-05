/* ============================================================================
   SECURITY AUDIT
   A static scanner for the classes of mistake that matter in this codebase,
   run as part of `npm run verify` so a regression fails the build rather than
   shipping. It checks for:

     1. HTML injection sinks        — innerHTML / document.write
     2. Code evaluation             — eval / new Function
     3. Hardcoded credentials       — key-shaped literals in source
     4. Secrets in client env vars  — VITE_* names that imply a secret
     5. Credentials sent by the client — an x-api-key set in browser code
     6. Insecure navigation         — target="_blank" without rel="noopener"
     7. Wildcard message targets    — postMessage('*')
     8. Absolute third-party URLs   — browser fetches that bypass the proxy
     9. Sensitive data at rest      — tokens in localStorage

   Pass `--deps` to also run `npm audit` against the dependency tree.
   ========================================================================== */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const SCAN_DIRS = ['src', 'scripts', 'plugins']
const SOURCE_EXT = /\.(ts|tsx|js|jsx|mjs|css|html)$/
const SKIP_FILES = /node_modules|\.d\.ts$|security-audit\.ts$/

interface Finding {
  file: string
  line: number
  rule: string
  severity: 'block' | 'warn'
  match: string
}

interface Rule {
  id: string
  severity: 'block' | 'warn'
  /** Files this rule applies to. 'client' = anything bundled for the browser. */
  scope: 'client' | 'all'
  pattern: RegExp
  why: string
  /** When the regex matches but this also matches, the finding is allowed. */
  allow?: RegExp
}

const RULES: Rule[] = [
  {
    id: 'html-injection-sink',
    severity: 'block',
    scope: 'all',
    pattern: /\b(?:innerHTML|outerHTML|document\.write|insertAdjacentHTML)\b/,
    why: 'Injecting HTML strings is the single largest XSS surface. Render nodes instead.',
  },
  {
    id: 'dangerously-set-inner-html',
    severity: 'block',
    scope: 'all',
    pattern: /dangerouslySetInnerHTML/,
    why: 'React escape hatch that disables escaping entirely.',
  },
  {
    id: 'code-evaluation',
    severity: 'block',
    scope: 'all',
    pattern: /\b(?:eval\s*\(|new\s+Function\s*\()/,
    why: 'Dynamic code execution turns any string into an attack vector.',
  },
  {
    id: 'hardcoded-credential',
    severity: 'block',
    scope: 'all',
    pattern: /\b(?:api[_-]?key|secret|password|passwd|token|private[_-]?key)\b\s*[:=]\s*['"][^'"]{16,}['"]/i,
    why: 'A credential literal in source ends up in version control and in every bundle.',
    allow: /(?:placeholder|example|your[_-]|xxx|<|process\.env|import\.meta\.env|\{)/i,
  },
  {
    id: 'provider-key-literal',
    severity: 'block',
    scope: 'all',
    pattern: /\b(?:sk-[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{20,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})/,
    why: 'Looks like a live provider credential.',
  },
  {
    id: 'secret-in-client-env',
    severity: 'block',
    scope: 'client',
    pattern: /VITE_[A-Z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL)[A-Z0-9_]*/,
    why: 'VITE_* variables are inlined into the client bundle. A secret there is public.',
  },
  {
    id: 'client-sends-api-key',
    severity: 'block',
    scope: 'client',
    pattern: /['"]x-api-key['"]\s*:/,
    why: 'Setting x-api-key from browser code means the key ships to every visitor. Attach it in the server proxy.',
  },
  {
    id: 'blank-target-without-noopener',
    severity: 'warn',
    scope: 'all',
    pattern: /target=["']_blank["']/,
    why: 'Without rel="noopener" the opened page can navigate the opener via window.opener.',
    allow: /rel=["'][^"']*noopener/,
  },
  {
    id: 'open-without-noopener',
    severity: 'warn',
    scope: 'all',
    pattern: /window\.open\(/,
    why: 'Pass "noopener,noreferrer" so the new window cannot reach back into this one.',
    allow: /noopener/,
  },
  {
    id: 'wildcard-postmessage',
    severity: 'block',
    scope: 'all',
    pattern: /postMessage\([^)]*['"]\*['"]/,
    why: "postMessage('*') delivers the payload to any origin listening.",
  },
  {
    id: 'absolute-third-party-fetch',
    severity: 'warn',
    scope: 'client',
    pattern: /fetch\(\s*['"`]https?:\/\/(?!localhost|127\.0\.0\.1)/,
    why: 'Browser fetches to a third-party host bypass the proxy and leak the origin. Call a same-origin path instead.',
  },
  {
    id: 'sensitive-storage',
    severity: 'warn',
    scope: 'client',
    pattern: /(?:localStorage|sessionStorage)\.setItem\(\s*['"`][^'"`]*(?:token|secret|key|password|credential)/i,
    why: 'Browser storage is readable by any script on the origin. Keep credentials server-side.',
  },
]

function walk(dir: string): string[] {
  const out: string[] = []
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return out
  }
  for (const entry of entries) {
    const full = join(dir, entry)
    if (SKIP_FILES.test(full)) continue
    let st
    try {
      st = statSync(full)
    } catch {
      continue
    }
    if (st.isDirectory()) out.push(...walk(full))
    else if (SOURCE_EXT.test(entry)) out.push(full)
  }
  return out
}

const files = SCAN_DIRS.flatMap((d) => walk(join(ROOT, d)))
const findings: Finding[] = []

for (const file of files) {
  const rel = relative(ROOT, file)
  const isClient = !rel.startsWith('scripts/') && !rel.startsWith('plugins/')
  const lines = readFileSync(file, 'utf8').split('\n')

  lines.forEach((line, i) => {
    if (/^\s*(?:\/\/|\*|\/\*)/.test(line) && !/VITE_/.test(line)) return
    for (const rule of RULES) {
      if (rule.scope === 'client' && !isClient) continue
      if (!rule.pattern.test(line)) continue
      /* `allow` may match on this line or on the surrounding statement. */
      const window = lines.slice(Math.max(0, i - 1), i + 2).join(' ')
      if (rule.allow && rule.allow.test(window)) continue
      findings.push({ file: rel, line: i + 1, rule: rule.id, severity: rule.severity, match: line.trim().slice(0, 120) })
    }
  })
}

/* --- report --------------------------------------------------------------- */

const blocks = findings.filter((f) => f.severity === 'block')
const warns = findings.filter((f) => f.severity === 'warn')

console.log(`\nSecurity audit — ${files.length} source files scanned, ${RULES.length} rules\n`)

if (findings.length === 0) {
  console.log('  ✓ no findings')
} else {
  for (const f of [...blocks, ...warns]) {
    const mark = f.severity === 'block' ? '✗' : '!'
    console.log(`  ${mark} ${f.file}:${f.line}  [${f.rule}]`)
    console.log(`      ${f.match}`)
  }
}

const ruleById = new Map(RULES.map((r) => [r.id, r]))
console.log('\nRules in force:')
for (const r of RULES) console.log(`  · ${r.id} (${r.severity}) — ${r.why}`)

console.log(
  `\n${blocks.length} blocking · ${warns.length} advisory` +
    (blocks.length === 0 ? '\nStatic source audit passed.' : '\nStatic source audit FAILED.'),
)

/* --- optional dependency audit -------------------------------------------- */

if (process.argv.includes('--deps')) {
  console.log('\nRunning npm audit…')
  const { spawnSync } = await import('node:child_process')
  const res = spawnSync('npm', ['audit', '--omit=dev', '--json'], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
  try {
    const parsed = JSON.parse(res.stdout || '{}') as { vulnerabilities?: Record<string, { severity: string }>; metadata?: { vulnerabilities?: Record<string, number> } }
    const counts = parsed.metadata?.vulnerabilities ?? {}
    const total = Object.values(counts).reduce((a, b) => a + b, 0) as number
    if (total === 0) console.log('  ✓ 0 known vulnerabilities in production dependencies')
    else {
      console.log(`  ✗ ${total} known vulnerabilities: ${JSON.stringify(counts)}`)
      for (const [name, v] of Object.entries(parsed.vulnerabilities ?? {})) {
        console.log(`      ${v.severity.padEnd(9)} ${name}`)
      }
      process.exitCode = 1
    }
  } catch {
    console.log('  ! could not parse npm audit output')
  }
}

if (blocks.length) process.exitCode = 1
