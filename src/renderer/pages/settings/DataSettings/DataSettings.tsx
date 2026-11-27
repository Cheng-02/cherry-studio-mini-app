import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { CloudUpload, Database } from 'lucide-react'
import type { ReactNode } from 'react'
import { type FC, lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'

import { MenuItem, MenuList, PageHeader, RowFlex, ScrollArea } from '@cherrystudio/ui'
import { SettingsContentColumn } from '@renderer/components/SettingsPrimitives'
import { useTheme } from '@renderer/hooks/useTheme'
import {
  settingsSubmenuItemClassName,
  settingsSubmenuItemLabelClassName,
  settingsSubmenuListClassName,
  settingsSubmenuScrollClassName
} from '@renderer/pages/settings/settingsStyles'
import type { AppRouter } from '@renderer/types/router'

import BasicDataSettings from './BasicDataSettings'
import { DATA_PANEL_KEYS, type DataPanelKey, DEFAULT_DATA_PANEL } from './dataPanels'

const dataRouteApi = getRouteApi('/settings/data')

const LocalBackupSettings = lazy(() => import('./LocalBackupSettings'))

type DataMenuItem = { key: DataPanelKey; title: string; icon: ReactNode }

/**
 * Mini-app-only build: keep local data location, cache cleanup, backup/restore.
 * Third-party import/export integrations (WebDAV, S3, Notion, Yuque, Joplin,
 * Obsidian, Siyuan, Nutstore) belonged to the removed notes/knowledge/chat
 * modules.
 */
const DataSettings: FC = () => {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const navigate = useNavigate()
  // The URL is the single source of truth for the active panel (search jumps
  // arrive as /settings/data?panel=<key>; menu clicks write it back with replace).
  const search = dataRouteApi.useSearch<AppRouter>()
  const rawPanel = typeof search.panel === 'string' ? search.panel : undefined
  const panelParam = rawPanel && (DATA_PANEL_KEYS as readonly string[]).includes(rawPanel) ? rawPanel : undefined
  const menu = panelParam ?? DEFAULT_DATA_PANEL

  const menuItems: DataMenuItem[] = [
    { key: 'data', title: t('settings.data.data.title'), icon: <Database size={16} /> },
    { key: 'local_backup', title: t('settings.data.local.title'), icon: <CloudUpload size={16} /> }
  ]

  return (
    <RowFlex className="flex-1">
      <div className={`flex flex-col ${settingsSubmenuScrollClassName}`}>
        <PageHeader title={t('settings.data.title')} />
        <ScrollArea className="min-h-0 flex-1">
          <MenuList className={settingsSubmenuListClassName}>
            {menuItems.map((item) => (
              <MenuItem
                key={item.key}
                label={item.title}
                active={menu === item.key}
                onClick={() => void navigate({ to: '/settings/data', search: { panel: item.key }, replace: true })}
                icon={item.icon}
                className={settingsSubmenuItemClassName}
                labelClassName={settingsSubmenuItemLabelClassName}
              />
            ))}
          </MenuList>
        </ScrollArea>
      </div>
      <SettingsContentColumn theme={theme}>
        {menu === 'data' ? (
          <BasicDataSettings />
        ) : (
          <Suspense fallback={null}>{menu === 'local_backup' && <LocalBackupSettings />}</Suspense>
        )}
      </SettingsContentColumn>
    </RowFlex>
  )
}

export default DataSettings
