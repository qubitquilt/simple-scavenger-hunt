jest.mock('@/lib/prisma', () => ({
  prisma: {
    event: {
      findMany: jest.fn().mockResolvedValue([{ id: '1', title: 'E1' }]),
      findUnique: jest.fn()
    }
  }
}))

describe('GET /api/events', () => {
  it('returns events when supabase returns data', async () => {
    const mod = require('@/app/api/events/route')
    const request = { url: 'http://localhost/api/events' }
    const res = await mod.GET(request)
    expect(res).toEqual({ events: [{ id: '1', title: 'E1' }] })
  })

  it('returns error when prisma throws error', async () => {
    const prisma = require('@/lib/prisma')
    prisma.prisma.event.findMany.mockRejectedValue(new Error('boom'))
    const mod = require('@/app/api/events/route')
    const request = { url: 'http://localhost/api/events' }
    const res = await mod.GET(request)
    expect(res).toEqual({ error: 'Internal server error' })
  })
})
