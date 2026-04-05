import type { AuthState } from '../types'

interface AuthPanelProps {
  authState: AuthState
  email: string
  message?: string
  onEmailChange: (value: string) => void
  onLocalSignIn: () => void
  onMagicLink: () => void
  onSignOut: () => void
  supabaseEnabled: boolean
}

export function AuthPanel({
  authState,
  email,
  message,
  onEmailChange,
  onLocalSignIn,
  onMagicLink,
  onSignOut,
  supabaseEnabled,
}: AuthPanelProps) {
  return (
    <section className="panel auth-panel">
      <div className="section-intro">
        <div>
          <span className="eyebrow">Authentication</span>
          <h2>Saved alerts and premium state are account-ready</h2>
        </div>
        <span className={`inline-status ${authState.status}`}>{authState.status}</span>
      </div>

      <div className="auth-summary">
        <p>
          {message ??
            (authState.user
            ? `Signed in as ${authState.user.email} via ${authState.provider}.`
            : supabaseEnabled
              ? 'Supabase is configured. Send a magic link or use local preview sign-in.'
              : 'Supabase env vars are not configured, so auth stays in local preview mode.')}
        </p>
      </div>

      <div className="auth-controls">
        <label>
          <span>Email</span>
          <input
            type="email"
            placeholder="traveler@flighttrackerpro.app"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
          />
        </label>

        <div className="auth-actions">
          {authState.user ? (
            <button type="button" className="ghost-button" onClick={onSignOut}>
              Sign out
            </button>
          ) : (
            <>
              <button type="button" className="ghost-button" onClick={onLocalSignIn}>
                Preview sign in
              </button>
              <button
                type="button"
                className="primary-button subtle"
                onClick={onMagicLink}
                disabled={!supabaseEnabled}
              >
                Email magic link
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
