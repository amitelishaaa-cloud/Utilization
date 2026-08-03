import AuthForm from '@/components/auth/auth-form'
import { signInAction } from '../actions'

export default function LoginPage() {
  return (
    <>
      <h1 className="text-lg font-bold text-gray-900 mb-6">התחברות</h1>
      <AuthForm action={signInAction} mode="login" />
    </>
  )
}
