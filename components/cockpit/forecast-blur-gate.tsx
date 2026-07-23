export function ForecastBlurGate({
  plan,
  children,
}: {
  plan: 'free' | 'pro'
  children: React.ReactNode
}) {
  if (plan === 'pro') return <>{children}</>

  return (
    <div className="relative">
      <div className="blur-sm pointer-events-none select-none" aria-hidden="true">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-8 text-center shadow-lg border border-gray-200">
          <p className="text-gray-700 font-medium mb-1">
            שדרג לפרו לראות את התחזית המלאה
          </p>
          <p className="text-xs text-gray-500 mb-4">
            תחזית ל-3 חודשים, המלצות אישיות, ופירוט שבועי
          </p>
          <button className="px-6 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors">
            שדרג לפרו
          </button>
        </div>
      </div>
    </div>
  )
}
