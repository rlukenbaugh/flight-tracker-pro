import { createClient, type Session } from '@supabase/supabase-js'
import type { AuthState } from '../types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

export function getAuthStateFromSession(session: Session | null): AuthState {
  if (!session?.user?.email) {
    return {
      status: 'guest',
      user: null,
      provider: supabase ? 'supabase' : 'local',
    }
  }

  return {
    status: 'authenticated',
    provider: 'supabase',
    user: {
      id: session.user.id,
      email: session.user.email,
    },
  }
}
