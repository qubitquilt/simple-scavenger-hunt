jest.mock('@/lib/prisma', () => ({
  prisma: {
    event: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn()
    }
  }
}))

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://fake.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake_key';
});

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))

const { GET: adminEventsGET, POST: adminEventsPOST, PUT: adminEventsPUT, DELETE: adminEventsDELETE } = require('@/app/api/admin/events/route')
const { prisma: adminEventsPrisma } = require('@/lib/prisma')
const { getServerSession: adminEventsGetServerSession } = require('next-auth')

describe('admin events api', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('GET returns events', async () => {
    const mockEvent = { id: '1', title: 'E', date: new Date(), createdAt: new Date() }
    adminEventsPrisma.event.findMany.mockResolvedValue([mockEvent])
    const res = await adminEventsGET()
    expect(res).toEqual({ events: [{ id: '1', title: 'E', description: '', date: expect.any(String), createdAt: expect.any(String) }] })
  })

  it('POST returns 401 when not admin', async () => {
    ;(adminEventsGetServerSession as jest.Mock).mockResolvedValue({ user: { admin: false } })
    const req = { json: async () => ({ title: 't' }) }
    const res = await adminEventsPOST(req)
    expect(res).toEqual({ error: 'Unauthorized' })
  })

  it('POST returns 400 when title missing', async () => {
    ;(adminEventsGetServerSession as jest.Mock).mockResolvedValue({ user: { admin: true } })
    const req = { json: async () => ({ title: '' }) }
    const res = await adminEventsPOST(req)
    expect(res).toEqual({ error: 'Title is required' })
  })

  it('PUT returns 400 when id missing', async () => {
    ;(adminEventsGetServerSession as jest.Mock).mockResolvedValue({ user: { admin: true } })
    const req = { json: async () => ({}) }
    const res = await adminEventsPUT(req)
    expect(res).toEqual({ error: 'ID is required' })
  })

  it('DELETE returns 400 when id missing', async () => {
    ;(adminEventsGetServerSession as jest.Mock).mockResolvedValue({ user: { admin: true } })
    const req = { json: async () => ({}) }
    const res = await adminEventsDELETE(req)
    expect(res).toEqual({ error: 'ID is required' })
  })
})
