import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorState } from '@/components/ui/Surface'

/* ============================================================================
   ERROR BOUNDARY
   A render fault should never leave a blank cockpit. The boundary keeps the
   shell (sidebar, topbar, palette) alive and replaces only the failed view,
   with the message in plain language plus Retry and a way back to the cached
   snapshot the rest of the app is still reading from.
   ========================================================================== */

interface Props {
  children: ReactNode
  /** Called when the user asks for cached data — usually a route change home. */
  onRecover?: () => void
  label?: string
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    /* Kept as a console warning on purpose: there is no backend to report to,
       and a swallowed failure is worse than a loud one during development. */
    console.warn('[Creator OS] view failed to render', error.message, info.componentStack)
  }

  private retry = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="mx-auto w-full max-w-[720px] p-6">
        <ErrorState
          title={`${this.props.label ?? 'This view'} could not be rendered`}
          body="The rest of the workspace is unaffected — your data is intact and still available. Retrying rebuilds this view from the same in-memory dataset; opening the dashboard shows the cached snapshot."
          detail={error.message}
          onRetry={this.retry}
          onCache={this.props.onRecover}
        />
      </div>
    )
  }
}
