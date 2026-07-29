'use client'

import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      },
      queryParams: {
        prompt: 'select_account'
      }
    })
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Project Matchmaker</h1>
      <button onClick={handleLogin}>Sign in with Google</button>
    </div>
  )
}