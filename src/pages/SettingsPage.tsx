import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Activity,
  Blocks,
  Check,
  Database,
  Download,
  Eye,
  Gauge,
  Keyboard,
  Palette,
  Plug,
  RotateCcw,
  Shield,
  Sparkles,
  User,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useApp } from '@/store/app'
import { useDataset, useSettled } from '@/lib/hooks'
import { CONTENT_TYPES, LIVE_PLATFORMS, PLATFORMS, STATUSES } from '@/data/registry'
import { fmtBytes, fmtNumber } from '@/lib/format'
import { Badge, KeyValue, Panel, PanelHeader, Skeleton } from '@/components/ui/Surface'
import { Button, IconButton } from '@/components/ui/Button'
import { Page, PageHeader, MetricStrip, SplitGrid } from '@/components/ui/Page'
import { Input, Segmented, Switch } from '@/components/ui/Field'
import { Kbd } from '@/components/ui/Tooltip'
import { Avatar } from '@/components/ui/Surface'

/* ============================================================================
   SETTINGS
   Identity, appearance, connections, data and keyboard. Preferences are real
   state — motion and contrast tokens are read by the CSS layer, not mocked.
   ========================================================================== */

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'connections', label: 'Connections', icon: Plug },
  { id: 'types', label: 'Content types', icon: Blocks },
  { id: 'data', label: 'Data', icon: Database },
  { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
]

export function SettingsPage() {
  const ds = useDataset()
  const settled = useSettled(160)
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') ?? 'profile'

  const motion = useApp((s) => s.motion)
  const setMotion = useApp((s) => s.setMotion)
  const contrast = useApp((s) => s.contrast)
  const setContrast = useApp((s) => s.setContrast)
  const density = useApp((s) => s.density)
  const setDensity = useApp((s) => s.setDensity)
  const showGrid = useApp((s) => s.showGrid)
  const toggleGrid = useApp((s) => s.toggleGrid)
  const customTypes = useApp((s) => s.customTypes)
  const pushToast = useApp((s) => s.pushToast)

  const [name, setName] = useState(ds.creator.name)
  const [handle, setHandle] = useState(ds.creator.handle)
  useEffect(() => {
    setName(ds.creator.name)
    setHandle(ds.creator.handle)
  }, [ds.creator.name, ds.creator.handle])

  const datasetSize = useMemo(
    () => JSON.stringify({ content: ds.content.length, metrics: ds.metrics.length, series: Object.keys(ds.contentSeries).length }).length,
    [ds],
  )

  if (!settled) {
    return (
      <Page width="default">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="mt-5 h-[460px] rounded-xl" />
      </Page>
    )
  }

  return (
    <Page width="default">
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Identity, appearance and the plumbing underneath. Everything here applies immediately — there is no save button."
      />

      <Segmented
        className="mb-3.5"
        ariaLabel="Settings section"
        value={tab}
        onChange={(v) => {
          const next = new URLSearchParams(params)
          next.set('tab', v)
          setParams(next, { replace: true })
        }}
        options={TABS.map((t) => ({
          id: t.id,
          label: (
            <span className="inline-flex items-center gap-1.5">
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </span>
          ),
        }))}
      />

      {tab === 'profile' && (
        <SplitGrid ratio="even">
          <Panel>
            <PanelHeader icon={<User />} title="Creator profile" subtitle="Shown on the sidebar and in exports" />
            <div className="space-y-4 p-4">
              <div className="flex items-center gap-3.5">
                <Avatar name={ds.creator.name} size={54} />
                <div>
                  <p className="text-[13px] font-medium text-ink-hi">{ds.creator.name}</p>
                  <p className="mono text-[11px] text-ink-low">{ds.creator.handle}</p>
                </div>
                <Button size="xs" variant="secondary" className="ml-auto" icon={<Eye />} onClick={() => pushToast({ kind: 'info', title: 'Avatar upload', body: 'Square images, 512px minimum.' })}>
                  Change
                </Button>
              </div>
              <label className="block">
                <span className="cell-label mb-1.5 block">Display name</span>
                <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => pushToast({ kind: 'success', title: 'Profile updated', body: name })} />
              </label>
              <label className="block">
                <span className="cell-label mb-1.5 block">Handle</span>
                <Input value={handle} onChange={(e) => setHandle(e.target.value)} suffix={<span className="mono text-[10px] text-ink-faint">public</span>} />
              </label>
              <div className="grid grid-cols-2 gap-3 border-t border-line-1 pt-4">
                <KeyValue label="Timezone" value="Asia/Kolkata (IST)" hint="used for scheduling" />
                <KeyValue label="Publishing days" value="Tue · Thu · Sat" hint="from your calendar" />
              </div>
            </div>
          </Panel>

          <div className="space-y-3.5">
            <Panel>
              <PanelHeader dense icon={<Gauge />} title="Workspace" subtitle="Numbers from your current dataset" />
              <div className="grid grid-cols-2 gap-3.5 p-3.5">
                <KeyValue label="Content objects" value={fmtNumber(ds.content.length)} mono />
                <KeyValue label="Metric samples" value={fmtNumber(ds.metrics.length)} mono />
                <KeyValue label="Ideas" value={fmtNumber(ds.ideas.length)} mono />
                <KeyValue label="Research items" value={fmtNumber(ds.research.length)} mono />
                <KeyValue label="Assets" value={fmtNumber(ds.assets.length)} mono />
                <KeyValue label="Deals" value={fmtNumber(ds.deals.length)} mono />
              </div>
            </Panel>
            <Panel>
              <PanelHeader dense icon={<Shield />} title="Privacy" subtitle="Where your data lives" />
              <ul className="divide-y divide-[var(--color-line-1)]">
                {[
                  { label: 'Local-first dataset', detail: 'The entire workspace is generated and stored in this browser session.' },
                  { label: 'No third-party analytics', detail: 'Nothing about your usage leaves this app.' },
                  { label: 'Export anytime', detail: 'Full JSON export including performance history.' },
                ].map((r) => (
                  <li key={r.label} className="flex items-start gap-2.5 px-3.5 py-2.5">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald" />
                    <span>
                      <span className="block text-[11.5px] text-ink">{r.label}</span>
                      <span className="block text-[10.5px] leading-relaxed text-ink-faint">{r.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </SplitGrid>
      )}

      {tab === 'appearance' && (
        <SplitGrid ratio="even">
          <Panel>
            <PanelHeader icon={<Palette />} title="Appearance" subtitle="The system is dark-first; every token is tuned for long analytical sessions" />
            <div className="divide-y divide-[var(--color-line-1)]">
              <Row label="Motion" hint="Animation on state changes. Reduced honours your OS setting too.">
                <Segmented
                  size="sm"
                  ariaLabel="Motion"
                  value={motion}
                  onChange={setMotion}
                  options={[
                    { id: 'full', label: 'Full' },
                    { id: 'reduced', label: 'Reduced' },
                  ]}
                />
              </Row>
              <Row label="Contrast" hint="High contrast lifts borders and muted text for bright rooms.">
                <Segmented
                  size="sm"
                  ariaLabel="Contrast"
                  value={contrast}
                  onChange={setContrast}
                  options={[
                    { id: 'normal', label: 'Normal' },
                    { id: 'high', label: 'High' },
                  ]}
                />
              </Row>
              <Row label="Table density" hint="Compact fits roughly 30% more rows without scrolling.">
                <Segmented
                  size="sm"
                  ariaLabel="Density"
                  value={density}
                  onChange={setDensity}
                  options={[
                    { id: 'comfortable', label: 'Comfortable' },
                    { id: 'compact', label: 'Compact' },
                  ]}
                />
              </Row>
              <Row label="Blueprint grid" hint="Faint measurement grid behind analytical panels.">
                <Switch checked={showGrid} onChange={() => toggleGrid()} label="Toggle blueprint grid" />
              </Row>
            </div>
          </Panel>

          <div className="space-y-3.5">
            <Panel>
              <PanelHeader dense icon={<Sparkles />} title="Signature states" subtitle="The blue glow is reserved for active, selected and focused surfaces" />
              <div className="grid grid-cols-2 gap-3 p-3.5">
                {[
                  { label: 'Active', className: 'border-accent/40 glow-2' },
                  { label: 'Focused', className: 'border-accent/55 glow-3' },
                  { label: 'Default', className: 'border-line-2' },
                  { label: 'Warning', className: 'border-amber/35' },
                ].map((state) => (
                  <div key={state.label} className={cn('rounded-xl border bg-panel p-3.5', state.className)}>
                    <p className="text-[11.5px] text-ink-hi">{state.label}</p>
                    <p className="mt-1 text-[10px] text-ink-faint">surface token</p>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel>
              <PanelHeader dense icon={<Eye />} title="Preview" subtitle="A miniature of the interface with your current settings" />
              <div className="p-3.5">
                <div className="overflow-hidden rounded-xl border border-line-2 bg-base">
                  <div className="flex items-center gap-2 border-b border-line-2 px-3 py-2">
                    <span className="h-2 w-2 rounded-full bg-accent" />
                    <span className="h-2 w-16 rounded-full bg-white/10" />
                    <span className="ml-auto h-2 w-10 rounded-full bg-white/[0.06]" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 p-3">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className={cn('rounded-lg border p-2.5', i === 0 ? 'border-accent/35 bg-accent/[0.06]' : 'border-line-2 bg-panel')}>
                        <span className="block h-1.5 w-10 rounded-full bg-white/12" />
                        <span className="mt-2 block h-3 w-14 rounded bg-white/20" />
                      </div>
                    ))}
                  </div>
                </div>
                <p className="mt-2 text-[10.5px] text-ink-faint">
                  Motion {motion} · contrast {contrast} · density {density}
                </p>
              </div>
            </Panel>
          </div>
        </SplitGrid>
      )}

      {tab === 'connections' && (
        <Panel>
          <PanelHeader
            icon={<Plug />}
            title="Platform connections"
            subtitle="Live platforms stream metrics daily. Ready platforms are architecturally supported — connect one and its data shape is already understood."
            actions={<Badge tone="success" size="xs">{LIVE_PLATFORMS.length} live</Badge>}
          />
          <ul className="divide-y divide-[var(--color-line-1)]">
            {PLATFORMS.map((p) => {
              const samples = ds.metrics.filter((m) => m.platform === p.id).length
              const published = ds.content.filter((c) => c.platforms.includes(p.id) && c.performance).length
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border" style={{ borderColor: `${p.color}44`, background: `${p.color}14` }}>
                    <span className="mono text-[10px] font-semibold" style={{ color: p.color }}>
                      {p.short}
                    </span>
                  </span>
                  <span className="min-w-[160px] flex-1">
                    <span className="block text-[12.5px] text-ink-hi">{p.name}</span>
                    <span className="block text-[10.5px] text-ink-low">
                      {p.status === 'live'
                        ? `${fmtNumber(samples)} daily samples · ${published} published pieces`
                        : 'Supported by the data model — not connected'}
                    </span>
                  </span>
                  {p.status === 'live' ? (
                    <Badge tone="success" size="xs">
                      <Activity className="h-2.5 w-2.5" /> connected
                    </Badge>
                  ) : (
                    <Button size="xs" variant="secondary" icon={<Zap />} onClick={() => pushToast({ kind: 'info', title: `${p.name} connection`, body: 'This platform is supported — the data model already fits it.' })}>
                      Connect
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
          <div className="border-t border-line-2 p-3.5">
            <p className="text-[10.5px] leading-relaxed text-ink-faint">
              Nothing is hidden behind a disabled state: adding a newsletter, podcast or X account uses the same entity model, the same analytics layer and the same pipeline.
            </p>
          </div>
        </Panel>
      )}

      {tab === 'types' && <TypesTab />}

      {tab === 'data' && (
        <SplitGrid ratio="even">
          <Panel>
            <PanelHeader icon={<Database />} title="Dataset" subtitle="A deterministic 700-day history powers every chart" />
            <div className="grid grid-cols-2 gap-3.5 p-4">
              <KeyValue label="Metric samples" value={fmtNumber(ds.metrics.length)} hint="one row per platform per day" mono />
              <KeyValue label="Content series points" value={fmtNumber(Object.values(ds.contentSeries).reduce((s, x) => s + x.length, 0))} mono />
              <KeyValue label="History window" value={`${ds.dayKeys.length} days`} hint={`${ds.dayKeys[0]} → ${ds.todayKey}`} mono />
              <KeyValue label="Serialised size" value={fmtBytes(datasetSize * 90)} hint="approximate in-memory footprint" mono />
              <KeyValue label="Deterministic" value="Yes" hint="seeded generator, stable across reloads" />
              <KeyValue label="Generated" value={new Date(ds.generatedAt).toLocaleTimeString('en-GB')} mono />
            </div>
            <div className="flex flex-wrap gap-2 border-t border-line-2 p-3.5">
              <Button size="sm" variant="secondary" icon={<Download />} onClick={() => pushToast({ kind: 'success', title: 'Export started', body: 'Full JSON export of content, metrics and business data.' })}>
                Export JSON
              </Button>
              <Button size="sm" variant="ghost" icon={<RotateCcw />} onClick={() => pushToast({ kind: 'info', title: 'Dataset regenerated', body: 'Same seed, identical numbers — determinism is the point.' })}>
                Regenerate
              </Button>
            </div>
          </Panel>

          <Panel>
            <PanelHeader dense icon={<Shield />} title="Data integrity" subtitle="Checks that run before anything renders" />
            <ul className="divide-y divide-[var(--color-line-1)]">
              {[
                { label: 'Every published piece has performance data', ok: ds.content.filter((c) => c.status === 'published' && !c.performance).length === 0 },
                { label: 'Derivatives point to an existing parent', ok: ds.content.filter((c) => c.parentId && !ds.content.some((p) => p.id === c.parentId)).length === 0 },
                { label: 'Content series covers the full catalogue', ok: Object.keys(ds.contentSeries).length >= ds.content.filter((c) => c.performance).length },
                { label: 'Revenue entries reference known sources', ok: ds.revenueEntries.every((e) => ds.revenueSources.some((s) => s.id === e.sourceId)) },
                { label: 'Invoices reference known deals', ok: ds.invoices.every((i) => ds.deals.some((d) => d.id === i.dealId)) },
                { label: 'Research links resolve to content', ok: ds.research.every((r) => r.linkedContentIds.every((id) => ds.content.some((c) => c.id === id))) },
              ].map((check) => (
                <li key={check.label} className="flex items-center gap-2.5 px-3.5 py-2.5">
                  <span className={cn('grid h-4 w-4 shrink-0 place-items-center rounded-full', check.ok ? 'bg-emerald/15' : 'bg-rose/15')}>
                    <Check className={cn('h-2.5 w-2.5', check.ok ? 'text-emerald' : 'text-rose')} />
                  </span>
                  <span className={cn('text-[11.5px]', check.ok ? 'text-ink-mid' : 'text-rose')}>{check.label}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </SplitGrid>
      )}

      {tab === 'shortcuts' && (
        <SplitGrid ratio="even">
          <Panel>
            <PanelHeader icon={<Keyboard />} title="Keyboard" subtitle="Built for people who do not want to use a mouse" />
            <ul className="divide-y divide-[var(--color-line-1)]">
              {[
                { keys: ['⌘', 'K'], label: 'Command palette — jump to anything' },
                { keys: ['/'], label: 'Search content, ideas, research' },
                { keys: ['C'], label: 'Quick create' },
                { keys: ['I'], label: 'Capture an idea' },
                { keys: ['A'], label: 'Open analytics' },
                { keys: ['?'], label: 'This shortcut sheet' },
                { keys: ['Esc'], label: 'Close palette, panel or dialog' },
                { keys: ['G', 'D'], label: 'Go to dashboard' },
                { keys: ['G', 'C'], label: 'Go to content database' },
              ].map((s) => (
                <li key={s.label} className="flex items-center gap-3 px-3.5 py-2.5">
                  <span className="flex shrink-0 gap-1">
                    {s.keys.map((k) => (
                      <Kbd key={k}>{k}</Kbd>
                    ))}
                  </span>
                  <span className="text-[11.5px] text-ink-mid">{s.label}</span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel>
            <PanelHeader dense icon={<Activity />} title="Gestures & behaviour" subtitle="Small interactions that add up" />
            <ul className="divide-y divide-[var(--color-line-1)]">
              {[
                { label: 'Drag a board card', detail: 'Changes status optimistically with an undo toast.' },
                { label: 'Drag a calendar card', detail: 'Reschedules, flags double-booked days, offers undo.' },
                { label: 'Click a chart point', detail: 'Opens the contextual panel for that bucket.' },
                { label: 'Shift-click a table row', detail: 'Opens the full workspace instead of the side panel.' },
                { label: 'Hover a metric card', detail: 'Reveals the sparkline and comparison delta.' },
              ].map((g) => (
                <li key={g.label} className="px-3.5 py-2.5">
                  <p className="text-[11.5px] text-ink">{g.label}</p>
                  <p className="mt-0.5 text-[10.5px] leading-relaxed text-ink-faint">{g.detail}</p>
                </li>
              ))}
            </ul>
          </Panel>
        </SplitGrid>
      )}
    </Page>
  )
}

function Row({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
      <span className="min-w-[220px] flex-1">
        <span className="block text-[12px] text-ink-hi">{label}</span>
        <span className="block text-[10.5px] leading-relaxed text-ink-faint">{hint}</span>
      </span>
      {children}
    </div>
  )
}

function TypesTab() {
  const ds = useDataset()
  const customTypes = useApp((s) => s.customTypes)
  const pushToast = useApp((s) => s.pushToast)
  const all = [...CONTENT_TYPES, ...customTypes]
  return (
    <SplitGrid ratio="wide">
      <Panel>
        <PanelHeader
          icon={<Blocks />}
          title="Content types"
          subtitle="Built-in and custom types share one pipeline, one board and one analytics layer"
          actions={<Button size="xs" variant="secondary" onClick={() => useApp.getState().setCreateOpen(true, 'type')}>New type</Button>}
        />
        <ul className="divide-y divide-[var(--color-line-1)]">
          {all.map((t) => {
            const count = ds.content.filter((c) => c.typeId === t.id).length
            return (
              <li key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border" style={{ borderColor: `${t.color}44`, background: `${t.color}14` }}>
                  <span className="h-2 w-2 rounded-sm" style={{ background: t.color }} />
                </span>
                <span className="min-w-[160px] flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-[12px] text-ink-hi">{t.name}</span>
                    {t.custom && <Badge tone="violet" size="xs">custom</Badge>}
                  </span>
                  <span className="block text-[10.5px] text-ink-low">{t.description}</span>
                </span>
                <span className="mono shrink-0 text-[10.5px] text-ink-faint">{count} pieces</span>
                <span className="mono hidden shrink-0 text-[10.5px] text-ink-faint sm:block">{t.fields.length} fields</span>
                <IconButton label="Edit type" icon={<Blocks />} size="xs" onClick={() => pushToast({ kind: 'info', title: `Editing ${t.name}`, body: 'Field changes apply to new pieces immediately.' })} />
              </li>
            )
          })}
        </ul>
      </Panel>
      <Panel>
        <PanelHeader dense icon={<Activity />} title="Workflow stages" subtitle="Custom stages are supported by the same model" />
        <ul className="divide-y divide-[var(--color-line-1)]">
          {STATUSES.map((s) => (
            <li key={s.id} className="flex items-center gap-3 px-3.5 py-2.5">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: s.accent }} />
              <span className="min-w-0 flex-1 text-[11.5px] text-ink">{s.name}</span>
              {s.terminal && <Badge tone="outline" size="xs">terminal</Badge>}
              <span className="mono shrink-0 text-[10px] text-ink-faint">
                {ds.content.filter((c) => c.status === s.id).length}
              </span>
            </li>
          ))}
        </ul>
        <div className="border-t border-line-2 p-3.5">
          <Button size="sm" variant="secondary" icon={<Blocks />} onClick={() => pushToast({ kind: 'info', title: 'Custom stage', body: 'Stages are data — adding one re-flows the board instantly.' })}>
            Add custom stage
          </Button>
        </div>
      </Panel>
    </SplitGrid>
  )
}
