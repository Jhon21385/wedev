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
| Content | **Calendar** | Month, week and platform swimlanes; drag to reschedule with conflict detection; cadence rail with gap analysis; unscheduled backlog |
| Workspace | **Idea vault** | Board, scoring table, cluster portfolio and topic map; five-dimension visual scoring; promotion into the content pipeline |
| Workspace | **Research hub** | Grid, list and research map; credibility grading, data points, citations back to the content that uses them, evidence-gap analysis |
| Analysis | **Analytics** | 13 sections at Power BI depth: overview composites, growth with comparison windows, reach, engagement mix, retention curves, platform capability matrix, topic treemap, format table, content performance matrix with four quadrants, funnel, cadence heat, efficiency waterfall and creator health |
| Analysis | **Content DNA** | Creator → Platform → Topic → Content → Performance drill-through from any chart or matrix cell |
| Analysis | **Audience** | Growth by platform, attention windows, demographics, cohort return rates — deliberately not overpopulated |
| Business | **Revenue** | Sources, concentration risk, monthly waterfall, brand-deal entities with deliverables, invoices (including overdue chasing), expenses |
| Workspace | **Assets / Brand / Inbox / Workflow / Settings** | Asset library with visual previews and orphan detection; brand mini-OS (voice, palette, type, thumbnail rules, pillars, CTAs); signal inbox with rules; workflow with a working content-type builder; settings with real preferences and data-integrity checks |

Cross-cutting: ⌘K command palette, `/` search, `C` create, `I` idea, `A` analytics, `Esc`, breadcrumbs, quick create, global filters that every screen honours, tooltips, autosave indicators, optimistic updates with undo, designed empty states, skeleton loaders, an error boundary with Retry + cached-data recovery, keyboard and ARIA support, reduced-motion and high-contrast modes.

## Architecture

```
src/
  data/          domain model, registry, taxonomy, deterministic seeded dataset
  analytics/     periods + the single query layer every screen reads
  store/         Zustand app state (filters, overlays, optimistic patches)
  app/           router shell, navigation, responsive chrome
  components/    design system: ui/, charts/, metrics/, shell/
  pages/         one module per screen
scripts/         verification harnesses (see below)
```

Nothing is hardcoded in a component. Metric definitions, labels, colours, formatters, content types, statuses and taxonomy live in `src/data/registry.ts` and `src/data/taxonomy.ts`; every chart calls the query layer in `src/analytics/queries.ts`, which reads one deterministic dataset (`src/data/seed/dataset.ts`, seeded `mulberry32`, 700 days of metric history and per-content daily series). Charts and tables therefore reconcile by construction — a drill-down always agrees with the aggregate it came from.

Switching scope never lies about what it is showing: when content filters are active, totals come from the daily series of the matching content objects; otherwise they come from the platform aggregate. The header states which mode you are in.

## Verification

There is no headless browser in this environment, so correctness is verified in two harnesses that run in plain Node:

```bash
npm run smoke          # data + query harness: totals, breakdowns, pipeline, health,
                       # chart granularity, funnel, revenue, scoped filters, integrity checks
npm run smoke:render   # renders all 19 routes into JSDOM, flushes effects and timers,
                       # then asserts real page content appeared with no NaN/undefined
```

The render harness catches what a type-check cannot: undefined access in derived values, empty renders, hook misuse and numbers leaking into the UI as `NaN`. Visual judgement is human — run `npm run dev` and look.

## Design rules

- Dark only, near-black cockpit palette, one electric-blue accent, violet/cyan/emerald/amber secondaries, red reserved for warnings.
- The JARVIS signature is a single ambient glow on active, selected and focused surfaces — never everywhere.
- Motion 200–300 ms and only to communicate change, origin, activity or attention; fully disabled by reduced-motion.
- No glassmorphism, neon, fake 3D, particle fields or decorative charts. No pie charts. Cards are meaningful containers, not decoration.
- Dense but calm: borders, spacing and typography carry the hierarchy.
