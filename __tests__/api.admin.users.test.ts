jest.mock('@/lib/supabase', () => ({
  createAdminSupabaseClient: jest.fn(() => ({
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
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
    admin.from.mockImplementationOnce(() => ({ select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), order: jest.fn().mockResolvedValue({ data: [fakeUser], error: null }) }))
    const req = { url: 'https://example.com/?eventId=e1' }
    const res = await GET(req)
    expect(res.users.length).toBe(1)
    expect(res.metrics.totalUsers).toBe(1)
  })
})
