import type { LucideProps } from 'lucide-react'
import { Icon, LayoutGrid, Package } from 'lucide-react'
import type { ReactNode } from 'react'

import type { SidebarAppId } from '@renderer/utils/sidebar'

type SidebarIconComponent = (props: LucideProps) => ReactNode

/**
 * Icon component for each built-in sidebar app. Keyed by the `SidebarAppId` union so the
 * compiler enforces full coverage — adding a new sidebar app id without an icon
 * here is a type error. Kept in the component layer because the values are React
 * components; the navigation data and logic live in `@renderer/utils/sidebar`.
 */
export const SIDEBAR_ICON_COMPONENTS = {
  mini_app: LayoutGrid
} satisfies Record<SidebarAppId, SidebarIconComponent>

const RESOURCE_ICON_COMPONENTS = {
  miniApp: Package
}

const NAVIGATION_ICON_COMPONENTS = { ...SIDEBAR_ICON_COMPONENTS, ...RESOURCE_ICON_COMPONENTS }
type SidebarGlyph = keyof typeof NAVIGATION_ICON_COMPONENTS

// Interior details are transparent cutouts so filled glyphs work on translucent sidebars too.
const FILLED_PATHS: Partial<Record<SidebarGlyph, string>> = {
  miniApp:
    'M8.3 3.813 11 2.27a2 2 0 0 1 2 0l7 4a2 2 0 0 1 .38.28L16.5 8.78Z M6.7 4.727 4 6.27a2 2 0 0 0-.38.28L12 11.36l2.9-1.665Z M3 8.03l8.2 4.706v9.095a2 2 0 0 1-.2-.101l-7-4A2 2 0 0 1 3 16Z M21 8.03l-8.2 4.706v9.095a2 2 0 0 0 .2-.101l7-4A2 2 0 0 0 21 16Z'
}

export function SidebarIcon({
  icon,
  active = false,
  ...props
}: LucideProps & { icon: SidebarGlyph; active?: boolean }) {
  const Outline = NAVIGATION_ICON_COMPONENTS[icon]
  if (!active) return <Outline {...props} />

  const filledPath = FILLED_PATHS[icon]
  if (filledPath) {
    return (
      <Icon
        {...props}
        viewBox="-1 -1 26 26"
        iconNode={[['path', { d: filledPath, key: 'fill' }]]}
        fill="currentColor"
        fillRule="evenodd"
        stroke="none"
      />
    )
  }
  return <Outline {...props} viewBox="-1 -1 26 26" fill="currentColor" />
}
