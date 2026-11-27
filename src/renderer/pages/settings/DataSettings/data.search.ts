import type { SettingsSearchEntry } from '../settingsSearch/types'

// Data settings switches its panels via component state, not sub-routes, so
// each entry carries the owning panel key — jumps navigate as /settings/data?panel=<key>
// and DataSettings mounts that panel before the anchor lookup. Conditional rows
// (v1 remigration) and modal-only actions stay out per D8.
export const route = '/settings/data'

export const entries: SettingsSearchEntry[] = [
  {
    anchorId: 'data-backup-restore',
    titleKey: 'settings.general.backup.title',
    panel: 'data',
    groupKey: 'settings.data.title'
  },
  {
    anchorId: 'data-skip-file-data',
    titleKey: 'settings.data.backup.skip_file_data_title',
    panel: 'data',
    groupKey: 'settings.data.title'
  },
  {
    anchorId: 'data-app-data',
    titleKey: 'settings.data.app_data.label',
    panel: 'data',
    groupKey: 'settings.data.data.title',
    aliases: ['data directory', '数据目录']
  },
  {
    anchorId: 'data-app-logs',
    titleKey: 'settings.data.app_logs.label',
    panel: 'data',
    groupKey: 'settings.data.data.title',
    aliases: ['logs', '日志']
  },
  {
    anchorId: 'data-clear-cache',
    titleKey: 'settings.data.clear_cache.title',
    panel: 'data',
    groupKey: 'settings.data.data.title',
    aliases: ['cache', '缓存']
  },
  {
    anchorId: 'data-reset',
    titleKey: 'settings.data.data_reset.title',
    panel: 'data',
    groupKey: 'settings.data.data.title',
    aliases: ['reset', '恢复出厂', '清空数据']
  },
  {
    anchorId: 'data-privacy-mode',
    titleKey: 'settings.privacy.enable_privacy_mode',
    panel: 'data',
    groupKey: 'settings.privacy.title'
  },
  {
    anchorId: 'local-backup-directory',
    titleKey: 'settings.data.local.directory.label',
    panel: 'local_backup',
    groupKey: 'settings.data.local.title'
  },
]
