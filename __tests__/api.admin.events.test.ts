jest.mock('@/lib/supabase', () => ({
  createAdminSupabaseClient: jest.fn(() => ({
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    limit: jest.fn().mockReturnThis(),
  }))
}))

jest.mock('next-auth/react', () => ({ getServerSession: jest.fn() }))

const { GET, POST, PUT, DELETE } = require('@/app/api/admin/events/route')
const { createAdminSupabaseClient } = require('@/lib/supabase')
const { getServerSession } = require('next-auth/react')

describe('admin events api', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('GET returns events', async () => {
    const admin = createAdminSupabaseClient()
    admin.from.mockImplementationOnce(() => ({ select: jest.fn().mockResolvedValue({ data: [{ id: '1', title: 'E' }], error: null }) }))
    const res = await GET()
    expect(res).toEqual({ events: [{ id: '1', title: 'E' }] })
  })

  it('POST returns 401 when not admin', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { admin: false } })
    const req = { json: async () => ({ title: 't' }) }
    const res = await POST(req)
    expect(res).toEqual({ error: 'Unauthorized' })
  })

  it('POST returns 400 when title missing', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { admin: true } })
    const req = { json: async () => ({ title: '' }) }
    const res = await POST(req)
    expect(res).toEqual({ error: 'Title is required' })
  })

  it('PUT returns 400 when id missing', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { admin: true } })
    const req = { json: async () => ({}) }
    const res = await PUT(req)
    expect(res).toEqual({ error: 'ID is required' })
  })

  it('DELETE returns 400 when id missing', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { admin: true } })
    const req = { json: async () => ({}) }
    const res = await DELETE(req)
    expect(res).toEqual({ error: 'ID is required' })
  })
})
