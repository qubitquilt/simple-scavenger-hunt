jest.mock('@/lib/supabase', () => ({
  createAdminSupabaseClient: jest.fn(() => ({
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    limit: jest.fn().mockReturnThis(),
  }))
}))

const { GET, POST, PUT, DELETE } = require('@/app/api/admin/questions/route')
const { createAdminSupabaseClient } = require('@/lib/supabase')

describe('admin questions api', () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://fake.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake_key';
  });

  it('GET returns questions filtered by eventId', async () => {
    const admin = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      // when awaited the query should resolve to our desired data
      _result: { data: [{ id: 'q1' }], error: null },
      then(resolve): any { resolve(this._result); return { catch: () => {} } },
      eq: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    }
    ;(createAdminSupabaseClient as jest.Mock).mockReturnValue(admin)
    const fakeReq = { url: 'https://example.com/?eventId=ev1' }
    const res = await GET(fakeReq)
    expect(res).toEqual({ questions: [{ id: 'q1' }] })
  })

  it('POST validates required fields', async () => {
    const req = { json: async () => ({ eventId: '', content: '', expectedAnswer: '' }) }
    const res = await POST(req)
    expect(res).toEqual({ error: 'eventId, content, and expectedAnswer are required' })
  })

  it('POST returns 404 when event not found', async () => {
    const admin = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    }
    ;(createAdminSupabaseClient as jest.Mock).mockReturnValue(admin)
    const req = { json: async () => ({ eventId: 'ev1', content: 'c', expectedAnswer: 'e' }) }
    const res = await POST(req)
    expect(res).toEqual({ error: 'Event not found' })
  })

  it('PUT requires id', async () => {
    const req = { json: async () => ({}) }
    const res = await PUT(req)
    expect(res).toEqual({ error: 'ID is required' })
  })

  it('DELETE requires id', async () => {
    const req = { json: async () => ({}) }
    const res = await DELETE(req)
    expect(res).toEqual({ error: 'ID is required' })
  })
})
