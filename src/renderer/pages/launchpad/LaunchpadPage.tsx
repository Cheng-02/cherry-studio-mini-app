import { arrayMove } from '@dnd-kit/helpers'
import { useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button, ScrollArea, Sortable } from '@cherrystudio/ui'
import App from '@renderer/components/MiniApp/MiniApp'
import { useMiniApps } from '@renderer/hooks/useMiniApps'
import { useSidebarShortcuts } from '@renderer/hooks/useSidebarShortcuts'
import { toast } from '@renderer/services/toast'
import { createSidebarShortcutTarget, SIDEBAR_SHORTCUT_PROVIDER_IDS } from '@renderer/utils/sidebar'
import type { MiniApp as MiniAppType } from '@shared/data/types/miniApp'

const LAUNCHPAD_GRID_CLASS = 'grid grid-cols-6 justify-items-center gap-2 px-2'
const LAUNCHPAD_ITEM_CLASS = 'mx-auto w-[92px]'
const SORTABLE_CONTENTS_STYLE = { display: 'contents' } as const
const ADD_TILE_CLASS =
  'flex size-14 items-center justify-center rounded-2xl border border-dashed border-border bg-transparent text-muted-foreground transition-colors hover:border-ring hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring'

/**
 * Mini-app-only launchpad: the curated grid of mini apps whose status is
 * `pinned` (添加到启动台). Curating happens in the 小程序 page — every mini app
 * carries an 添加到启动台 / 从启动台移除 action — so the launcher stays a short
 * list of the apps the user actually opens, not the whole catalog.
 */
export default function LaunchpadPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const {
    pinned,
    openedKeepAliveMiniApps,
    currentMiniAppId,
    miniAppShow,
    updateAppStatus,
    hideMiniApp,
    removeCustomMiniApp,
    reorderMiniAppsByStatus
  } = useMiniApps()
  const { shortcuts, isPinned, setPinned } = useSidebarShortcuts()

  const sidebarFavoriteIdSet = useMemo(
    () =>
      new Set(
        shortcuts.flatMap((shortcut) =>
          shortcut.target.locator.providerId === SIDEBAR_SHORTCUT_PROVIDER_IDS.MINI_APP
            ? [shortcut.target.locator.resourceId]
            : []
        )
      ),
    [shortcuts]
  )
  const openedMiniAppIdSet = useMemo(
    () => new Set(openedKeepAliveMiniApps.map((app) => app.appId)),
    [openedKeepAliveMiniApps]
  )

  const toggleSidebarFavorite = useCallback(
    (appId: string) => {
      const app = pinned.find((item) => item.appId === appId)
      const fallbackLabel = app ? (app.nameKey ? t(app.nameKey) : app.name) : undefined
      setPinned(
        createSidebarShortcutTarget(SIDEBAR_SHORTCUT_PROVIDER_IDS.MINI_APP, appId),
        !isPinned(createSidebarShortcutTarget(SIDEBAR_SHORTCUT_PROVIDER_IDS.MINI_APP, appId)),
        fallbackLabel
      )
    },
    [pinned, t, setPinned, isPinned]
  )

  // Pinned mini apps are ordered by their global `orderKey`; dragging a tile
  // rewrites those keys through the same endpoint the 小程序 settings grid uses.
  const sortedMiniApps = useMemo(
    () => [...pinned].sort((a, b) => (a.orderKey < b.orderKey ? -1 : a.orderKey > b.orderKey ? 1 : 0)),
    [pinned]
  )

  // Hold the drop result optimistically so the tile stays at its dropped slot
  // while the async order-key write settles.
  const [orderedMiniApps, setOrderedMiniApps] = useState(sortedMiniApps)
  useEffect(() => {
    setOrderedMiniApps((prev) => (sameMiniAppItems(prev, sortedMiniApps) ? prev : sortedMiniApps))
  }, [sortedMiniApps])

  const handleSortEnd = useCallback(
    ({ oldIndex, newIndex }: { oldIndex: number; newIndex: number }) => {
      const nextItems = arrayMove(orderedMiniApps, oldIndex, newIndex)
      setOrderedMiniApps(nextItems)
      reorderMiniAppsByStatus('pinned', nextItems).catch(() => {
        toast.error(t('miniApp.reorder_failed'))
      })
    },
    [orderedMiniApps, reorderMiniAppsByStatus, t]
  )

  const openMiniApp = useCallback(
    (appId: string) => {
      void navigate({ to: '/app/mini-app/$appId', params: { appId } })
    },
    [navigate]
  )

  const openCatalog = useCallback(() => {
    void navigate({ to: '/app/mini-app' })
  }, [navigate])

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto flex w-full max-w-180 flex-col gap-5 py-12.5">
          <section className="flex flex-col gap-2">
            <h2 className="m-0 px-9 py-0 font-semibold text-[14px] text-foreground opacity-80">
              {t('launchpad.miniApps')}
            </h2>

            {orderedMiniApps.length > 0 ? (
              <div className={LAUNCHPAD_GRID_CLASS}>
                <Sortable
                  items={orderedMiniApps}
                  itemKey="appId"
                  layout="grid"
                  listStyle={SORTABLE_CONTENTS_STYLE}
                  onSortEnd={handleSortEnd}
                  renderItem={(app: MiniAppType) => (
                    <div
                      key={app.appId}
                      className={`${LAUNCHPAD_ITEM_CLASS} flex justify-center rounded-[8px] px-0 py-2 transition-transform duration-200 hover:scale-105 active:scale-95`}>
                      <App
                        app={app}
                        size={56}
                        variant="launchpad"
                        onOpen={openMiniApp}
                        onUpdateStatus={updateAppStatus}
                        onHide={hideMiniApp}
                        onRemoveCustom={removeCustomMiniApp}
                        onToggleSidebarFavorite={toggleSidebarFavorite}
                        isPinned
                        isSidebarFavorite={sidebarFavoriteIdSet.has(app.appId)}
                        isOpened={openedMiniAppIdSet.has(app.appId)}
                        isActive={miniAppShow && currentMiniAppId === app.appId}
                      />
                    </div>
                  )}
                />
                <button type="button" onClick={openCatalog} className={`${LAUNCHPAD_ITEM_CLASS} group`}>
                  <span className={ADD_TILE_CLASS}>
                    <Plus size={20} />
                  </span>
                  <span className="mt-2 block w-full overflow-hidden text-ellipsis whitespace-nowrap text-[12px] text-muted-foreground group-hover:text-foreground">
                    {t('launchpad.add')}
                  </span>
                </button>
              </div>
            ) : (
              <div className="mx-9 flex flex-col items-start gap-3 rounded-xl border border-dashed border-border px-6 py-8">
                <p className="m-0 font-medium text-[14px] text-foreground">{t('launchpad.empty_title')}</p>
                <p className="m-0 text-[13px] text-muted-foreground">{t('launchpad.empty_hint')}</p>
                <Button type="button" variant="outline" size="sm" onClick={openCatalog}>
                  <Plus size={14} />
                  {t('launchpad.add')}
                </Button>
              </div>
            )}
          </section>
        </div>
      </ScrollArea>
    </div>
  )
}

/** Same mini app objects in the same order. */
function sameMiniAppItems(a: MiniAppType[], b: MiniAppType[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}
