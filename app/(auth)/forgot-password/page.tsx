import Link from 'next/link'

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-lg font-bold text-gray-900 mb-3">איפוס סיסמה</h1>
      <p className="text-sm text-gray-600 mb-6">
        איפוס סיסמה עצמאי עוד לא זמין. לאיפוס, פנה למנהל המערכת.
      </p>
      <Link
        href="/login"
        className="inline-block px-5 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
      >
        חזרה להתחברות
      </Link>
    </>
  )
}
