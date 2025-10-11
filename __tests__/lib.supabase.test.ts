import { createAdminSupabaseClient, supabase } from '@/lib/supabase'

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn((url: string, key: string) => ({ url, key }))
}))

describe('supabase clients', () => {
  const OLD_ENV = process.env
  beforeEach(() => {
    process.env = { ...OLD_ENV }
    jest.resetModules()
  })

  afterEach(() => {
    process.env = OLD_ENV
  })

  it('exports supabase client using public env vars', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.com'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon'
    // re-import to apply env
    const mod = require('@/lib/supabase')
    expect(mod.supabase.url).toBe('https://example.com')
    expect(mod.supabase.key).toBe('anon')
  })

  it('createAdminSupabaseClient throws when missing env', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = ''
    process.env.SUPABASE_SERVICE_ROLE_KEY = ''
    const { createAdminSupabaseClient } = require('@/lib/supabase')
    expect(() => createAdminSupabaseClient()).toThrow()
  })

  it('createAdminSupabaseClient returns client when env present', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.com'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service'
    const { createAdminSupabaseClient } = require('@/lib/supabase')
    const client = createAdminSupabaseClient()
    expect(client.url).toBe('https://example.com')
    expect(client.key).toBe('service')
  })
})
