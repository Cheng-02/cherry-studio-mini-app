import MiniAppIcon from '@renderer/components/icons/MiniAppIcon'
import { dataApiService } from '@renderer/data/DataApiService'
import { getSidebarIconLabelKey } from '@renderer/i18n/label'
import i18n from '@renderer/i18n/resolver'
import { miniAppIdFromTabUrl } from '@renderer/utils/miniAppKeepAlive'
import {
  getSidebarApp,
  getSidebarMenuPath,
  isSidebarAppId,
  SIDEBAR_SHORTCUT_PROVIDER_IDS,
  tabBelongsToApp
} from '@renderer/utils/sidebar'
import { createSidebarShortcutId, type SidebarShortcutTarget } from '@shared/data/preference/preferenceTypes'

import { SidebarIcon } from '../sidebarIcons'
import type { ResolvedShortcut, SidebarShortcutProvider } from './types'

const REVEAL_ACTIVATIONS = new Set<string | undefined>([undefined, 'reveal'])

function validates(providerId: string, target: SidebarShortcutTarget): boolean {
  return (
    target.kind === 'resource' &&
    target.locator.providerId === providerId &&
    target.locator.resourceId.length > 0 &&
    REVEAL_ACTIVATIONS.has(target.activationId)
  )
}

function mapRequested<T>(
  targets: readonly SidebarShortcutTarget[],
  entities: readonly T[],
  idOf: (entity: T) => string,
  resolve: (entity: T) => ResolvedShortcut
): Map<string, ResolvedShortcut> {
  const targetsByResourceId = new Map<string, SidebarShortcutTarget[]>()
  for (const target of targets) {
    const matches = targetsByResourceId.get(target.locator.resourceId) ?? []
    matches.push(target)
    targetsByResourceId.set(target.locator.resourceId, matches)
  }
  const result = new Map<string, ResolvedShortcut>()
  for (const entity of entities) {
    const matches = targetsByResourceId.get(idOf(entity))
    if (!matches) continue
    const resource = resolve(entity)
    for (const target of matches) result.set(createSidebarShortcutId(target), resource)
  }
  return result
}

function languageSubscription(invalidate: () => void): () => void {
  i18n.on('languageChanged', invalidate)
  return () => i18n.off('languageChanged', invalidate)
}

function localizedCollectionSubscription(
  endpoint: Parameters<typeof dataApiService.onDataChanged>[0]
): NonNullable<SidebarShortcutProvider['subscribe']> {
  return (_targets, invalidate) => {
    const unsubscribeData = dataApiService.onDataChanged(endpoint, invalidate)
    const unsubscribeLanguage = languageSubscription(invalidate)
    return () => {
      unsubscribeData()
      unsubscribeLanguage()
    }
  }
}

const appProvider: SidebarShortcutProvider = {
  id: SIDEBAR_SHORTCUT_PROVIDER_IDS.APP,
  validate: (target) =>
    validates(SIDEBAR_SHORTCUT_PROVIDER_IDS.APP, target) && isSidebarAppId(target.locator.resourceId),
  async resolveMany(targets) {
    const result = new Map<string, ResolvedShortcut>()
    for (const target of targets) {
      const id = target.locator.resourceId
      if (!isSidebarAppId(id) || !getSidebarApp(id)) continue
      result.set(createSidebarShortcutId(target), {
        label: i18n.t(getSidebarIconLabelKey(id)),
        renderIcon: ({ glyphSize, active }) => (
          <SidebarIcon icon={id} active={active} size={glyphSize} strokeWidth={1.6} />
        ),
        supportsNewTab: true
      })
    }
    return result
  },
  async activate(target, gateway) {
    if (!this.validate(target)) return
    const id = target.locator.resourceId
    if (!isSidebarAppId(id)) return
    const url = getSidebarMenuPath(id, '')
    const app = getSidebarApp(id)
    if (!url || !app) return
    gateway.openWorkspace({
      url,
      title: i18n.t(getSidebarIconLabelKey(id)),
      matchesCurrent: (currentUrl) => this.isActive!(target, { url: currentUrl }),
      // App entries have no resource identity: always replace the active tab, never focus a sibling.
      matchesTab: () => false
    })
  },
  subscribe: (_targets, invalidate) => languageSubscription(invalidate),
  isActive(target, navigation) {
    const app = isSidebarAppId(target.locator.resourceId) ? getSidebarApp(target.locator.resourceId) : undefined
    return !!app && (app.exactRouteFocus ? navigation.url === app.routePrefix : tabBelongsToApp(app, navigation.url))
  }
}

const miniAppProvider: SidebarShortcutProvider = {
  id: SIDEBAR_SHORTCUT_PROVIDER_IDS.MINI_APP,
  validate: (target) => validates(SIDEBAR_SHORTCUT_PROVIDER_IDS.MINI_APP, target),
  async resolveMany(targets) {
    const miniApps = await dataApiService.get('/mini-apps')
    return mapRequested(
      targets,
      miniApps,
      (app) => app.appId,
      (app) => ({
        label: app.nameKey ? i18n.t(app.nameKey) : app.name,
        renderIcon: ({ slotSize, glyphSize, active }) =>
          app.logo || app.logoSrc ? (
            <MiniAppIcon app={app} appearance="sidebar" size={slotSize} />
          ) : (
            <SidebarIcon icon="miniApp" active={active} size={glyphSize} strokeWidth={1.6} />
          ),
        tabIcon: app.logoSrc ?? app.logo,
        supportsNewTab: true
      })
    )
  },
  subscribe: localizedCollectionSubscription('/mini-apps'),
  activate(target, gateway) {
    if (!this.validate(target)) return
    const id = target.locator.resourceId
    gateway.openWorkspace({ url: `/app/mini-app/${encodeURIComponent(id)}`, title: id })
  },
  isActive: (target, navigation) => miniAppIdFromTabUrl(navigation.url) === target.locator.resourceId
}

/**
 * Mini-app-only build: the sidebar registry keeps the built-in app entry
 * (`/app/mini-app`) and individual mini-app shortcuts. Agent / assistant /
 * knowledge / topic / file / code-CLI shortcut providers belonged to the
 * removed feature modules.
 */
export const CORE_SIDEBAR_SHORTCUT_PROVIDERS: readonly SidebarShortcutProvider[] = [
  appProvider,
  miniAppProvider
]
