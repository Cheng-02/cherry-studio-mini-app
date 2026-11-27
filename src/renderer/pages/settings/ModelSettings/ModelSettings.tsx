import { ArrowRight, MessageSquareMore } from 'lucide-react'
import type { FC, ReactNode, Ref } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { loggerService } from '@logger'
import { DefaultModelSelector } from '@renderer/components/DefaultModelSelector'
import {
  SettingContainer,
  SettingDivider,
  SettingGroup,
  SettingRow,
  SettingRowTitle,
  SettingsContentColumn,
  SettingTitle
} from '@renderer/components/SettingsPrimitives'
import { HelpTooltip } from '@cherrystudio/ui'
import { useDefaultModel } from '@renderer/hooks/useModel'
import { useProviders } from '@renderer/hooks/useProvider'
import { useTheme } from '@renderer/hooks/useTheme'
import { useTimer } from '@renderer/hooks/useTimer'
import { settingsControlClasses } from '@renderer/pages/settings/settingsStyles'
import { toast } from '@renderer/services/toast'
import { scrollIntoView } from '@renderer/utils/dom'
import { cn } from '@renderer/utils/style'
import type { Model } from '@shared/data/types/model'
import { isNonChatModel } from '@shared/utils/model'

const logger = loggerService.withContext('ModelSettings')

interface ModelSettingsProps {
  showSettingsButton?: boolean
  showDescription?: boolean
  showDividers?: boolean
  /** Kept for callers (mini-app AI settings) that only care about the default model. */
  showPaintingModel?: boolean
  modelFilter?: (model: Model) => boolean
  autoFillEmptyModels?: boolean
  onDefaultModelSelected?: (model: Model) => void | Promise<void>
  compact?: boolean
  focus?: 'default'
  className?: string
}

interface ModelSettingRowProps {
  icon: ReactNode
  title: ReactNode
  description?: ReactNode
  compact?: boolean
  inlineWhenCompact?: boolean
  children: ReactNode
  rowRef?: Ref<HTMLDivElement>
  showFocusGuide?: boolean
  /** Search anchor id; only passed by the settings-page (non-compact) mount */
  id?: string
}

const ModelSettingRow: FC<ModelSettingRowProps> = ({
  icon,
  title,
  description,
  compact,
  inlineWhenCompact,
  children,
  rowRef,
  showFocusGuide,
  id
}) => (
  <div ref={rowRef} id={id} className={id ? 'scroll-mt-6' : undefined}>
    <SettingRow
      className={cn(
        compact
          ? inlineWhenCompact
            ? 'items-center gap-3 py-1'
            : 'flex-col items-stretch gap-3 py-1'
          : 'items-center gap-6 py-1.5'
      )}>
      <div className="min-w-0 flex-1">
        <SettingRowTitle className="gap-2">
          {icon}
          {title}
          {description && <HelpTooltip content={description} />}
        </SettingRowTitle>
      </div>
      <div
        className={cn(
          'relative flex items-center gap-2',
          compact ? (inlineWhenCompact ? 'shrink-0' : 'w-full') : settingsControlClasses.model
        )}>
        {showFocusGuide && (
          <span
            aria-hidden="true"
            data-testid="model-settings-focus-guide"
            className="animation-provider-model-pull-guide motion-reduce:-translate-y-1/2 motion-reduce:!animate-none pointer-events-none absolute top-1/2 right-full z-10 mr-1 flex h-4 w-5 items-center justify-end text-muted-foreground">
            <ArrowRight className="size-4" strokeWidth={2.5} />
          </span>
        )}
        {children}
      </div>
    </SettingRow>
  </div>
)

/**
 * Mini-app-only build: the only model slot that survives is the default chat
 * model used by the mini-app `ai` capability. Quick assistant, translate and
 * painting model slots were removed with their features.
 */
const ModelSettings: FC<ModelSettingsProps> = ({
  showDescription = true,
  showDividers = true,
  modelFilter,
  autoFillEmptyModels = false,
  onDefaultModelSelected,
  compact = false,
  focus,
  className
}) => {
  const { defaultModel, setDefaultModel } = useDefaultModel()
  const { providers } = useProviders({ enabled: true })
  const { theme } = useTheme()
  const { t } = useTranslation()
  const defaultRowRef = useRef<HTMLDivElement | null>(null)
  const [showFocusGuide, setShowFocusGuide] = useState(false)
  const { setTimeoutTimer } = useTimer()

  const chatModelFilter = useCallback(
    (model: Model) => !isNonChatModel(model) && (modelFilter?.(model) ?? true),
    [modelFilter]
  )
  const selectableDefaultModel = defaultModel && chatModelFilter(defaultModel) ? defaultModel : undefined
  const shouldAutoFillEmptyModels = autoFillEmptyModels && !selectableDefaultModel

  const onSelectDefault = useCallback(
    (selected: Model | undefined) => {
      if (!selected) return

      const updatePromise = shouldAutoFillEmptyModels
        ? setDefaultModel(selected, { forceCascade: true })
        : setDefaultModel(selected)
      void updatePromise
        .then(() => onDefaultModelSelected?.(selected))
        .catch((error) => {
          logger.error('Failed to handle default model selection', { modelId: selected.id, error })
          toast.error(t('settings.models.manage.operation_failed'))
        })
    },
    [onDefaultModelSelected, setDefaultModel, shouldAutoFillEmptyModels, t]
  )

  useEffect(() => {
    if (compact || !focus) return

    const target = defaultRowRef.current
    if (!target) return

    const behavior = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    scrollIntoView(target, { behavior, block: 'center', inline: 'nearest' })
    setShowFocusGuide(true)
    setTimeoutTimer('model-settings-focus-guide', () => setShowFocusGuide(false), 1200)
  }, [compact, focus, setTimeoutTimer])

  const groupStyle = compact ? { padding: 0, border: 'none', background: 'transparent' } : undefined

  const ContainerComponent = compact ? SettingContainer : SettingsContentColumn
  const containerProps = compact ? { style: { padding: 0, background: 'transparent' } } : {}

  return (
    <div className={cn('relative flex min-h-0 flex-1', className)}>
      <ContainerComponent theme={theme} {...containerProps}>
        <SettingGroup theme={theme} style={groupStyle} className={compact ? 'space-y-3' : undefined}>
          {!compact && (
            <>
              <SettingTitle>{t('settings.model')}</SettingTitle>
              <SettingDivider />
            </>
          )}
          <ModelSettingRow
            compact={compact}
            id={compact ? undefined : 'setting-model-default-assistant-model'}
            rowRef={defaultRowRef}
            showFocusGuide={focus === 'default' && showFocusGuide}
            icon={<MessageSquareMore size={16} className="lucide-custom shrink-0 text-foreground" />}
            title={t('settings.models.default_assistant_model')}
            description={showDescription ? t('settings.models.default_assistant_model_description') : undefined}>
            <DefaultModelSelector
              model={selectableDefaultModel}
              providers={providers}
              filter={chatModelFilter}
              showSubscriptionOffers={!modelFilter}
              compact={compact}
              onSelect={onSelectDefault}
              placeholder={t('settings.models.empty')}
            />
          </ModelSettingRow>
          {showDividers && !compact && <SettingDivider />}
        </SettingGroup>
      </ContainerComponent>
    </div>
  )
}

export default ModelSettings
