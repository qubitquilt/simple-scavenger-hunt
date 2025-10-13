import { NextRequest } from 'next/server'
import { POST } from '@/app/api/answers/route'

// Mock validation
jest.mock('@/lib/validation', () => ({
  imageUploadSchema: { safeParse: jest.fn(() => ({ success: true })) },
  bufferValidationSchema: { safeParse: jest.fn(() => ({ success: true })) },
}))

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    answer: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    progress: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    question: {
      findFirst: jest.fn(),
    },
    event: {
      findUnique: jest.fn(),
    },
  },
}))

// Mock storage
jest.mock('@/lib/storage', () => ({
  default: {
    uploadImage: jest.fn(),
    cleanupImage: jest.fn(),
  },
}))

// Mock fetch for AI
const mockFetch = jest.fn()
global.fetch = mockFetch

const mockPrisma = jest.requireMock('@/lib/prisma').prisma
const mockStorage = jest.requireMock('@/lib/storage').default

describe('POST /api/answers for image submission', () => {
  const mockReq = (body: FormData) => ({
    json: async () => ({}),
    formData: async () => body,
    headers: {
      get: jest.fn((name: string) => name === 'content-type' ? 'multipart/form-data' : null),
    },
    cookies: {
      get: jest.fn(() => ({ value: 'user1' })),
    },
  } as unknown as NextRequest)

  beforeEach(() => {
    jest.clearAllMocks()
    mockPrisma.question.findFirst.mockResolvedValue({
      id: 'q1',
      type: 'image',
      eventId: 'ev1',
      content: 'Test question',
      expectedAnswer: 'Expected image description',
      aiThreshold: 5,
      allowedFormats: ['jpg', 'png'],
      maxFileSize: 5242880,
    })
    mockPrisma.progress.findFirst.mockResolvedValue({
      id: 'p1',
      eventId: 'ev1',
    })
    mockPrisma.event.findUnique.mockResolvedValue({ slug: 'event-slug' })
    mockStorage.uploadImage.mockResolvedValue({ url: '/uploads/image.jpg' })
    mockPrisma.answer.findFirst.mockResolvedValue(null)
    mockPrisma.answer.findMany.mockResolvedValue([{ status: 'correct' }])
    mockPrisma.answer.create.mockResolvedValue({ id: 'a1' })
    mockPrisma.progress.update.mockResolvedValue({ id: 'p1', completed: true })
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{
          message: {
            content: 'Score: 8\n\nExplanation: The image matches the expected scene well.'
          }
        }]
      })
    } as Response)
  })

  it('submits image answer successfully', async () => {
    const formData = new FormData()
    const file = new File(['image data'], 'test.jpg', { type: 'image/jpeg' })
    file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024))
    Object.defineProperty(file, 'size', { value: 1024, writable: false })
    formData.append('file', file)
    formData.append('questionId', 'q1')

    const req = mockReq(formData)

    const res = await POST(req)

    expect(mockStorage.uploadImage).toHaveBeenCalled()
    expect(mockFetch).toHaveBeenCalledWith('https://openrouter.ai/api/v1/chat/completions', expect.any(Object))
    expect(mockPrisma.answer.create).toHaveBeenCalledWith(expect.objectContaining({
      data: {
        progressId: 'p1',
        questionId: 'q1',
        submission: { url: '/uploads/image.jpg' },
        aiScore: 8,
        status: 'correct',
      },
    }))
    expect(mockPrisma.progress.update).toHaveBeenCalled()
    expect(res).toEqual({
      answerId: 'a1',
      status: 'correct',
      aiScore: 8,
      explanation: 'The image matches the expected scene well.',
      completed: true,
      stats: { correctCount: 1, totalQuestions: 1 }
    })
  })

  it('returns 400 for missing file', async () => {
    const formData = new FormData()
    formData.append('questionId', 'q1')

    const req = mockReq(formData)

    const res = await POST(req)

    expect(res).toEqual({ error: 'File and questionId are required for image upload' })
    expect(mockStorage.uploadImage).not.toHaveBeenCalled()
  })

  it('returns 404 if question not found', async () => {
    const formData = new FormData()
    const file = new File(['image data'], 'test.jpg', { type: 'image/jpeg' })
    file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024))
    Object.defineProperty(file, 'size', { value: 1024, writable: false })
    formData.append('file', file)
    formData.append('questionId', 'q1')

    mockPrisma.question.findFirst.mockResolvedValue(null)

    const req = mockReq(formData)

    const res = await POST(req)

    expect(res).toEqual({ error: 'Image question not found' })
  })

  it('returns 500 if upload fails', async () => {
    const formData = new FormData()
    const file = new File(['image data'], 'test.jpg', { type: 'image/jpeg' })
    file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024))
    Object.defineProperty(file, 'size', { value: 1024, writable: false })
    formData.append('file', file)
    formData.append('questionId', 'q1')

    mockStorage.uploadImage.mockRejectedValue(new Error('Upload failed'))

    const req = mockReq(formData)

    const res = await POST(req)

    expect(res).toEqual({ error: 'Internal server error' })
  })

  it('returns 500 if AI analysis fails', async () => {
    const formData = new FormData()
    const file = new File(['image data'], 'test.jpg', { type: 'image/jpeg' })
    file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024))
    Object.defineProperty(file, 'size', { value: 1024, writable: false })
    formData.append('file', file)
    formData.append('questionId', 'q1')

    mockFetch.mockRejectedValue(new Error('AI error'))

    const req = mockReq(formData)

    const res = await POST(req)

    expect(res).toEqual({ error: 'Internal server error' })
  })

  it('returns 401 if no user session', async () => {
    const formData = new FormData()
    const file = new File(['image data'], 'test.jpg', { type: 'image/jpeg' })
    file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024))
    Object.defineProperty(file, 'size', { value: 1024, writable: false })
    formData.append('file', file)
    formData.append('questionId', 'q1')

    const req = mockReq(formData)
    req.cookies.get.mockReturnValueOnce(undefined)

    const res = await POST(req)

    expect(res).toEqual({ error: 'User ID is required' })
  })
})