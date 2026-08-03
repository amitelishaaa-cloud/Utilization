export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-xl font-bold text-gray-900">Utilization</p>
          <p className="text-sm text-gray-500 mt-0.5">ניהול ניצולת</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6">{children}</div>
      </div>
    </div>
  )
}
