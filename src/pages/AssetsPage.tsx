import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  Clock,
  FileText,
  Film,
  Folder,
  FolderOpen,
  HardDrive,
  Image as ImageIcon,
  LayoutGrid,
  List,
  Music,
  Paperclip,
  Star,
  Upload,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useApp } from '@/store/app'
import { useDataset, useSettled } from '@/lib/hooks'
import { fmtBytes, fmtDate, fmtNumber } from '@/lib/format'
import type { Asset } from '@/data/types'
import { Badge, EmptyState, KeyValue, Panel, PanelHeader, Skeleton } from '@/components/ui/Surface'
import { Button, IconButton } from '@/components/ui/Button'
import { Page, PageHeader, MetricStrip, SplitGrid } from '@/components/ui/Page'
import { Segmented, SearchInput, Combobox } from '@/components/ui/Field'
import { Drawer } from '@/components/ui/Overlay'
import { Thumb } from '@/components/ui/Thumb'
import { ShareBar, Distribution } from '@/components/charts/Bars'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Tooltip } from '@/components/ui/Tooltip'

/* ============================================================================
   ASSET LIBRARY
   Grid and list over the same corpus. Assets are linked to the content that
   uses them, so deleting a file is a decision with visible consequences.
   ========================================================================== */

const KIND_META: Record<Asset['kind'], { label: string; color: string; icon: typeof Film }> = {
  video: { label: 'Video', color: '#5B9DFF', icon: Film },
  image: { label: 'Image', color: '#38D6F5', icon: ImageIcon },
  thumbnail: { label: 'Thumbnail', color: '#A78BFA', icon: ImageIcon },
  logo: { label: 'Logo', color: '#34D399', icon: Paperclip },
  audio: { label: 'Audio', color: '#FBBF24', icon: Music },
  music: { label: 'Music', color: '#FB7185', icon: Music },
  document: { label: 'Document', color: '#8CBCFF', icon: FileText },
  screenshot: { label: 'Screenshot', color: '#2DD4BF', icon: ImageIcon },
}

export function AssetsPage() {
  const ds = useDataset()
  const settled = useSettled(200)
  const pushToast = useApp((s) => s.pushToast)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [folder, setFolder] = useState<string[]>([])
  const [kinds, setKinds] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [starred, setStarred] = useState<Record<string, boolean>>({})

  const folders = useMemo(() => {
    const map = new Map<string, { count: number; bytes: number }>()
    ds.assets.forEach((a) => {
      const top = a.folder.split('/')[0]
      const cur = map.get(top) ?? { count: 0, bytes: 0 }
      cur.count++
      cur.bytes += a.size
      map.set(top, cur)
    })
    return [...map.entries()].sort((a, b) => b[1].count - a[1].count)
  }, [ds.assets])

  const items = useMemo(() => {
    const q = query.trim().toLowerCase()
    return ds.assets.filter((a) => {
      if (folder.length && !folder.some((f) => a.folder === f || a.folder.startsWith(`${f}/`))) return false
      if (kinds.length && !kinds.includes(a.kind)) return false
      if (q && !(a.name.toLowerCase().includes(q) || a.tags.some((t) => t.includes(q)))) return false
      return true
    })
  }, [ds.assets, folder, kinds, query])

  const open = ds.assets.find((a) => a.id === openId) ?? null

  const stats = useMemo(() => {
    const bytes = ds.assets.reduce((s, a) => s + a.size, 0)
    const byKind = new Map<Asset['kind'], { count: number; bytes: number }>()
    ds.assets.forEach((a) => {
      const cur = byKind.get(a.kind) ?? { count: 0, bytes: 0 }
      cur.count++
      cur.bytes += a.size
      byKind.set(a.kind, cur)
    })
    const linked = ds.assets.filter((a) => a.usedIn.length)
    return { bytes, byKind: [...byKind.entries()].sort((a, b) => b[1].bytes - a[1].bytes), linked: linked.length, orphans: ds.assets.length - linked.length }
  }, [ds.assets])

  const columns: Column<Asset>[] = [
    { id: 'name', header: 'Name', primary: true, width: 300, sortValue: (a) => a.name, filterValue: (a) => a.name, cell: (a) => (
      <span className="flex min-w-0 items-center gap-2.5">
        <span className="relative h-7 w-11 shrink-0 overflow-hidden rounded-[5px]">
          <Thumb seed={a.seed} accent={KIND_META[a.kind].color} compact className="h-full w-full" aspect="auto" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[12px] text-ink-hi">{a.name}</span>
          <span className="mono block truncate text-[9.5px] text-ink-faint">{a.folder}</span>
        </span>
      </span>
    ) },
    { id: 'kind', header: 'Kind', width: 112, sortValue: (a) => a.kind, filterValue: (a) => KIND_META[a.kind].label, cell: (a) => (
      <span className="inline-flex items-center gap-1.5 text-[11.5px]" style={{ color: KIND_META[a.kind].color }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: KIND_META[a.kind].color }} />
        {KIND_META[a.kind].label}
      </span>
    ) },
    { id: 'dims', header: 'Dimensions', width: 118, sortValue: (a) => a.dims ?? '', cell: (a) => <span className="mono text-[10.5px] text-ink-low">{a.dims ?? '—'}</span> },
    { id: 'duration', header: 'Duration', width: 92, sortValue: (a) => a.duration ?? '', cell: (a) => <span className="mono text-[10.5px] text-ink-low">{a.duration ?? '—'}</span> },
    { id: 'size', header: 'Size', width: 92, align: 'right', numeric: true, sortValue: (a) => a.size, cell: (a) => <span>{fmtBytes(a.size)}</span> },
    { id: 'used', header: 'Used in', width: 96, align: 'right', numeric: true, sortValue: (a) => a.usedIn.length, cell: (a) => (
      <span className={a.usedIn.length ? 'text-ink-hi' : 'text-ink-ghost'}>{a.usedIn.length || '—'}</span>
    ) },
    { id: 'created', header: 'Added', width: 96, sortValue: (a) => a.createdAt, cell: (a) => <span className="mono text-[10.5px] text-ink-low">{fmtDate(a.createdAt, 'short')}</span> },
    { id: 'actions', header: '', width: 44, cell: (a) => <IconButton label="Open" icon={<ArrowUpRight />} size="xs" onClick={(e) => { e.stopPropagation(); setOpenId(a.id) }} /> },
  ]

  if (!settled) {
    return (
      <Page width="full">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="mt-5 h-[520px] rounded-xl" />
      </Page>
    )
  }

  return (
    <Page width="full">
      <PageHeader
        eyebrow="Workspace"
        title="Asset library"
        description="Every file the operation depends on, linked to the content that uses it. Storage, usage and orphans are visible at a glance."
        actions={
          <>
            <Button variant="secondary" size="md" icon={<FolderOpen />} onClick={() => setFolder([])}>
              All folders
            </Button>
            <Button variant="primary" size="md" icon={<Upload />} onClick={() => pushToast({ kind: 'info', title: 'Upload', body: 'Drop files anywhere on this page — metadata is extracted automatically.' })}>
              Upload
            </Button>
          </>
        }
      />

      <MetricStrip
        className="mb-3.5"
        items={[
          { label: 'Files', value: String(ds.assets.length), hint: `${folders.length} folders` },
          { label: 'Library size', value: fmtBytes(stats.bytes), hint: 'across all asset types', accent: '#38D6F5' },
          { label: 'In use', value: String(stats.linked), hint: `${((stats.linked / ds.assets.length) * 100).toFixed(0)}% linked to content` },
          { label: 'Orphans', value: String(stats.orphans), hint: 'never referenced by a piece', accent: stats.orphans > 0 ? '#FBBF24' : undefined },
        ]}
      />

      <div className="mb-3.5 flex flex-wrap items-center gap-2">
        <Segmented
          ariaLabel="Library view"
          value={view}
          onChange={setView}
          options={[
            { id: 'grid', label: <span className="inline-flex items-center gap-1.5"><LayoutGrid className="h-3.5 w-3.5" /> Grid</span> },
            { id: 'list', label: <span className="inline-flex items-center gap-1.5"><List className="h-3.5 w-3.5" /> List</span> },
          ]}
        />
        <div className="flex flex-wrap items-center gap-1">
          {stats.byKind.map(([kind, meta]) => {
            const active = kinds.includes(kind)
            return (
              <button
                key={kind}
                onClick={() => setKinds(active ? kinds.filter((k) => k !== kind) : [...kinds, kind])}
                className={cn(
                  'inline-flex h-7.5 items-center gap-1.5 rounded-md border px-2.5 text-[11px] transition-colors',
                  active ? 'border-line-4 bg-white/[0.07] text-ink-hi' : 'border-line-2 text-ink-mid hover:border-line-3 hover:text-ink',
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: KIND_META[kind].color }} />
                {KIND_META[kind].label}
                <span className="mono text-[9.5px] text-ink-faint">{meta.count}</span>
              </button>
            )
          })}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Combobox
            multiple
            className="w-[200px]"
            placeholder="All folders"
            value={folder}
            onChange={setFolder}
            options={folders.map(([name, meta]) => ({ value: name, label: name, hint: `${meta.count} files · ${fmtBytes(meta.bytes)}` }))}
          />
          <div className="w-[210px]">
            <SearchInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search files or tags…" onClear={() => setQuery('')} />
          </div>
        </div>
      </div>

      {view === 'grid' ? (
        <div className="stagger grid gap-3 pb-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
          {items.map((asset) => {
            const meta = KIND_META[asset.kind]
            const isStar = starred[asset.id] ?? asset.starred
            return (
              <article key={asset.id} className="group overflow-hidden rounded-xl border border-line-2 bg-panel transition-all duration-250 hover:-translate-y-0.5 hover:border-line-3 hover:shadow-[0_18px_40px_-24px_rgba(0,0,0,0.95)]">
                <button className="relative block w-full" onClick={() => setOpenId(asset.id)}>
                  <Thumb seed={asset.seed} accent={meta.color} aspect="16/9" />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <span className="rounded-md border border-white/20 bg-black/50 px-2 py-1 text-[10.5px] text-white backdrop-blur-md">Open</span>
                  </span>
                  <span className="absolute left-2 top-2 rounded px-1.5 py-0.5 text-[9px] font-semibold backdrop-blur-md" style={{ background: `${meta.color}CC`, color: '#0B0D11' }}>
                    {meta.label.toUpperCase()}
                  </span>
                  {asset.duration && (
                    <span className="absolute bottom-2 right-2 rounded bg-black/65 px-1.5 py-0.5 backdrop-blur-md">
                      <span className="mono text-[9px] text-ink">{asset.duration}</span>
                    </span>
                  )}
                </button>
                <div className="p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[11.5px] font-medium text-ink-hi">{asset.name}</p>
                      <p className="mono mt-0.5 truncate text-[9.5px] text-ink-faint">{asset.folder}</p>
                    </div>
                    <button
                      onClick={() => setStarred((s) => ({ ...s, [asset.id]: !isStar }))}
                      aria-label={isStar ? 'Unstar asset' : 'Star asset'}
                      className={cn('shrink-0 rounded p-0.5 transition-colors', isStar ? 'text-amber' : 'text-ink-ghost hover:text-ink-low')}
                    >
                      <Star className={cn('h-3.5 w-3.5', isStar && 'fill-amber')} />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 border-t border-line-1 pt-2">
                    <span className="mono text-[9.5px] text-ink-faint">{fmtBytes(asset.size)}</span>
                    <span className="flex items-center gap-1.5">
                      {asset.usedIn.length > 0 ? (
                        <span className="mono flex items-center gap-1 text-[9.5px] text-ink-mid">
                          <Paperclip className="h-2.5 w-2.5" />
                          {asset.usedIn.length}
                        </span>
                      ) : (
                        <Badge tone="warn" size="xs">
                          orphan
                        </Badge>
                      )}
                    </span>
                  </div>
                </div>
              </article>
            )
          })}
          {!items.length && (
            <div className="sm:col-span-3 lg:col-span-4 2xl:col-span-5">
              <EmptyState icon={<HardDrive />} title="Nothing in this folder" body="Clear the filters, or upload files to populate the library." />
            </div>
          )}
        </div>
      ) : (
        <DataTable
          rows={items}
          columns={columns}
          rowHeight={46}
          onRowClick={(a) => setOpenId(a.id)}
          empty={<EmptyState icon={<HardDrive />} title="No files match" body="Try a different folder or clear the search." />}
          footer={<span className="mono text-[10.5px] text-ink-faint">{items.length} of {ds.assets.length} files · {fmtBytes(items.reduce((s, a) => s + a.size, 0))} in view</span>}
        />
      )}

      <SplitGrid ratio="even" className="mt-3.5">
        <Panel>
          <PanelHeader dense icon={<Folder />} title="Folders" subtitle="Click to filter the library" />
          <div className="grid gap-1 p-2.5 sm:grid-cols-2">
            {folders.map(([name, meta]) => (
              <button
                key={name}
                onClick={() => setFolder(folder.includes(name) ? folder.filter((f) => f !== name) : [...folder, name])}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors',
                  folder.includes(name) ? 'border-accent/35 bg-accent/[0.07]' : 'border-line-2 hover:border-line-3 hover:bg-white/[0.03]',
                )}
              >
                <Folder className="h-3.5 w-3.5 shrink-0 text-ink-low" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11.5px] text-ink-hi">{name}</span>
                  <span className="mono block text-[9.5px] text-ink-faint">
                    {meta.count} files · {fmtBytes(meta.bytes)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHeader dense icon={<HardDrive />} title="Storage by type" subtitle="Where the bytes actually go" />
          <div className="p-3.5">
            <ShareBar
              showLabels
              segments={stats.byKind.map(([kind, meta]) => ({ id: kind, label: KIND_META[kind].label, value: meta.bytes, color: KIND_META[kind].color }))}
            />
            <div className="mt-4">
              <Distribution
                height={110}
                valueSuffix=""
                rows={stats.byKind.slice(0, 6).map(([kind, meta]) => ({ label: KIND_META[kind].label, value: Math.round(meta.bytes / 1e6) }))}
              />
              <p className="mt-2 text-[10.5px] leading-relaxed text-ink-faint">
                Video masters dominate storage. Archiving projects older than 12 months would reclaim roughly {fmtBytes(stats.byKind[0][1].bytes * 0.4)}.
              </p>
            </div>
          </div>
        </Panel>
      </SplitGrid>

      <AssetDrawer asset={open} onClose={() => setOpenId(null)} />
    </Page>
  )
}

function AssetDrawer({ asset, onClose }: { asset: Asset | null; onClose: () => void }) {
  const ds = useDataset()
  const meta = asset ? KIND_META[asset.kind] : null
  return (
    <Drawer open={!!asset} onClose={onClose} width={470} title={asset ? meta!.label : undefined}>
      {asset && meta && (
        <div className="scroll-fade-y h-full overflow-y-auto">
          <div className="border-b border-line-2">
            <Thumb seed={asset.seed} accent={meta.color} aspect="16/9" className="w-full" />
          </div>
          <div className="p-4">
            <p className="text-[15px] font-semibold text-ink-hi">{asset.name}</p>
            <p className="mono mt-1 text-[10.5px] text-ink-faint">{asset.folder}</p>

            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3.5 border-t border-line-2 pt-4">
              <KeyValue label="Kind" value={meta.label} />
              <KeyValue label="MIME" value={asset.mime} mono />
              <KeyValue label="Size" value={fmtBytes(asset.size)} mono />
              <KeyValue label="Dimensions" value={asset.dims ?? '—'} mono />
              {asset.duration && <KeyValue label="Duration" value={asset.duration} mono />}
              <KeyValue label="Added" value={fmtDate(asset.createdAt, 'long')} mono />
            </div>

            <div className="mt-4">
              <p className="cell-label mb-2">Used in {asset.usedIn.length} piece{asset.usedIn.length === 1 ? '' : 's'}</p>
              {asset.usedIn.length ? (
                <ul className="space-y-1">
                  {asset.usedIn.map((cid) => {
                    const c = ds.content.find((x) => x.id === cid)
                    if (!c) return null
                    return (
                      <li key={cid}>
                        <Link to={`/content/${cid}`} onClick={onClose} className="flex w-full items-center gap-2.5 rounded-lg border border-line-2 px-2.5 py-2 text-left transition-colors hover:border-line-3">
                          <Film className="h-3 w-3 shrink-0 text-ink-faint" />
                          <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink">{c.title}</span>
                          <ArrowUpRight className="h-3 w-3 shrink-0 text-ink-ghost" />
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="rounded-lg border border-dashed border-amber/25 bg-amber/[0.04] px-3 py-3 text-[11.5px] text-amber/90">
                  Not referenced by any content. Either link it or archive it — orphaned assets make the library harder to trust.
                </p>
              )}
            </div>

            <div className="mt-4">
              <p className="cell-label mb-2">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {asset.tags.map((t) => (
                  <Badge key={t} tone="outline" size="xs">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <p className="cell-label mb-2">Version</p>
              <div className="flex items-center gap-2.5 rounded-lg border border-line-2 px-2.5 py-2">
                <Clock className="h-3.5 w-3.5 text-ink-faint" />
                <span className="flex-1 text-[11.5px] text-ink-mid">Current · {fmtDate(asset.createdAt, 'long')}</span>
                <span className="mono text-[10px] text-ink-faint">{fmtNumber(Math.round(asset.size / 1024))} KB</span>
              </div>
            </div>

            <div className="sticky bottom-0 -mx-4 mt-5 flex items-center gap-2 border-t border-line-2 bg-surface-1/95 px-4 py-3 backdrop-blur-xl">
              <Button variant="ghost" size="md" onClick={onClose}>
                Close
              </Button>
              <Tooltip content="Copy a link to this asset" side="top">
                <Button variant="secondary" size="md" icon={<Paperclip />}>
                  Copy link
                </Button>
              </Tooltip>
              <Button variant="primary" size="md" className="ml-auto" icon={<Upload />} onClick={() => useApp.getState().pushToast({ kind: 'success', title: 'New version uploaded', body: 'Previous version kept for 30 days.' })}>
                Replace
              </Button>
            </div>
          </div>
        </div>
      )}
    </Drawer>
  )
}
