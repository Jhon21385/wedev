# Creator OS

A premium dark command center for a solo creator running YouTube, Instagram and LinkedIn. Not a dashboard template — a working product: one connected system from idea capture through research, scripting, scheduling, publishing, performance analysis and the business behind it.

```bash
npm install
npm run dev        # http://localhost:5173 (binds 0.0.0.0)
npm run verify     # typecheck + dataset harness + render harness
npm run build      # tsc -b && vite build
```

## What it does

| Area | Screen | Highlights |
| --- | --- | --- |
| Command center | **Dashboard** | 7-metric pulse strip, creator-pulse panel with multi-metric trend and comparison band, in-flight work and deadline rails, horizontal pipeline, platform breakdown, 22-week calendar heat, sortable content table, creator health |
| Content | **Content database** | Table / Board / Calendar / Timeline / Gallery over one filtered scope; drag-and-drop board with undo; velocity and overdue signals |
| Content | **Content detail** | Brief, block-based script editor with live word count and runtime, research attachments, 12-step checklist, version history, procedural thumbnail variants, repurposing tree of real linked objects, per-piece performance |
| Content | **Compose** | Write the message once, adapt it per platform, publish through Composio. Per-platform field schemas with real limits and counters, native previews of YouTube / Instagram / LinkedIn, a pre-flight check that gates publishing, and a receipt naming the tool slug that actually ran |
| Content | **Calendar** | Month, week and platform swimlanes; drag to reschedule with conflict detection; cadence rail with gap analysis; unscheduled backlog |
| Workspace | **Idea vault** | Board, scoring table, cluster portfolio and topic map; five-dimension visual scoring; promotion into the content pipeline |
| Workspace | **Research hub** | Grid, list and research map; credibility grading, data points, citations back to the content that uses them, evidence-gap analysis |
| Analysis | **Analytics** | 13 sections at Power BI depth: overview composites, growth with comparison windows, reach, engagement mix, retention curves, platform capability matrix, topic treemap, format capability radar + ledger, content performance matrix with four quadrants, funnel, cadence heat, efficiency waterfall and creator health |
| Analysis | **Content DNA** | Creator → Platform → Topic → Content → Performance drill-through from any chart or matrix cell |
| Analysis | **Audience** | Growth by platform, attention windows, demographics, cohort return rates — deliberately not overpopulated |
| Business | **Revenue** | Sources, concentration risk, monthly waterfall, brand-deal entities with deliverables, invoices (including overdue chasing), expenses |
| Workspace | **Assets / Brand / Inbox / Workflow / Settings** | Asset library with visual previews and orphan detection; brand mini-OS (voice, palette, type, thumbnail rules, pillars, CTAs); signal inbox with rules; workflow with a working content-type builder; settings with real preferences and data-integrity checks |

Every chart is readable two ways: hover it and a **Show as table** affordance swaps the visual for the exact rows underneath, and a screen-reader summary is derived from those same rows — span, extremes and net direction — so it can never drift from what is drawn. Data grids are real `grid` widgets with roving tabindex, arrow-key navigation and proper row/column indices.

Cross-cutting: ⌘K command palette, `/` search, `C` create, `I` idea, `A` analytics, `Esc`, breadcrumbs, quick create, global filters that every screen honours, tooltips, autosave indicators, optimistic updates with undo, designed empty states, skeleton loaders, an error boundary with Retry + cached-data recovery, keyboard and ARIA support, reduced-motion and high-contrast modes.

## Architecture

```
src/
  data/          domain model, registry, taxonomy, deterministic seeded dataset
                 api.ts — the API boundary (reads, writes, errors, transport mode)
  analytics/     periods + the single query layer every screen reads
  store/         Zustand app state (filters, overlays, optimistic patches)
  integrations/  the publishing boundary: contract, toolkit registry, validators,
                 local transport, Composio adapter
  lib/           formatters, hooks, useApi (loading / cached / error / retry)
  app/           router shell, navigation, responsive chrome
  components/    design system: ui/, charts/, metrics/, shell/, compose/, integrations/
  pages/         one module per screen
plugins/         composio-proxy.ts — server-side key injection for the dev server
scripts/         verification harnesses (see below)
```

Nothing is hardcoded in a component. Metric definitions, labels, colours, formatters, content types, statuses and taxonomy live in `src/data/registry.ts` and `src/data/taxonomy.ts`; every chart calls the query layer in `src/analytics/queries.ts`, which reads one deterministic dataset (`src/data/seed/dataset.ts`, seeded `mulberry32`, 700 days of metric history and per-content daily series). Charts and tables therefore reconcile by construction — a drill-down always agrees with the aggregate it came from.

`src/data/api.ts` is the only place that knows how data arrives. Reads return provenance (live vs cached, latency, timestamp), writes are optimistic-first with an explicit confirmation, and failures are typed errors carrying a retryable flag and a human-readable hint — so every screen can show the same loading, degraded and retry states without inventing its own. `src/lib/useApi.ts` turns that into `{ data, cached, loading, error, retry }`. Swapping the local transport for HTTP means replacing one function.

### Publishing: one contract, two transports

`src/integrations/` is the seam between Creator OS and the platforms. Screens talk to a single `IntegrationProvider` interface — `listAccounts`, `connect`, `disconnect`, `refresh`, `publish`, `verifyTools` — and never to a transport, so the local deterministic transport and the live Composio adapter are interchangeable.

- **`registry.ts`** declares each platform once: fields, character limits, formats, OAuth scopes and the Composio tool slugs to try, in preference order. The composer form, the validator, the native previews and the pre-flight check all read that one definition, so a limit is enforced everywhere it appears.
- **`local.ts`** is a deterministic stand-in with real connection states, asynchronous OAuth settling, latency and the same error surface. It exists so the composer is fully exercisable before any key is configured.
- **`composio.ts`** talks to Composio v3 over a same-origin path. Instagram's two-step container → publish flow, YouTube's metadata and thumbnail tools, and LinkedIn's visibility model are all encoded here.
- **`validate.ts`** is shared by every transport, so a bad draft fails identically locally and against the provider.

**The API key never reaches the browser.** Composio authenticates with a *project* key that covers every connected account, so shipping it in a `VITE_` variable would publish it to every visitor. Instead the dev server runs a proxy at `/api/composio/*` that attaches the key in Node (`plugins/composio-proxy.ts`). Copy `.env.example` to `.env`, set `COMPOSIO_API_KEY`, and restart:

```bash
cp .env.example .env
# COMPOSIO_API_KEY=...            server-side only, never VITE_-prefixed
# VITE_COMPOSIO_AUTH_CONFIG_{YOUTUBE,INSTAGRAM,LINKEDIN}=...
npm run dev
curl localhost:5173/api/composio/_status    # {"configured":true,...}
```

The proxy fixes the upstream host, forwards only the methods Composio accepts, drops any client-supplied `x-api-key` or `authorization` header so a caller cannot smuggle a different credential upstream, and never logs the key. In production, serve the same path from your own backend or edge function; the client code needs no change, because it only ever sees a relative URL. `COMPOSIO_UPSTREAM` overrides the host for self-hosted gateways.

Tool slugs drift — Composio renames and versions tools. Settings → Connections → **Verify tools** asks the live registry which configured slugs still resolve, so a rename shows up as a warning there instead of a failure at publish time.

Switching scope never lies about what it is showing: when content filters are active, totals come from the daily series of the matching content objects; otherwise they come from the platform aggregate. The header states which mode you are in.

## Verification

There is no headless browser in this environment, so correctness is verified in two harnesses that run in plain Node:

```bash
npm run smoke          # data + query harness: totals, breakdowns, pipeline, health,
                       # chart granularity, funnel, revenue, scoped filters, integrity checks
npm run security       # static source audit: injection sinks, eval, hardcoded
                       # credentials, secrets in client env vars, client-side API-key
                       # headers, target=_blank without noopener, wildcard postMessage,
                       # third-party fetches that bypass the proxy, tokens in storage
npm run security:deps  # the same audit plus `npm audit` for the dependency tree
npm run smoke:render   # renders all 22 routes into JSDOM, flushes effects and timers,
                       # then asserts real page content appeared with no NaN/undefined
npm run smoke:flows    # drives real interactions: command palette, status changes with
                       # undo, board drag & drop, platform filtering, idea promotion,
                       # research filtering, motion preference, asset drawer, the chart
                       # accessible-summary / show-as-table toggles, and the composer —
                       # pre-flight gating, a real publish with a receipt, and the
                       # Composio transport degrading cleanly when no key is configured
npm run verify         # typecheck + security audit + all three harnesses
```

`npm run security` is part of `verify`, so a regression fails the build rather than shipping. It is a source scanner for the classes of mistake that matter here — most importantly, any secret placed in a `VITE_` variable or any `x-api-key` header set from browser code is a hard failure, because both would publish the Composio project key.

The render harness catches what a type-check cannot: undefined access in derived values, empty renders, hook misuse and numbers leaking into the UI as `NaN`. The interaction harness proves the flows respond, not just that they paint. Visual judgement is human — run `npm run dev` and look.

## Design rules

- Dark only, near-black cockpit palette, one electric-blue accent, violet/cyan/emerald/amber secondaries, red reserved for warnings.
- The JARVIS signature is a single ambient glow on active, selected and focused surfaces — never everywhere. The one animated border in the product (`aura`) is reserved for the surface that owns its screen.
- Motion 200–300 ms and only to communicate change, origin, activity or attention; fully disabled by reduced-motion.
- Repeated markup gets lifted into a shared block rather than re-typed: `DescriptionList`, `Inset`, `StickyActions`, `CheckRow` and `EntityRow` in `components/ui/blocks.tsx` each replaced the same literal in four or more places.
- Platform marks are drawn, single-colour, and tinted by the renderer — no multi-colour logo set, which would break the one-accent rule.
- No glassmorphism, neon, fake 3D, particle fields or decorative charts. No pie charts. Cards are meaningful containers, not decoration.
- Pointer-driven effects appear in exactly one place — the cursor-aware spotlight on asset previews — so they read as material, not as a gimmick.
- Dense but calm: borders, spacing and typography carry the hierarchy.
- Tokens, not literals: four durations, three easing curves, a fluid display scale and one hairline grid drive every surface — `src/index.css` is the single stylesheet.
- Materials separate by a 1px inner highlight, not by heavier borders; hover lifts, pressed states move 0.5px, and the only sweeping light in the product is on the primary action.
