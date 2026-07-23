import type { RecommendationResult } from '@/lib/calculations/types'

const COLOR_STYLES: Record<RecommendationResult['color'], string> = {
  red:      'border-red-200 bg-red-50 text-red-800',
  dark_red: 'border-red-300 bg-red-100 text-red-900',
  orange:   'border-orange-200 bg-orange-50 text-orange-800',
  yellow:   'border-yellow-200 bg-yellow-50 text-yellow-800',
  green:    'border-green-200 bg-green-50 text-green-800',
  blue:     'border-blue-200 bg-blue-50 text-blue-800',
}

export function RecommendationBlock({
  recommendation,
}: {
  recommendation: RecommendationResult
}) {
  return (
    <div className={`border rounded-xl p-4 mt-4 ${COLOR_STYLES[recommendation.color]}`}>
      <p className="text-sm">{recommendation.text}</p>
    </div>
  )
}
