'use client'
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient('https://recorder.invalid', 'server-session', {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: {
    fetch: async (input, init) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
      const match = /^\/rest\/v1\/([a-z_]+)$/.exec(url.pathname)
      if (url.origin !== 'https://recorder.invalid' || !match) throw new Error('Unsupported recorder request')
      const headers = new Headers(init?.headers)
      headers.delete('authorization')
      headers.delete('apikey')
      const response = await fetch(`/api/recorder/database/${match[1]}${url.search}`, {
        ...init, headers, credentials: 'same-origin', cache: 'no-store',
      })
      if (response.status === 401 && typeof window !== 'undefined') window.location.reload()
      return response
    },
  },
})
