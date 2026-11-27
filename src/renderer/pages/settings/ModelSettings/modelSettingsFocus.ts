export type ModelSettingsFocus = 'default'

export type ModelSettingsSearch = {
  focus?: ModelSettingsFocus
}

export function validateModelSettingsSearch(search: Record<string, unknown>): ModelSettingsSearch {
  return search.focus === 'default' ? { focus: search.focus } : {}
}
