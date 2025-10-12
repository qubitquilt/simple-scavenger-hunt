jest.mock('@/lib/prisma', () => ({
  prisma: {
    question: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    event: {
      findUnique: jest.fn()
    }
  }
}))

const { GET: adminQuestionsGET, POST: adminQuestionsPOST, PUT: adminQuestionsPUT, DELETE: adminQuestionsDELETE } = require('@/app/api/admin/questions/route')
const { prisma: adminQuestionsPrisma } = require('@/lib/prisma')

describe('admin questions api', () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://fake.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake_key';
  });

  it('GET returns questions filtered by eventId', async () => {
    const mockQuestion = { id: 'q1', eventId: 'ev1', type: 'text', content: 'c', expectedAnswer: 'e', aiThreshold: 8, createdAt: new Date() }
    adminQuestionsPrisma.question.findMany.mockResolvedValue([mockQuestion])
    const fakeReq = { url: 'https://example.com/?eventId=ev1' }
    const res = await adminQuestionsGET(fakeReq)
    expect(res).toEqual({ questions: [{ id: 'q1', eventId: 'ev1', type: 'text', content: 'c', expectedAnswer: 'e', aiThreshold: 8, options: undefined, createdAt: expect.any(String) }] })
  })

  it('POST validates required fields', async () => {
    const req = { json: async () => ({ eventId: '', content: '', expectedAnswer: '' }) }
    const res = await adminQuestionsPOST(req)
    expect(res).toEqual({ error: 'eventId, content, and expectedAnswer are required' })
  })

  it('POST returns 404 when event not found', async () => {
    adminQuestionsPrisma.event.findUnique.mockResolvedValue(null)
    const req = { json: async () => ({ eventId: 'ev1', content: 'c', expectedAnswer: 'e' }) }
    const res = await adminQuestionsPOST(req)
    expect(res).toEqual({ error: 'Event not found' })
  })

  it('PUT requires id', async () => {
    const req = { json: async () => ({}) }
    const res = await adminQuestionsPUT(req)
    expect(res).toEqual({ error: 'ID is required' })
  })

  it('DELETE requires id', async () => {
    const req = { json: async () => ({}) }
    const res = await adminQuestionsDELETE(req)
    expect(res).toEqual({ error: 'ID is required' })
  })
})
