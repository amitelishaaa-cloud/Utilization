import AuthForm from '@/components/auth/auth-form'
import { signUpAction } from '../actions'

export default function SignupPage() {
  return (
    <>
      <h1 className="text-lg font-bold text-gray-900 mb-6">יצירת חשבון</h1>
      <AuthForm action={signUpAction} mode="signup" />
    </>
  )
}
