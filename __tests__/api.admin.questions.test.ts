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

  it('POST creates multiple choice question with valid options', async () => {
    const mockEvent = { id: 'ev1' }
    const mockQuestion = {
      id: 'q1',
      eventId: 'ev1',
      type: 'multiple_choice',
      content: 'What is 2+2?',
      expectedAnswer: 'A',
      options: JSON.stringify({ A: '4', B: '5', C: '3', D: '6' }),
      aiThreshold: 8,
      hintEnabled: false,
      createdAt: new Date()
    }
    adminQuestionsPrisma.event.findUnique.mockResolvedValue(mockEvent)
    adminQuestionsPrisma.question.create.mockResolvedValue(mockQuestion)

    const req = {
      json: async () => ({
        eventId: 'ev1',
        type: 'multiple_choice',
        content: 'What is 2+2?',
        expectedAnswer: 'A',
        options: { A: '4', B: '5', C: '3', D: '6' },
        aiThreshold: 8,
        hintEnabled: false
      })
    }

    const res = await adminQuestionsPOST(req)

    expect(adminQuestionsPrisma.event.findUnique).toHaveBeenCalledWith({ where: { id: 'ev1' } })
    expect(adminQuestionsPrisma.question.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventId: 'ev1',
        type: 'multiple_choice',
        content: 'What is 2+2?',
        expectedAnswer: 'A',
        options: JSON.stringify({ A: '4', B: '5', C: '3', D: '6' }),
        aiThreshold: 8,
        hintEnabled: false
      })
    })
    expect(res).toEqual({ question: mockQuestion })
  })

  it('POST rejects multiple choice with invalid empty options', async () => {
    const mockEvent = { id: 'ev1' }
    adminQuestionsPrisma.event.findUnique.mockResolvedValue(mockEvent)

    const req = {
      json: async () => ({
        eventId: 'ev1',
        type: 'multiple_choice',
        content: 'What is 2+2?',
        expectedAnswer: 'A',
        options: { A: '', B: '', C: '', D: '' },
        aiThreshold: 8,
        hintEnabled: false
      })
    }

    const res = await adminQuestionsPOST(req)

    expect(res).toEqual({ error: 'Validation failed', details: expect.any(Object) })
    expect(adminQuestionsPrisma.question.create).not.toHaveBeenCalled()
  })

  it('POST rejects multiple choice with mismatched expectedAnswer', async () => {
    const mockEvent = { id: 'ev1' }
    adminQuestionsPrisma.event.findUnique.mockResolvedValue(mockEvent)

    const req = {
      json: async () => ({
        eventId: 'ev1',
        type: 'multiple_choice',
        content: 'What is 2+2?',
        expectedAnswer: 'E', // Invalid key
        options: { A: '4', B: '5', C: '3', D: '6' },
        aiThreshold: 8,
        hintEnabled: false
      })
    }

    const res = await adminQuestionsPOST(req)

    expect(res).toEqual({ error: 'Validation failed', details: expect.any(Object) })
    expect(adminQuestionsPrisma.question.create).not.toHaveBeenCalled()
  })

  it('PUT updates multiple choice question with valid options', async () => {
    const mockQuestion = {
      id: 'q1',
      eventId: 'ev1',
      type: 'multiple_choice',
      content: 'Updated question?',
      expectedAnswer: 'B',
      options: JSON.stringify({ A: '1', B: '2', C: '3', D: '4' }),
      aiThreshold: 7,
      hintEnabled: true,
      updatedAt: new Date()
    }
    adminQuestionsPrisma.question.update.mockResolvedValue(mockQuestion)

    const req = {
      json: async () => ({
        id: 'q1',
        eventId: 'ev1',
        type: 'multiple_choice',
        content: 'Updated question?',
        expectedAnswer: 'B',
        options: { A: '1', B: '2', C: '3', D: '4' },
        aiThreshold: 7,
        hintEnabled: true
      })
    }

    const res = await adminQuestionsPUT(req)

    expect(adminQuestionsPrisma.question.update).toHaveBeenCalledWith({
      where: { id: 'q1' },
      data: expect.objectContaining({
        type: 'multiple_choice',
        content: 'Updated question?',
        expectedAnswer: 'B',
        options: JSON.stringify({ A: '1', B: '2', C: '3', D: '4' }),
        aiThreshold: 7,
        hintEnabled: true
      })
    })
    expect(res).toEqual({ question: mockQuestion })
  })

  it('PUT rejects multiple choice with invalid options', async () => {
    const req = {
      json: async () => ({
        id: 'q1',
        eventId: 'ev1',
        type: 'multiple_choice',
        content: 'What is 2+2?',
        expectedAnswer: 'A',
        options: { A: '', B: '5', C: '3', D: '' }, // Invalid empty
        aiThreshold: 8,
        hintEnabled: false
      })
    }

    const res = await adminQuestionsPUT(req)

    expect(res).toEqual({ error: 'Validation failed', details: expect.any(Object) })
    expect(adminQuestionsPrisma.question.update).not.toHaveBeenCalled()
  })

  it('PUT rejects multiple choice with mismatched expectedAnswer', async () => {
    const req = {
      json: async () => ({
        id: 'q1',
        eventId: 'ev1',
        type: 'multiple_choice',
        content: 'What is 2+2?',
        expectedAnswer: 'Z', // Mismatch
        options: { A: '4', B: '5', C: '3', D: '6' },
        aiThreshold: 8,
        hintEnabled: false
      })
    }

    const res = await adminQuestionsPUT(req)

    expect(res).toEqual({ error: 'Validation failed', details: expect.any(Object) })
    expect(adminQuestionsPrisma.question.update).not.toHaveBeenCalled()
  })
})
