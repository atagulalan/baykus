import { TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface NeedsReviewBannerProps {
  onFill: () => void
  onDismiss: () => void
  isLoading: boolean
}

export function NeedsReviewBanner({
  onFill,
  onDismiss,
  isLoading
}: NeedsReviewBannerProps) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-3 bg-[#1a1a00] border border-yellow/20 p-4">
      <div className="flex items-center gap-2 text-yellow font-display italic text-lg">
        <TriangleAlert size={18} />
        {t('series.needsReviewTitle')}
      </div>
      <p className="text-sm text-snow/80">{t('series.needsReviewDesc')}</p>
      <div className="flex items-center gap-3 mt-1">
        <button
          type="button"
          onClick={onFill}
          disabled={isLoading}
          className="bg-yellow px-4 py-2 font-mono text-[10px] text-[#080808] uppercase tracking-widest hover:opacity-90 disabled:opacity-50"
        >
          {t('series.needsReviewFill')}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          disabled={isLoading}
          className="bg-white/5 px-4 py-2 font-mono text-[10px] text-snow uppercase tracking-widest hover:bg-white/10 disabled:opacity-50"
        >
          {t('series.needsReviewDismiss')}
        </button>
      </div>
    </div>
  )
}
