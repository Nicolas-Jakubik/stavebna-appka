'use client'

import { createClient } from '@supabase/supabase-js'

// Keep the query API used by admin screens, but send every request to our
// authenticated server endpoint. This placeholder is never a database key.
export const supabase = createClient('https://admin.invalid', 'server-session', {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: {
    fetch: async (input, init) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
      const match = /^\/rest\/v1\/([a-z_]+)$/.exec(url.pathname)
      if (url.origin !== 'https://admin.invalid' || !match) {
        throw new Error('Unsupported admin database request')
      }
      const headers = new Headers(init?.headers)
      headers.delete('authorization')
      headers.delete('apikey')
      const response = await fetch(`/api/admin/database/${match[1]}${url.search}`, {
        ...init, headers, credentials: 'same-origin', cache: 'no-store',
      })
      if (response.status === 401 && typeof window !== 'undefined') {
        window.location.assign(`/admin-prihlasenie?next=${encodeURIComponent(window.location.pathname + window.location.search)}`)
      }
      return response
    },
  },
})
