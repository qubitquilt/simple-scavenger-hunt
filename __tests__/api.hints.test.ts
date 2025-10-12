jest.mock('@/lib/prisma', () => ({
  prisma: {
    progress: {
      findFirst: jest.fn(),
    },
    question: {
      findFirst: jest.fn(),
    },
    answer: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
  }
}))

const { POST: hintsPOST } = require('@/app/api/hints/route')
const { prisma: hintsPrisma } = require('@/lib/prisma')

// Mock fetch for OpenRouter API
global.fetch = jest.fn()

describe('hints api', () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://fake.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake_key';
    process.env.OPENROUTER_API_KEY = 'fake_openrouter_key';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Test hint response' } }]
      })
    })
  })

  describe('authentication validation', () => {
    it('returns 401 when userId cookie is missing', async () => {
      const fakeReq = {
        cookies: { get: () => undefined },
        json: async () => ({ questionId: 'q1' })
      }
      const res = await hintsPOST(fakeReq)
      expect(res).toEqual({ error: 'User ID is required' })
    })

    it('returns 401 when userId cookie value is empty', async () => {
      const fakeReq = {
        cookies: { get: () => ({ value: '' }) },
        json: async () => ({ questionId: 'q1' })
      }
      const res = await hintsPOST(fakeReq)
      expect(res).toEqual({ error: 'User ID is required' })
    })
  })

  describe('question validation', () => {
    beforeEach(() => {
      hintsPrisma.progress.findFirst.mockResolvedValue({ id: 'p1', eventId: 'e1' })
    })

    it('returns 400 when questionId is missing', async () => {
      const fakeReq = {
        cookies: { get: () => ({ value: 'u1' }) },
        json: async () => ({})
      }
      const res = await hintsPOST(fakeReq)
      expect(res).toEqual({ error: 'questionId is required' })
    })

    it('returns 404 when progress not found', async () => {
      hintsPrisma.progress.findFirst.mockResolvedValue(null)
      const fakeReq = {
        cookies: { get: () => ({ value: 'u1' }) },
        json: async () => ({ questionId: 'q1' })
      }
      const res = await hintsPOST(fakeReq)
      expect(res).toEqual({ error: 'No progress found for user' })
    })

    it('returns 404 when question not found', async () => {
      hintsPrisma.question.findFirst.mockResolvedValue(null)
      const fakeReq = {
        cookies: { get: () => ({ value: 'u1' }) },
        json: async () => ({ questionId: 'q1' })
      }
      const res = await hintsPOST(fakeReq)
      expect(res).toEqual({ error: 'Question not found' })
    })

    it('returns 403 when hints are not enabled for question', async () => {
      hintsPrisma.question.findFirst.mockResolvedValue({
        content: 'Test question',
        expectedAnswer: 'answer',
        type: 'text',
        hintEnabled: false
      })
      const fakeReq = {
        cookies: { get: () => ({ value: 'u1' }) },
        json: async () => ({ questionId: 'q1' })
      }
      const res = await hintsPOST(fakeReq)
      expect(res).toEqual({ error: 'Hints are not enabled for this question' })
    })
  })

  describe('rate limiting logic', () => {
    beforeEach(() => {
      hintsPrisma.progress.findFirst.mockResolvedValue({ id: 'p1', eventId: 'e1' })
      hintsPrisma.question.findFirst.mockResolvedValue({
        content: 'Test question',
        expectedAnswer: 'answer',
        type: 'text',
        hintEnabled: true
      })
    })

    it('returns 429 when maximum hints reached', async () => {
      hintsPrisma.answer.findMany.mockResolvedValue([
        { submission: { hints: 2 } }
      ])
      const fakeReq = {
        cookies: { get: () => ({ value: 'u1' }) },
        json: async () => ({ questionId: 'q1' })
      }
      const res = await hintsPOST(fakeReq)
      expect(res).toEqual({ error: 'Maximum hints reached for this question' })
    })

    it('counts hints correctly from submission data', async () => {
      hintsPrisma.answer.findMany.mockResolvedValue([
        { submission: { hints: 1 } },
        { submission: 'other data' }
      ])
      hintsPrisma.answer.findFirst.mockResolvedValue(null)
      hintsPrisma.answer.create.mockResolvedValue({ id: 'a1' })

      const fakeReq = {
        cookies: { get: () => ({ value: 'u1' }) },
        json: async () => ({ questionId: 'q1' })
      }
      const res = await hintsPOST(fakeReq)

      expect(hintsPrisma.answer.create).toHaveBeenCalledWith({
        data: {
          progressId: 'p1',
          questionId: 'q1',
          submission: { hints: 2 },
          status: 'pending'
        }
      })
      expect(res.hintCount).toBe(2)
    })
  })

  describe('AI integration and response handling', () => {
    beforeEach(() => {
      hintsPrisma.progress.findFirst.mockResolvedValue({ id: 'p1', eventId: 'e1' })
      hintsPrisma.question.findFirst.mockResolvedValue({
        content: 'Test question',
        expectedAnswer: 'answer',
        type: 'text',
        hintEnabled: true
      })
      hintsPrisma.answer.findMany.mockResolvedValue([])
      hintsPrisma.answer.findFirst.mockResolvedValue(null)
      hintsPrisma.answer.create.mockResolvedValue({ id: 'a1' })
    })

    it('successfully generates and returns hint', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Helpful hint here' } }]
        })
      })

      const fakeReq = {
        cookies: { get: () => ({ value: 'u1' }) },
        json: async () => ({ questionId: 'q1' })
      }
      const res = await hintsPOST(fakeReq)

      expect(global.fetch).toHaveBeenCalledWith('https://openrouter.ai/api/v1/chat/completions', expect.objectContaining({
        method: 'POST',
        headers: {
          'Authorization': 'Bearer fake_openrouter_key',
          'Content-Type': 'application/json',
        }
      }))

      expect(res).toEqual({
        hint: 'Helpful hint here',
        hintCount: 1,
        maxHints: 2
      })
    })

    it('includes previous submissions in AI prompt', async () => {
      hintsPrisma.answer.findMany.mockResolvedValue([
        { submission: 'attempt1', aiScore: 5, status: 'incorrect' },
        { submission: 'attempt2', aiScore: 7, status: 'incorrect' }
      ])

      const fakeReq = {
        cookies: { get: () => ({ value: 'u1' }) },
        json: async () => ({ questionId: 'q1' })
      }
      await hintsPOST(fakeReq)

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][1]
      const body = JSON.parse(fetchCall.body)
      expect(body.messages[0].content).toContain('Previous submissions and their scores')
      expect(body.messages[0].content).toContain('Attempt 1: ""attempt1"" - Score: 5, Status: incorrect')
      expect(body.messages[0].content).toContain('Attempt 2: ""attempt2"" - Score: 7, Status: incorrect')
    })

    it('handles OpenRouter API errors', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'API Error'
      })

      const fakeReq = {
        cookies: { get: () => ({ value: 'u1' }) },
        json: async () => ({ questionId: 'q1' })
      }
      const res = await hintsPOST(fakeReq)
      expect(res).toEqual({ error: 'Internal server error' })
    })

    it('handles malformed AI response', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: []
        })
      })

      const fakeReq = {
        cookies: { get: () => ({ value: 'u1' }) },
        json: async () => ({ questionId: 'q1' })
      }
      const res = await hintsPOST(fakeReq)
      expect(res).toEqual({ error: 'Internal server error' })
    })
  })

  describe('database state changes', () => {
    beforeEach(() => {
      hintsPrisma.progress.findFirst.mockResolvedValue({ id: 'p1', eventId: 'e1' })
      hintsPrisma.question.findFirst.mockResolvedValue({
        content: 'Test question',
        expectedAnswer: 'answer',
        type: 'text',
        hintEnabled: true
      })
    })

    it('updates existing answer with hint count', async () => {
      hintsPrisma.answer.findMany.mockResolvedValue([])
      hintsPrisma.answer.findFirst.mockResolvedValue({
        id: 'a1',
        submission: { existing: 'data' }
      })
      hintsPrisma.answer.update.mockResolvedValue({ id: 'a1' })

      const fakeReq = {
        cookies: { get: () => ({ value: 'u1' }) },
        json: async () => ({ questionId: 'q1' })
      }
      await hintsPOST(fakeReq)

      expect(hintsPrisma.answer.update).toHaveBeenCalledWith({
        where: { id: 'a1' },
        data: { submission: { existing: 'data', hints: 1 } }
      })
    })

    it('creates new answer when none exists', async () => {
      hintsPrisma.answer.findMany.mockResolvedValue([])
      hintsPrisma.answer.findFirst.mockResolvedValue(null)
      hintsPrisma.answer.create.mockResolvedValue({ id: 'a1' })

      const fakeReq = {
        cookies: { get: () => ({ value: 'u1' }) },
        json: async () => ({ questionId: 'q1' })
      }
      await hintsPOST(fakeReq)

      expect(hintsPrisma.answer.create).toHaveBeenCalledWith({
        data: {
          progressId: 'p1',
          questionId: 'q1',
          submission: { hints: 1 },
          status: 'pending'
        }
      })
    })
  })

  describe('error responses', () => {
    it('returns 500 on unexpected errors', async () => {
      hintsPrisma.progress.findFirst.mockRejectedValue(new Error('DB error'))

      const fakeReq = {
        cookies: { get: () => ({ value: 'u1' }) },
        json: async () => ({ questionId: 'q1' })
      }
      const res = await hintsPOST(fakeReq)
      expect(res).toEqual({ error: 'Internal server error' })
    })

    it('returns 400 on invalid JSON', async () => {
      const fakeReq = {
        cookies: { get: () => ({ value: 'u1' }) },
        json: async () => { throw new Error('Invalid JSON') }
      }
      const res = await hintsPOST(fakeReq)
      expect(res).toEqual({ error: 'Internal server error' })
    })
  })
})