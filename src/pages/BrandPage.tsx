import { useMemo, useState } from 'react'
import {
  Aperture,
  Check,
  Copy,
  Download,
  Eye,
  Layers,
  MessageSquareQuote,
  Palette,
  Sparkles,
  Target,
  Type as TypeIcon,
  X,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useApp } from '@/store/app'
import { useDataset, useSettled } from '@/lib/hooks'
import { fmtNumber } from '@/lib/format'
import { topicStats } from '@/analytics/queries'
import { Badge, EmptyState, KeyValue, Panel, PanelHeader, Progress, Skeleton } from '@/components/ui/Surface'
import { Button, IconButton } from '@/components/ui/Button'
import { Page, PageHeader, MetricStrip, SplitGrid } from '@/components/ui/Page'
import { Segmented } from '@/components/ui/Field'
import { Thumb, SwatchTile } from '@/components/ui/Thumb'
import { RankedBars, ShareBar } from '@/components/charts/Bars'
import { ChartPanel, chartData } from '@/components/charts/kit'

/* ============================================================================
   BRAND SYSTEM
   A mini operating system for identity: what the channel believes, sounds
   like, and looks like — enforced by the templates rather than by memory.
   ========================================================================== */

export function BrandPage() {
  const ds = useDataset()
  const settled = useSettled(200)
  const pushToast = useApp((s) => s.pushToast)
  const brand = ds.brand
  const [tab, setTab] = useState<'voice' | 'visual' | 'pillars' | 'ctas'>('voice')
  const [copied, setCopied] = useState<string | null>(null)

  const topics = useMemo(() => topicStats(ds, useApp.getState().filters), [ds])
  const totalPillarViews = topics.reduce((s, t) => s + t.views, 0) || 1

  const pillarMixData = useMemo(
    () =>
      chartData(
        [
          { key: 'name', label: 'Pillar' },
          { key: 'views', label: 'Views', align: 'right' },
          { key: 'pieces', label: 'Pieces', align: 'right' },
        ],
        brand.pillars.map((p) => ({
          name: p.name,
          views: topics.filter((t) => t.pillar === p.id).reduce((a, t) => a + t.views, 0),
          pieces: topics.filter((t) => t.pillar === p.id).reduce((a, t) => a + t.pieces, 0),
        })),
        { unit: 'pillar', caption: 'Share of views by content pillar' },
      ),
    [brand, topics],
  )

  const territoryData = useMemo(
    () =>
      chartData(
        [
          { key: 'name', label: 'Pillar' },
          { key: 'share', label: 'Share of views', align: 'right', format: (v: number) => `${(v * 100).toFixed(1)}%` },
          { key: 'pieces', label: 'Pieces', align: 'right' },
        ],
        brand.pillars.map((p) => ({
          name: p.name,
          share: Number((topics.filter((t) => t.pillar === p.id).reduce((a, t) => a + t.views, 0) / totalPillarViews).toFixed(4)),
          pieces: topics.filter((t) => t.pillar === p.id).reduce((a, t) => a + t.pieces, 0),
        })),
        { unit: 'pillar', caption: 'Territory performance — views per pillar' },
      ),
    [brand, topics, totalPillarViews],
  )

  const copy = (value: string) => {
    navigator.clipboard?.writeText(value).catch(() => undefined)
    setCopied(value)
    window.setTimeout(() => setCopied(null), 1400)
  }

  if (!settled) {
    return (
      <Page width="wide">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-5 h-[420px] rounded-xl" />
      </Page>
    )
  }

  return (
    <Page width="wide">
      <PageHeader
        eyebrow="Workspace"
        title={brand.name}
        description={brand.mission}
        meta={
          <span className="text-[11.5px] text-ink-low">
            {brand.tagline} · {brand.pillars.length} pillars · {brand.ctas.length} CTAs · {brand.palette.length} palette tokens
          </span>
        }
        actions={
          <>
            <Button variant="secondary" size="md" icon={<Download />} onClick={() => pushToast({ kind: 'info', title: 'Brand kit export queued', body: 'PDF + asset bundle will be ready in a moment.' })}>
              Export kit
            </Button>
            <Button variant="primary" size="md" icon={<Sparkles />} onClick={() => pushToast({ kind: 'info', title: 'Brand audit', body: 'Scanning the last 20 pieces for voice drift.' })}>
              Run audit
            </Button>
          </>
        }
      />

      <MetricStrip
        className="mb-3.5"
        items={[
          { label: 'Pillars', value: String(brand.pillars.length), hint: 'content territories with explicit weights' },
          { label: 'Voice traits', value: String(brand.voice.length), hint: 'each with a do and a don\'t' },
          { label: 'Thumbnail rules', value: String(brand.thumbnailStyle.length), hint: 'enforced in the template pack' },
          { label: 'Brand assets', value: String(brand.assets.length), hint: `${brand.assets.filter((a) => a.kind === 'logo').length} logos · ${brand.assets.filter((a) => a.kind === 'font').length} typefaces` },
        ]}
      />

      <Segmented
        className="mb-3.5"
        ariaLabel="Brand section"
        value={tab}
        onChange={setTab}
        options={[
          { id: 'voice', label: <span className="inline-flex items-center gap-1.5"><MessageSquareQuote className="h-3.5 w-3.5" /> Voice</span> },
          { id: 'visual', label: <span className="inline-flex items-center gap-1.5"><Palette className="h-3.5 w-3.5" /> Visual</span> },
          { id: 'pillars', label: <span className="inline-flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" /> Pillars</span> },
          { id: 'ctas', label: <span className="inline-flex items-center gap-1.5"><Target className="h-3.5 w-3.5" /> CTAs</span> },
        ]}
      />

      {tab === 'voice' && (
        <SplitGrid ratio="wide">
          <Panel>
            <PanelHeader icon={<MessageSquareQuote />} title="Voice" subtitle="Voice is a set of constraints, not an adjective list" />
            <ul className="divide-y divide-[var(--color-line-1)]">
              {brand.voice.map((v) => (
                <li key={v.trait} className="p-4">
                  <p className="flex items-center gap-2 text-[13px] font-medium text-ink-hi">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent)]" />
                    {v.trait}
                  </p>
                  <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                    <div className="rounded-lg border border-emerald/20 bg-emerald/[0.05] p-2.5">
                      <p className="flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.06em] text-emerald">
                        <Check className="h-3 w-3" /> Do
                      </p>
                      <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink">{v.do}</p>
                    </div>
                    <div className="rounded-lg border border-rose/20 bg-rose/[0.045] p-2.5">
                      <p className="flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.06em] text-rose">
                        <X className="h-3 w-3" /> Don&apos;t
                      </p>
                      <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-mid">{v.dont}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>

          <div className="space-y-3.5">
            <Panel>
              <PanelHeader dense icon={<Aperture />} title="Caption style" subtitle="Applied to every text post and description" />
              <ul className="divide-y divide-[var(--color-line-1)]">
                {brand.captionStyle.map((c) => (
                  <li key={c.rule} className="px-4 py-3">
                    <p className="text-[11.5px] font-medium text-ink-hi">{c.rule}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-ink-low">{c.detail}</p>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel>
              <PanelHeader dense icon={<Sparkles />} title="Reference board" subtitle="What good looks like, borrowed deliberately" />
              <div className="grid grid-cols-3 gap-2.5 p-3.5">
                {brand.references.map((r) => (
                  <figure key={r.id} className="min-w-0">
                    <Thumb seed={r.seed} aspect="4/5" accent="#5B9DFF" />
                    <figcaption className="mt-1.5">
                      <p className="truncate text-[10.5px] text-ink-hi">{r.label}</p>
                      <p className="line-clamp-2 text-[9.5px] leading-snug text-ink-faint">{r.note}</p>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </Panel>
          </div>
        </SplitGrid>
      )}

      {tab === 'visual' && (
        <div className="space-y-3.5">
          <Panel>
            <PanelHeader icon={<Palette />} title="Palette" subtitle="Click any swatch to copy its value" actions={<Badge tone="outline" size="xs">{brand.palette.length} tokens</Badge>} />
            <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {brand.palette.map((p) => (
                <button key={p.hex + p.name} onClick={() => copy(p.hex)} className="group text-left">
                  <div className="relative h-[76px] w-full overflow-hidden rounded-lg border border-line-2" style={{ background: `linear-gradient(150deg, ${p.hex}, ${p.hex}AA 62%, ${p.hex}55)` }}>
                    <span className="absolute inset-0 ring-1 ring-inset ring-white/10" />
                    <span className="absolute inset-0 grid place-items-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
                      {copied === p.hex ? <Check className="h-4 w-4 text-emerald" /> : <Copy className="h-4 w-4 text-white" />}
                    </span>
                  </div>
                  <p className="mt-2 truncate text-[11.5px] font-medium text-ink-hi">{p.name}</p>
                  <p className="mono truncate text-[10px] text-ink-faint">{p.hex.toUpperCase()}</p>
                  <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-ink-low">{p.role}</p>
                </button>
              ))}
            </div>
          </Panel>

          <SplitGrid ratio="even">
            <Panel>
              <PanelHeader dense icon={<TypeIcon />} title="Typography" subtitle="Inter for UI, JetBrains Mono for identifiers and numbers" />
              <div className="divide-y divide-[var(--color-line-1)]">
                {brand.type.map((t) => (
                  <div key={t.name} className="flex items-start gap-4 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11.5px] font-medium text-ink-hi">{t.name}</p>
                      <p className="mt-1 text-[10.5px] text-ink-low">{t.usage}</p>
                      <p className="mono mt-1 text-[9.5px] text-ink-faint">
                        {t.weight} · sample “{t.sample}”
                      </p>
                    </div>
                    <span className={cn('shrink-0 text-[26px] leading-none tracking-[-0.02em] text-ink-hi', t.name.toLowerCase().includes('mono') && 'font-mono text-[22px]')}>
                      {t.sample}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel>
              <PanelHeader dense icon={<Aperture />} title="Thumbnail system" subtitle="Rules the designer can break — once, deliberately" />
              <ul className="divide-y divide-[var(--color-line-1)]">
                {brand.thumbnailStyle.map((t) => (
                  <li key={t.rule} className="px-4 py-3">
                    <p className="text-[11.5px] font-medium text-ink-hi">{t.rule}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-ink-low">{t.detail}</p>
                  </li>
                ))}
              </ul>
              <div className="grid grid-cols-3 gap-2.5 border-t border-line-2 p-3.5">
                {[201, 202, 203].map((seed) => (
                  <div key={seed} className="overflow-hidden rounded-lg border border-line-2">
                    <Thumb seed={seed} aspect="16/9" accent="#FF5A5A" />
                  </div>
                ))}
              </div>
            </Panel>
          </SplitGrid>

          <Panel>
            <PanelHeader dense icon={<Layers />} title="Brand assets" subtitle="Logos, marks and type files referenced by the templates" />
            <div className="stagger grid gap-2.5 p-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {brand.assets.map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-lg border border-line-2 bg-white/[0.014] p-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line-2 bg-white/[0.03]">
                    {a.kind === 'color' ? (
                      <span className="h-5 w-5 rounded" style={{ background: a.value }} />
                    ) : a.kind === 'font' ? (
                      <TypeIcon className="h-4 w-4 text-ink-low" />
                    ) : (
                      <Aperture className="h-4 w-4 text-ink-low" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11.5px] text-ink-hi">{a.name}</span>
                    <span className="block truncate text-[10px] text-ink-low">{a.role}</span>
                    <span className="mono block truncate text-[9.5px] text-ink-faint">{a.value}</span>
                  </span>
                  <IconButton label="Copy value" icon={copied === a.value ? <Check /> : <Copy />} size="xs" onClick={() => copy(a.value)} />
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {tab === 'pillars' && (
        <SplitGrid ratio="wide">
          <Panel>
            <PanelHeader icon={<Layers />} title="Content pillars" subtitle="Weighted territories — the weights are targets, not descriptions" />
            <div className="space-y-4 p-4">
              {brand.pillars.map((p) => {
                const topic = topics.find((t) => t.pillar === p.id)
                const actual = ds.content.filter((c) => ds.topics.find((t) => t.id === c.topicId)?.pillar === p.id).length
                const total = ds.content.length || 1
                const actualShare = actual / total
                return (
                  <div key={p.id}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="flex items-center gap-2 text-[12.5px] font-medium text-ink-hi">
                        <span className="h-2 w-2 rounded-full" style={{ background: p.color, boxShadow: `0 0 8px ${p.color}88` }} />
                        {p.name}
                      </span>
                      <span className="mono text-[10.5px] text-ink-low">
                        target {Math.round(p.weight * 100)}% · actual {Math.round(actualShare * 100)}%
                        {Math.abs(actualShare - p.weight) > 0.06 && <span className="ml-2 text-amber">drift</span>}
                      </span>
                    </div>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-ink-low">{p.description}</p>
                    <div className="relative mt-2.5">
                      <Progress value={actualShare} max={1} color={p.color} />
                      <span className="absolute -top-1 h-3 w-px bg-ink-hi/70" style={{ left: `${p.weight * 100}%` }} title={`Target ${Math.round(p.weight * 100)}%`} />
                    </div>
                    {topic && (
                      <p className="mono mt-1.5 text-[9.5px] text-ink-faint">
                        {fmtNumber(topic.views, { compact: true })} views · {topic.pieces} pieces · ER {topic.engagementRate.toFixed(2)}%
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </Panel>

          <div className="space-y-3.5">
            <Panel>
              <PanelHeader dense icon={<Eye />} title="Pillar mix in scope" subtitle="Share of views, not share of pieces" />
              <div className="p-3.5">
                <ChartPanel bare data={pillarMixData}>
                  <ShareBar
                    showLabels
                    segments={brand.pillars.map((p) => ({
                      id: p.id,
                      label: p.name,
                      value: topics.filter((t) => t.pillar === p.id).reduce((s, t) => s + t.views, 0),
                      color: p.color,
                    }))}
                  />
                </ChartPanel>
                <p className="mt-3 text-[10.5px] leading-relaxed text-ink-faint">
                  Weights drive the content calendar: when a pillar drifts more than six points from target, the next two topics are drawn from it.
                </p>
              </div>
            </Panel>
            <Panel>
              <PanelHeader dense icon={<Layers />} title="Territory performance" subtitle="Views per pillar" />
              <div className="p-3.5">
                <ChartPanel bare data={territoryData}>
                  <RankedBars
                    height={230}
                    metricId="views"
                    rows={brand.pillars.map((p) => ({
                      id: p.id,
                      label: p.name,
                      value: topics.filter((t) => t.pillar === p.id).reduce((s, t) => s + t.views, 0) / totalPillarViews,
                      color: p.color,
                      sub: `${topics.filter((t) => t.pillar === p.id).reduce((s, t) => s + t.pieces, 0)} pieces`,
                    }))}
                    showValue={false}
                  />
                </ChartPanel>
              </div>
            </Panel>
          </div>
        </SplitGrid>
      )}

      {tab === 'ctas' && (
        <Panel>
          <PanelHeader
            icon={<Target />}
            title="Calls to action"
            subtitle="One ask per piece. Performance is measured as the follow-through rate on the piece it closed."
            actions={<Button size="xs" variant="secondary" icon={<Sparkles />} onClick={() => pushToast({ kind: 'info', title: 'CTA rotation updated', body: 'The next four pieces will rotate through the highest performers.' })}>Rotate winners</Button>}
          />
          <div className="grid gap-3.5 p-4 lg:grid-cols-2">
            {brand.ctas.map((cta) => (
              <article key={cta.id} className="rounded-xl border border-line-2 bg-white/[0.014] p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-ink-low">{cta.label}</p>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-hi">“{cta.text}”</p>
                  </div>
                  <IconButton label="Copy CTA" icon={copied === cta.text ? <Check /> : <Copy />} size="xs" onClick={() => copy(cta.text)} />
                </div>
                <p className="mt-2.5 text-[11px] leading-relaxed text-ink-low">{cta.use}</p>
                <div className="mt-3 flex items-center gap-2.5 border-t border-line-1 pt-3">
                  <Progress value={cta.performance} max={100} color={cta.performance > 70 ? '#34D399' : cta.performance > 45 ? '#5B9DFF' : '#FBBF24'} size="xs" />
                  <span className="mono shrink-0 text-[10.5px] text-ink-mid">{cta.performance}/100</span>
                </div>
              </article>
            ))}
            {!brand.ctas.length && <EmptyState compact icon={<Target />} title="No CTAs defined" body="Write two or three and rotate them." />}
          </div>
          <div className="grid gap-4 border-t border-line-2 p-4 sm:grid-cols-3">
            <KeyValue label="Best performer" value={[...brand.ctas].sort((a, b) => b.performance - a.performance)[0]?.label ?? '—'} hint="highest follow-through" />
            <KeyValue label="Rotation" value="Every 4 pieces" hint="prevents audience fatigue" />
            <KeyValue label="Rule" value="One ask per piece" hint="multi-ask CTAs convert 2.3× worse" />
          </div>
        </Panel>
      )}
    </Page>
  )
}
