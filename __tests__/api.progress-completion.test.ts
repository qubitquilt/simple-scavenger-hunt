jest.mock('@/lib/prisma', () => ({
  prisma: {
    answer: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    progress: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    question: {
      findFirst: jest.fn(),
      count: jest.fn(),
    },
    event: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

// Mock OpenRouter / AI fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

const { POST } = require('@/app/api/answers/route')
const { prisma } = require('@/lib/prisma')

describe('API progress completion logic', () => {
  const userCookie = { value: 'user-1' }

  const makeReq = (body: any) => ({
    json: async () => body,
    headers: {
      get: jest.fn(() => 'application/json'),
    },
    cookies: {
      get: jest.fn(() => userCookie),
    },
  })

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.OPENROUTER_API_KEY = 'fake_key'

    // Default question and progress used by tests
    prisma.progress.findFirst.mockResolvedValue({ id: 'p1', eventId: 'e1' })
    prisma.question.findFirst.mockResolvedValue({
      id: 'q1',
      type: 'text',
      expectedAnswer: 'expected',
      aiThreshold: 5,
      content: 'Question text'
    })

    // Default: use tx as the same mocked prisma object
    prisma.$transaction = jest.fn((fn) => fn(prisma))
  })

  it('incremental progress: submitting 1 of 3 correctly sets completed false and stats reflect 1/3', async () => {
    // Simulate AI returning a high score -> correct
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Score: 9\n\nExplanation: Good match' } }]
      })
    })

    // No existing answer
    prisma.answer.findFirst.mockResolvedValue(null)
    prisma.answer.create.mockResolvedValue({ id: 'a1' })

    // When transaction reads answers, only 1 correct recorded
    prisma.answer.findMany.mockResolvedValue([{ status: 'correct' }])

    // progress row inside tx contains questionOrder of 3
    prisma.progress.findUnique.mockResolvedValue({ id: 'p1', questionOrder: ['q1', 'q2', 'q3'], eventId: 'e1' })

    const req = makeReq({ questionId: 'q1', submission: 'user answer' })
    const res = await POST(req)

    expect(res.completed).toBe(false)
    expect(res.stats).toEqual({ correctCount: 1, totalQuestions: 3 })
    // Progress update should not have been called because not complete
    expect(prisma.progress.update).not.toHaveBeenCalled()
  })

  it('final completion: after submitting all 3 questions correctly, progress.completed becomes true', async () => {
    // Prepare three sequential submissions: simulate calling POST three times.
    // We'll simulate the third call here (assume prior two have created correct answers).

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Score: 9\n\nExplanation: Good match' } }]
      })
    })

    // No existing answer for this submission
    prisma.answer.findFirst.mockResolvedValue(null)
    // Create returns an id
    prisma.answer.create.mockResolvedValue({ id: 'a3' })

    // Transaction read returns 3 correct answers (after this insert)
    prisma.answer.findMany.mockResolvedValue([
      { status: 'correct' },
      { status: 'correct' },
      { status: 'correct' },
    ])

    prisma.progress.findUnique.mockResolvedValue({ id: 'p1', questionOrder: ['q1', 'q2', 'q3'], eventId: 'e1' })

    prisma.progress.update.mockResolvedValue({ id: 'p1', completed: true })

    const req = makeReq({ questionId: 'q3', submission: 'final answer' })
    const res = await POST(req)

    expect(res.completed).toBe(true)
    expect(res.stats).toEqual({ correctCount: 3, totalQuestions: 3 })
    expect(prisma.progress.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { completed: true }
    })
  })

  it('edge case: submitting incorrect answers should not mark completion', async () => {
    // AI returns low score -> incorrect
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Score: 2\n\nExplanation: Not a match' } }]
      })
    })

    prisma.answer.findFirst.mockResolvedValue(null)
    prisma.answer.create.mockResolvedValue({ id: 'aX' })

    // After this insert, only 0 correct answers
    prisma.answer.findMany.mockResolvedValue([{ status: 'incorrect' }])
    prisma.progress.findUnique.mockResolvedValue({ id: 'p1', questionOrder: ['q1', 'q2', 'q3'], eventId: 'e1' })

    const req = makeReq({ questionId: 'qX', submission: 'wrong answer' })
    const res = await POST(req)

    expect(res.completed).toBe(false)
    expect(res.stats).toEqual({ correctCount: 0, totalQuestions: 3 })
    expect(prisma.progress.update).not.toHaveBeenCalled()
  })

  it('edge case: duplicate submissions update existing answer and do not cause incorrect completion', async () => {
    // Simulate existing answer present (duplicate)
    prisma.answer.findFirst.mockResolvedValue({ id: 'existingA', status: 'incorrect' })
    // Update will be called on tx.answer.update; here we mock update result
    prisma.answer.update.mockResolvedValue({ id: 'existingA' })

    // AI returns a correct score now
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Score: 8\n\nExplanation: Now correct' } }]
      })
    })

    // After updating, suppose there are still only 2 correct out of 3
    prisma.answer.findMany.mockResolvedValue([{ status: 'correct' }, { status: 'correct' }])
    prisma.progress.findUnique.mockResolvedValue({ id: 'p1', questionOrder: ['q1', 'q2', 'q3'], eventId: 'e1' })

    const req = makeReq({ questionId: 'q2', submission: 'updated submission' })
    const res = await POST(req)

    expect(prisma.answer.update).toHaveBeenCalled()
    expect(res.completed).toBe(false)
    expect(res.stats).toEqual({ correctCount: 2, totalQuestions: 3 })
    expect(prisma.progress.update).not.toHaveBeenCalled()
  })
})