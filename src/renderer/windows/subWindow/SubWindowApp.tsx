import { CommandContextKeyProvider, CommandProvider } from '@renderer/components/command'
import { ErrorBoundary } from '@renderer/components/ErrorBoundary'
import { TabsProvider } from '@renderer/components/layout/TabsProvider'
import { PopupHost } from '@renderer/components/PopupHost'
import { ThemeProvider } from '@renderer/components/ThemeProvider'
import ToastHost from '@renderer/components/ToastHost'
import { WindowFatalFallback } from '@renderer/components/WindowFatalFallback'
import { useWindowRuntime } from '@renderer/hooks/useWindowRuntime'
import { SubWindowAppShell } from '@renderer/windows/subWindow/SubWindowAppShell'

// Headless behavior leaf inside the providers: the shared window runtime (same route
// tree as main, so it needs the same window-level side effects). It renders nothing;
// the popup/toast hosts are explicit siblings below.
function SubWindowRuntime(): null {
  useWindowRuntime()
  return null
}

/**
 * Detached-tab window. Mini-app-only build: no chat/agent runtimes, voice hosts,
 * MCP hosts or file-edit recovery — a detached mini-app tab only needs the tab
 * stack, the route tree and the popup/toast hosts.
 */
function SubWindowApp(): React.ReactElement {
  return (
    // The boundary must stay the ANCESTOR of every provider so a provider throwing
    // during render falls back instead of white-screening.
    <ErrorBoundary fallbackComponent={WindowFatalFallback}>
      <ThemeProvider>
        <CommandContextKeyProvider>
          <CommandProvider>
            <TabsProvider initialDefaultTab={null} includePinnedTabs={false}>
              <SubWindowAppShell />
              <SubWindowRuntime />
              <PopupHost />
              <ToastHost />
            </TabsProvider>
          </CommandProvider>
        </CommandContextKeyProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default SubWindowApp
