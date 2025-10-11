jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn(() => ({ select: jest.fn().mockResolvedValue({ data: [{ id: '1', title: 'E1' }], error: null }) })) } }))

describe('GET /api/events', () => {
  it('returns events when supabase returns data', async () => {
    const mod = require('@/app/api/events/route')
    const res = await mod.GET()
    expect(res).toEqual({ events: [{ id: '1', title: 'E1' }] })
  })

  it('returns error when supabase returns error', async () => {
    const sup = require('@/lib/supabase')
    sup.supabase.from.mockImplementation(() => ({ select: jest.fn().mockResolvedValue({ data: null, error: { message: 'boom' } }) }))
    const mod = require('@/app/api/events/route')
    const res = await mod.GET()
    expect(res).toEqual({ error: 'boom' })
  })
})
