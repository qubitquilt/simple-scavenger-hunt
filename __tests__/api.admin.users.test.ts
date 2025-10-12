jest.mock('@/lib/supabase', () => ({
  createAdminSupabaseClient: jest.fn(() => ({
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),


beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://fake.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake_key';
});


    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    limit: jest.fn().mockReturnThis(),
  }))
}))

const { GET } = require('@/app/api/admin/users/route')

describe('admin users api', () => {
  it('returns 400 when no eventId', async () => {
    const req = { url: 'https://example.com/' }
    const res = await GET(req)
    expect(res).toEqual({ error: 'eventId is required' })
  })

  it('computes metrics correctly', async () => {
    const admin = require('@/lib/supabase').createAdminSupabaseClient()
    const fakeUser = {
      id: 'u1',
      first_name: 'A',
      last_name: 'B',
      progress: [{ id: 'p1', event_id: 'e1', completed: true, created_at: new Date().toISOString(), answers: [{ id: 'a1', question_id: 'q1', status: 'correct', created_at: new Date().toISOString() }] }]
    }
    const adminClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      // when awaited, resolve to our fake user
      _result: { data: [fakeUser], error: null },
      then(resolve): any { resolve(this._result); return { catch: () => {} } },
    }
    ;(require('@/lib/supabase').createAdminSupabaseClient as jest.Mock).mockReturnValue(adminClient)
    const req = { url: 'https://example.com/?eventId=e1' }
    const res = await GET(req)
    expect(res.users.length).toBe(1)
    expect(res.metrics.totalUsers).toBe(1)
  })
})
