import type { FC } from 'react'
import { useTranslation } from 'react-i18next'

import { Switch } from '@cherrystudio/ui'
import { useMultiplePreferences } from '@data/hooks/usePreference'
import { loggerService } from '@logger'
import {
  SettingDivider,
  SettingGroup,
  SettingRow,
  SettingRowTitle,
  SettingsContentColumn,
  SettingTitle
} from '@renderer/components/SettingsPrimitives'
import { useTheme } from '@renderer/hooks/useTheme'
import { toast } from '@renderer/services/toast'

const logger = loggerService.withContext('NotificationSettings')

/**
 * Mini-app-only build: notification settings keep the OS popup master switch
 * plus the two sources this build still produces — local backups and mini-app
 * notifications. Chat/agent/knowledge/usage/update sources and the in-app
 * notification center they fed are gone.
 */
const NotificationSettings: FC = () => {
  const { t } = useTranslation()
  const { theme } = useTheme()

  const [notificationSettings, setNotificationSettings] = useMultiplePreferences({
    backup: 'app.notification.backup.enabled',
    'mini-app': 'app.notification.mini_app.enabled'
  })

  const saveSettings = (values: Partial<typeof notificationSettings>) =>
    setNotificationSettings(values).catch((error) => {
      logger.error('Failed to save notification settings', error as Error)
      toast.error(t('common.error'))
    })

  const popupsEnabled = notificationSettings.backup || notificationSettings['mini-app']

  return (
    <SettingsContentColumn theme={theme}>
      <SettingGroup theme={theme}>
        <SettingTitle>{t('settings.notification.popups')}</SettingTitle>
        <SettingDivider />
        <SettingRow id="setting-notifications-system-popups" className="scroll-mt-6">
          <SettingRowTitle>{t('settings.notification.system_popups')}</SettingRowTitle>
          <Switch
            aria-label={t('settings.notification.system_popups')}
            checked={popupsEnabled}
            onCheckedChange={(value) => void saveSettings({ backup: value, 'mini-app': value })}
          />
        </SettingRow>
        <SettingDivider />
        <SettingRow id="setting-notifications-backup-notification" className="scroll-mt-6">
          <SettingRowTitle>{t('settings.notification.backup')}</SettingRowTitle>
          <Switch
            aria-label={t('settings.notification.backup')}
            checked={notificationSettings.backup}
            onCheckedChange={(value) => void saveSettings({ backup: value })}
          />
        </SettingRow>
        <SettingDivider />
        <SettingRow id="setting-notifications-mini-app-notification" className="scroll-mt-6">
          <SettingRowTitle>{t('settings.notification.mini_app')}</SettingRowTitle>
          <Switch
            aria-label={t('settings.notification.mini_app')}
            checked={notificationSettings['mini-app']}
            onCheckedChange={(value) => void saveSettings({ 'mini-app': value })}
          />
        </SettingRow>
      </SettingGroup>
    </SettingsContentColumn>
  )
}

export default NotificationSettings
