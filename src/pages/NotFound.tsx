import { useNavigate } from 'react-router-dom'
import { Compass, Home, Search } from 'lucide-react'
import { useApp } from '@/store/app'
import { Button } from '@/components/ui/Button'
import { Page } from '@/components/ui/Page'
import { Panel } from '@/components/ui/Surface'

/* ============================================================================
   NOT FOUND
   A dead end should still be a useful surface: the palette is one keystroke
   away, and the recents list knows where you were last.
   ========================================================================== */

export function NotFound() {
  const navigate = useNavigate()
  const recents = useApp((s) => s.recents)
  const setSearchOpen = useApp((s) => s.setSearchOpen)

  return (
    <Page width="narrow">
      <div className="flex min-h-[62vh] items-center justify-center">
        <div className="w-full max-w-[460px] text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-line-3 bg-white/[0.03]">
            <Compass className="h-6 w-6 text-ink-low" />
          </span>
          <h1 className="title-2 mt-5">This route does not exist</h1>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-low">
            The workspace has a fixed map: dashboard, content, calendar, research, analytics, audience, revenue, assets, brand and settings.
            Everything else lives inside a record.
          </p>
          <div className="mt-5 flex items-center justify-center gap-2">
            <Button variant="primary" size="md" icon={<Home />} onClick={() => navigate('/')}>
              Back to dashboard
            </Button>
            <Button variant="secondary" size="md" icon={<Search />} onClick={() => setSearchOpen(true)}>
              Search instead
            </Button>
          </div>

          {recents.length > 0 && (
            <Panel className="mt-6 p-1 text-left">
              <p className="cell-label px-3 py-2">Recently visited</p>
              <ul className="pb-1">
                {recents.slice(0, 4).map((r) => (
                  <li key={r.id}>
                    <button
                      onClick={() => navigate(r.href)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/[0.04]"
                    >
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent/70" />
                      <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink">{r.title}</span>
                      <span className="mono shrink-0 text-[9.5px] text-ink-ghost">{r.href}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>
    </Page>
  )
}
