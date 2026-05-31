import { useState, useEffect, type ReactNode } from 'react'
import { Shield, Key, Loader2, ExternalLink, CheckCircle } from 'lucide-react'

interface LicenseGateProps {
  product: 'platform-picker' | 'hook-generator' | 'content-calendar'
  accentColor?: string
  children: ReactNode
}

const STORAGE_KEY = (product: string) => `aegis_license_valid_${product}`
const KEY_STORAGE  = (product: string) => `aegis_license_key_${product}`

const GUMROAD_URLS: Record<string, string> = {
  'platform-picker':  'https://gumroad.com/l/aegis-platform-picker',
  'hook-generator':   'https://gumroad.com/l/aegis-hook-generator',
  'content-calendar': 'https://gumroad.com/l/aegis-content-calendar',
}

const PRODUCT_NAMES: Record<string, string> = {
  'platform-picker':  'Platform Picker',
  'hook-generator':   'Hook Generator',
  'content-calendar': 'Content Calendar',
}

// Skip gate in local dev if env var set
const DEV_BYPASS = import.meta.env.VITE_SKIP_LICENSE === 'true'

export function LicenseGate({ product, accentColor = '#6366F1', children }: LicenseGateProps) {
  const [unlocked, setUnlocked]   = useState(false)
  const [key, setKey]             = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [success, setSuccess]     = useState(false)
  const [checking, setChecking]   = useState(true)

  // On mount: check if already validated
  useEffect(() => {
    if (DEV_BYPASS) { setUnlocked(true); setChecking(false); return }
    const stored = localStorage.getItem(STORAGE_KEY(product))
    if (stored === 'true') {
      setUnlocked(true)
    }
    setChecking(false)
  }, [product])

  async function handleValidate() {
    const trimmed = key.trim()
    if (!trimmed) { setError('Enter your license key from Gumroad.'); return }
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/verify-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ license_key: trimmed }),
      })
      const data = await res.json() as { valid: boolean; error?: string }

      if (data.valid) {
        localStorage.setItem(STORAGE_KEY(product), 'true')
        localStorage.setItem(KEY_STORAGE(product), trimmed)
        setSuccess(true)
        setTimeout(() => setUnlocked(true), 800)
      } else {
        setError(data.error ?? 'Invalid license key. Check your Gumroad receipt.')
      }
    } catch {
      setError('Could not reach the verification service. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  if (checking) return null

  if (unlocked) return <>{children}</>

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
         style={{ background: '#08090C' }}>
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}40` }}
          >
            {success
              ? <CheckCircle size={24} style={{ color: accentColor }} />
              : <Shield size={24} style={{ color: accentColor }} />
            }
          </div>
          <h1 className="text-xl font-bold mb-2" style={{ color: '#EDEAE3' }}>
            {success ? 'Activated!' : PRODUCT_NAMES[product]}
          </h1>
          <p className="text-sm" style={{ color: '#6B6E80' }}>
            {success
              ? 'Your license has been verified. Loading…'
              : 'Enter your Gumroad license key to unlock.'
            }
          </p>
        </div>

        {!success && (
          <>
            {/* Key input */}
            <div className="mb-4">
              <div className="relative">
                <Key
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: '#6B6E80' }}
                />
                <input
                  type="text"
                  value={key}
                  onChange={e => { setKey(e.target.value); setError(null) }}
                  onKeyDown={e => { if (e.key === 'Enter') handleValidate() }}
                  placeholder="XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX"
                  className="w-full pl-9 pr-4 py-3 rounded-xl text-sm font-mono outline-none transition-all"
                  style={{
                    background: '#0F1117',
                    border: `1px solid ${error ? '#EF4444' : '#1A1D27'}`,
                    color: '#EDEAE3',
                  }}
                  autoFocus
                  disabled={loading}
                />
              </div>
              {error && (
                <p className="text-xs mt-2" style={{ color: '#EF4444' }}>{error}</p>
              )}
            </div>

            {/* Validate button */}
            <button
              onClick={handleValidate}
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: accentColor, color: '#ffffff' }}
            >
              {loading
                ? <><Loader2 size={15} className="animate-spin" /> Verifying…</>
                : <><Shield size={15} /> Unlock</>
              }
            </button>

            {/* Buy link */}
            <div className="text-center mt-6 space-y-2">
              <p className="text-xs" style={{ color: '#6B6E80' }}>
                Don't have a license?
              </p>
              <a
                href={GUMROAD_URLS[product]}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-80"
                style={{ color: accentColor }}
              >
                <ExternalLink size={12} />
                Buy on Gumroad — $19
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
