import { useEffect, useMemo } from 'react'

import { usePreference } from '@data/hooks/usePreference'
import { loggerService } from '@logger'
import {
  CORE_SIDEBAR_SHORTCUT_PROVIDERS,
  SidebarShortcutRegistry,
  SidebarShortcutRegistryProvider
} from '@renderer/components/app/sidebarShortcuts'
import { CommandContextKeyProvider, CommandProvider } from '@renderer/components/command'
import { ErrorBoundary } from '@renderer/components/ErrorBoundary'
import { AppShell } from '@renderer/components/layout/AppShell'
import { TabsProvider } from '@renderer/components/layout/TabsProvider'
import { MandatoryGateProvider } from '@renderer/components/MandatoryGateProvider'
import { PopupHost } from '@renderer/components/PopupHost'
import { ThemeProvider } from '@renderer/components/ThemeProvider'
import ToastHost from '@renderer/components/ToastHost'
import { WindowFatalFallback } from '@renderer/components/WindowFatalFallback'
import { useMainWindowNavigation } from '@renderer/hooks/tab'
import { useIsPrivacyUpdateRequired } from '@renderer/hooks/useIsPrivacyUpdateRequired'
import { useWindowRuntime } from '@renderer/hooks/useWindowRuntime'
import { getSidebarDefaultLandingUrl } from '@renderer/utils/sidebar'
import type { Tab } from '@shared/data/cache/cacheValueTypes'

import { useAppUpdateHandler } from './hooks/useAppUpdateHandler'
import { useAutoBackupEvents } from './hooks/useAutoBackupEvents'
import { PrivacyPolicyUpdateGate } from './privacy/PrivacyPolicyUpdateGate'

const logger = loggerService.withContext('MainApp')

// Behavior leaf inside the providers: the shared window runtime plus the
// main-window-only concerns, then the popup/toast hosts. It sits inside the
// providers but outside every TabRouter/<Activity>, so these window-scoped
// subscriptions and DOM sync are never torn down when a background tab hides.
function MainWindowRuntime(): null {
  useWindowRuntime()
  useMainWindowNavigation()

  // Main-only: tear down the HTML boot spinner. The markup only main/index.html
  // creates (`#spinner`), so this must never run in another window.
  useEffect(() => {
    document.getElementById('spinner')?.remove()
    console.timeEnd('init')
  }, [])

  useAppUpdateHandler()
  useAutoBackupEvents()

  return null
}

export function MainWindowContent(): React.ReactElement {
  const [sidebarShortcuts] = usePreference('ui.sidebar_shortcut')
  const [defaultPaintingProvider] = usePreference('feature.paintings.default_provider')
  const sidebarShortcutRegistry = useMemo(() => new SidebarShortcutRegistry(CORE_SIDEBAR_SHORTCUT_PROVIDERS), [])
  const privacyUpdateRequired = useIsPrivacyUpdateRequired()

  const initialDefaultTab = useMemo<Tab>(
    () => ({
      id: 'home',
      type: 'route',
      url: getSidebarDefaultLandingUrl(sidebarShortcuts, defaultPaintingProvider) || '/app/mini-app',
      title: '',
      lastAccessTime: Date.now(),
      isDormant: false
    }),
    [defaultPaintingProvider, sidebarShortcuts]
  )

  return (
    <TabsProvider initialDefaultTab={initialDefaultTab}>
      <SidebarShortcutRegistryProvider registry={sidebarShortcutRegistry}>
        <MandatoryGateProvider open={privacyUpdateRequired}>
          <AppShell />
          <MainWindowRuntime />
          <PopupHost />
          <ToastHost />
          <PrivacyPolicyUpdateGate />
        </MandatoryGateProvider>
      </SidebarShortcutRegistryProvider>
    </TabsProvider>
  )
}

function MainApp(): React.ReactElement {
  logger.info('MainApp initialized')

  return (
    // The boundary must stay the ANCESTOR of every provider so a provider throwing
    // during render (e.g. reading preferences) falls back instead of white-screening.
    <ErrorBoundary fallbackComponent={WindowFatalFallback}>
      <ThemeProvider>
        <CommandContextKeyProvider>
          <CommandProvider>
            <MainWindowContent />
          </CommandProvider>
        </CommandContextKeyProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default MainApp
