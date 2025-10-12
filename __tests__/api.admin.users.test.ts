jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: jest.fn()
    }
  }
}))


beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://fake.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake_key';
});


const { GET: adminUsersGET } = require('@/app/api/admin/users/route')
const { prisma: adminUsersPrisma } = require('@/lib/prisma')

describe('admin users api', () => {
  it('returns 400 when no eventId', async () => {
    const req = { url: 'https://example.com/' }
    const res = await adminUsersGET(req)
    expect(res).toEqual({ error: 'eventId is required' })
  })

  it('computes metrics correctly', async () => {
    const fakeUser = {
      id: 'u1',
      firstName: 'A',
      lastName: 'B',
      createdAt: new Date(),
      progress: [{
        id: 'p1',
        eventId: 'e1',
        completed: true,
        createdAt: new Date(),
        answers: [{
          id: 'a1',
          questionId: 'q1',
          status: 'correct',
          createdAt: new Date(),
          submission: null,
          aiScore: null
        }]
      }]
    }
    adminUsersPrisma.user.findMany.mockResolvedValue([fakeUser])
    const req = { url: 'https://example.com/?eventId=e1' }
    const res = await adminUsersGET(req)
    expect(res.users.length).toBe(1)
    expect(res.metrics.totalUsers).toBe(1)
  })
})
