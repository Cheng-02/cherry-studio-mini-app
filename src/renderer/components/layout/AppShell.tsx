import { useCallback, useEffect, useMemo } from 'react'

import { useCommandHandler, useCommandRuntime } from '@renderer/hooks/command'
import { useTabs } from '@renderer/hooks/tab'
import { useLeadingWindowControlsOverlay } from '@renderer/hooks/useLeadingWindowControlsOverlay'
import useMacTransparentWindow from '@renderer/hooks/useMacTransparentWindow'
import { useNativeFullscreen } from '@renderer/hooks/useNativeFullscreen'
import { useNumberShortcutHints } from '@renderer/hooks/useNumberShortcutHints'
import { ipcApi } from '@renderer/ipc'
import { TAB_NUMBER_COMMANDS } from '@renderer/utils/numberShortcuts'
import { isMac } from '@renderer/utils/platform'
import { getDefaultRouteTitle, isPageTitledRoute } from '@renderer/utils/routeTitle'
import { cn } from '@renderer/utils/style'
import { isSettingsPath } from '@shared/data/types/settingsPath'

import Sidebar from '../app/Sidebar'
import MiniAppTabsPool from '../MiniApp/MiniAppTabsPool'
import { AppShellTabBar } from './AppShellTabBar'
import { TabRouter } from './TabRouter'

/**
 * Mini-app-only shell: the tab bar, the route stack and the mini-app webview
 * keep-alive pool. Chat/agent-only concerns (global search, markdown preview
 * drop targets, per-route window width) are gone with their features.
 */
export const AppShell = () => <AppShellContent />

const AppShellContent = () => {
  const isMacTransparentWindow = useMacTransparentWindow()
  const tabsApi = useTabs()
  const {
    tabs,
    activeTabId,
    setActiveTab,
    closeTab,
    closeTabs,
    updateTab,
    reorderTabs,
    pinTab,
    unpinTab,
    detachTab,
    openTab
  } = tabsApi
  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeTabId), [activeTabId, tabs])
  const isSettingsTabActive = isSettingsPath(activeTab?.url)
  // A focused (settings) tab is rendered as a single back button; feeding the
  // whole tab list here would paint one back button per open tab.
  const tabBarTabs = useMemo(
    () => (isSettingsTabActive && activeTab ? [activeTab] : tabs),
    [activeTab, isSettingsTabActive, tabs]
  )
  const isFullscreen = useNativeFullscreen()
  const hasLeadingWindowControls = useLeadingWindowControlsOverlay()

  const handleCloseTab = useCallback(
    (id: string) => {
      const tab = tabs.find((candidate) => candidate.id === id)
      if (isSettingsPath(tab?.url)) {
        const fallbackTabId = tabs.find((candidate) => !isSettingsPath(candidate.url))?.id
        closeTabs([id], fallbackTabId)
        return
      }
      closeTab(id)
    },
    [closeTab, closeTabs, tabs]
  )

  const handleDetachTab = useCallback(
    (id: string) => {
      const tab = tabs.find((candidate) => candidate.id === id)
      const fallbackTabId = isSettingsPath(tab?.url)
        ? tabs.find((candidate) => !isSettingsPath(candidate.url))?.id
        : undefined
      detachTab(id, fallbackTabId)
    },
    [detachTab, tabs]
  )

  const cycleTab = useCallback(
    (direction: 'next' | 'prev') => {
      if (tabs.length <= 1) return
      const currentIndex = tabs.findIndex((t) => t.id === activeTabId)
      if (currentIndex === -1) return

      const offset = direction === 'next' ? 1 : -1
      const nextIndex = (currentIndex + offset + tabs.length) % tabs.length
      setActiveTab(tabs[nextIndex].id)
    },
    [tabs, activeTabId, setActiveTab]
  )

  const handleCloseActiveTab = useCallback(() => {
    if (!activeTabId) return
    if (isMac && tabs.length === 1) {
      void ipcApi.request('window.close')
      return
    }
    handleCloseTab(activeTabId)
  }, [activeTabId, handleCloseTab, tabs.length])

  const commandRuntime = useCommandRuntime()
  const tabCommandHints = useNumberShortcutHints(TAB_NUMBER_COMMANDS)
  const orderedTabs = useMemo(
    () => [...tabs.filter((tab) => tab.isPinned), ...tabs.filter((tab) => !tab.isPinned)],
    [tabs]
  )
  const tabShortcutHints = new Map(
    orderedTabs
      .slice(0, TAB_NUMBER_COMMANDS.length)
      .map((tab, index) => [tab.id, tabCommandHints.get(TAB_NUMBER_COMMANDS[index])])
  )
  useEffect(() => {
    const disposers = TAB_NUMBER_COMMANDS.map((command, index) => {
      const tab = orderedTabs[index]
      return commandRuntime.registerHandler(
        command,
        () => {
          if (tab) setActiveTab(tab.id)
        },
        { enabled: !!tab, allowInKeyboardLayer: true }
      )
    })
    return () => disposers.forEach((dispose) => dispose())
  }, [commandRuntime, setActiveTab, orderedTabs])

  useCommandHandler('tab.close', handleCloseActiveTab, {
    enabled: !!activeTab,
    allowInKeyboardLayer: true
  })
  useCommandHandler('tab.next', () => cycleTab('next'), {
    enabled: tabs.length > 1 && !!activeTab,
    allowInKeyboardLayer: true
  })
  useCommandHandler('tab.prev', () => cycleTab('prev'), {
    enabled: tabs.length > 1 && !!activeTab,
    allowInKeyboardLayer: true
  })

  // Mini-app routes own their titles/URLs, so navigation must keep them.
  const handleUrlChange = (tabId: string, url: string) => {
    const isPageTitled = isPageTitledRoute(url)
    updateTab(tabId, {
      url,
      ...(isPageTitled ? {} : { title: getDefaultRouteTitle(url), icon: undefined, metadata: undefined }),
      lastAccessTime: Date.now()
    })
  }

  const tabBar = (
    <AppShellTabBar
      tabs={tabBarTabs}
      shortcutHints={tabShortcutHints}
      activeTabId={activeTabId}
      isFullscreen={isFullscreen}
      isFocusedTab={isSettingsTabActive}
      setActiveTab={setActiveTab}
      closeTab={handleCloseTab}
      closeTabs={closeTabs}
      reorderTabs={reorderTabs}
      pinTab={pinTab}
      unpinTab={unpinTab}
      detachTab={handleDetachTab}
      openTab={openTab}
    />
  )

  const contentArea = (
    <div className={cn('flex min-h-0 min-w-0 flex-1 flex-col pr-1.5 pb-1.5', isSettingsTabActive && 'pl-1.5')}>
      <main
        data-ui="app.content"
        className="relative min-h-0 flex-1 overflow-hidden rounded-[12px] border-[0.5px] border-border bg-background">
        {/* Route Tabs: Only render non-dormant tabs */}
        {tabs
          .filter((t) => t.type === 'route' && !t.isDormant)
          .map((tab) => (
            <TabRouter
              key={tab.id}
              tab={tab}
              isActive={tab.id === activeTabId}
              onUrlChange={(url) => handleUrlChange(tab.id, url)}
            />
          ))}

        {/* MiniApp keep-alive WebView pool — global, shared across modes */}
        <MiniAppTabsPool />
      </main>
    </div>
  )

  const contentColumn = (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {tabBar}
      {contentArea}
    </div>
  )

  // Leading Linux WCO controls take the top-left corner like macOS traffic lights do.
  if (!isMac && !hasLeadingWindowControls) {
    return (
      <div
        data-ui="app.shell"
        className={cn(
          'flex h-screen w-screen flex-row overflow-hidden text-foreground',
          isMacTransparentWindow ? 'bg-transparent' : 'bg-sidebar'
        )}>
        {!isSettingsTabActive && <Sidebar isFullscreen={isFullscreen} />}
        {contentColumn}
      </div>
    )
  }

  return (
    <div
      data-ui="app.shell"
      className={cn(
        'relative flex h-screen w-screen flex-row overflow-hidden text-foreground',
        isMacTransparentWindow ? 'bg-transparent' : 'bg-sidebar'
      )}>
      {!isFullscreen && (
        <div
          aria-hidden="true"
          data-testid="macos-traffic-light-drag-region"
          className="pointer-events-none absolute top-0 left-0 h-11 w-[env(titlebar-area-x)] [-webkit-app-region:drag]"
        />
      )}
      {!isSettingsTabActive && (
        <div className="flex h-full min-h-0 shrink-0 flex-col [&>#app-sidebar]:min-h-0 [&>#app-sidebar]:flex-1">
          {!isFullscreen && (
            <div
              aria-hidden="true"
              data-testid="macos-traffic-light-spacer"
              className="h-11 shrink-0 [-webkit-app-region:drag]"
            />
          )}
          <Sidebar isFullscreen={isFullscreen} />
        </div>
      )}
      {contentColumn}
    </div>
  )
}
