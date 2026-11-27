import type { SettingsSearchEntry } from '../settingsSearch/types'

// Mini-app-only build: the default (chat) model is the only model slot left.
export const route = '/settings/model'

export const entries: SettingsSearchEntry[] = [
  {
    anchorId: 'default-assistant-model',
    titleKey: 'settings.models.default_assistant_model',
    groupKey: 'settings.model',
    descriptionKey: 'settings.models.default_assistant_model_description'
  }
]
