jest.mock('@/lib/supabase', () => ({
  createAdminSupabaseClient: jest.fn(() => ({
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null })
  }))
}))

const { POST } = require('@/app/api/register/route')

describe('POST /api/register', () => {
  it('returns 400 when missing names', async () => {
    const req = { json: async () => ({ firstName: '', lastName: '' }) }
    const res = await POST(req)
    expect(res).toEqual({ error: 'firstName and lastName are required' })
  })

  it('returns 404 when no events found', async () => {
    const admin = require('@/lib/supabase').createAdminSupabaseClient()
    admin.from.mockImplementationOnce(() => ({ select: jest.fn().mockReturnThis(), order: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue({ data: [], error: null }) }))
    const req = { json: async () => ({ firstName: 'A', lastName: 'B' }) }
    const res = await POST(req)
    expect(res).toEqual({ error: 'No events found' })
  })
})
